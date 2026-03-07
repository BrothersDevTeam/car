import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  ElementRef,
  inject,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ToastrService } from 'ngx-toastr';

import { PrimaryInputComponent } from '@components/primary-input/primary-input.component';
import { PrimarySelectComponent } from '@components/primary-select/primary-select.component';
import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';

import { AddressService } from '@services/address.service';
import { CepService } from '@services/cep.service';
import { FormDraftService, FormDraft } from '@services/form-draft.service';
import { ActionsService } from '@services/actions.service';
import { Observable, of, Subscription } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import {
  SaveDraftDialogComponent,
  SaveDraftDialogResult,
} from '@components/dialogs/save-draft-dialog/save-draft-dialog.component';
import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';

import {
  Address,
  CreateAddress,
  UpdateAddress,
  ViaCepResponse,
} from '@interfaces/address';
import {
  AddressType,
  getAddressTypeOptions,
  BRAZILIAN_STATES,
  BrazilianState,
} from '../../../enums/addressTypes';

@Component({
  selector: 'app-address-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatSelectModule,
    MatFormFieldModule,
    PrimaryInputComponent,
    PrimarySelectComponent,
    WrapperCardComponent,
  ],
  templateUrl: './address-form.component.html',
  styleUrl: './address-form.component.scss',
})
export class AddressFormComponent
  implements OnInit, OnChanges, CanComponentDeactivate
{
  @Input() ownerId!: string;
  @Input() ownerType: 'person' | 'store' = 'person';
  @Input() address: Address | null = null;
  @Input() initialDraftId: string | null = null;
  @Output() formSubmitted = new EventEmitter<void>();
  @Output() formCancelled = new EventEmitter<void>();
  @Output() formChanged = new EventEmitter<boolean>();

  submitted = false;
  loadingCep = false;
  private subscriptions = new Subscription();

  @ViewChild('submitButton', { static: false, read: ElementRef })
  submitButton!: ElementRef<HTMLButtonElement>;

  addressTypeOptions = getAddressTypeOptions();
  stateOptions = BRAZILIAN_STATES.map((uf: BrazilianState) => ({
    value: uf,
    label: uf,
  }));

  form!: FormGroup;

  /**
   * Armazena o valor inicial do formulário para comparação
   * Usado para detectar se houve mudanças não salvas
   */
  private initialFormValue: string = '';

  /**
   * Flag que indica se o formulário está sendo salvo
   * Evita verificação de mudanças durante salvamento
   */
  protected isSaving = false;

  /**
   * Define os campos obrigatórios do formulário
   * Usado para verificar se pode salvar completo
   */
  private readonly REQUIRED_FIELDS = [
    'cep',
    'street',
    'neighborhood',
    'city',
    'state',
  ];

  /**
   * Tipo do formulário para identificação no localStorage
   */
  private readonly FORM_TYPE = 'endereco';

  /**
   * Lista de rascunhos disponíveis para este tipo de formulário
   */
  protected availableDrafts: FormDraft[] = [];

  /**
   * ID do rascunho selecionado no combobox
   */
  protected selectedDraftId: string | null = null;

  readonly dialog = inject(MatDialog);

  constructor(
    private fb: FormBuilder,
    private addressService: AddressService,
    private cepService: CepService,
    private toastr: ToastrService,
    private formDraftService: FormDraftService,
    private actionsService: ActionsService
  ) {
    this.form = this.fb.group({
      addressType: [AddressType.RESIDENCIAL, Validators.required],
      cep: [
        '',
        [Validators.required, Validators.minLength(8), Validators.maxLength(9)],
      ],
      street: ['', [Validators.required, Validators.maxLength(100)]],
      number: ['', Validators.maxLength(10)],
      complement: ['', Validators.maxLength(100)],
      neighborhood: ['', [Validators.required, Validators.maxLength(100)]],
      city: ['', [Validators.required, Validators.maxLength(100)]],
      state: [
        '',
        [Validators.required, Validators.minLength(2), Validators.maxLength(2)],
      ],
      country: ['Brasil'],
      mainAddress: [false],
      active: [true, Validators.required],
    });
  }

  ngOnInit() {
    console.log('📋 ngOnInit - address recebido:', this.address);
    this.loadFormData();

    if (!this.isEditMode && this.ownerId) {
      const request$ =
        this.ownerType === 'store'
          ? this.addressService.getByStoreId(this.ownerId)
          : this.addressService.getByPersonId(this.ownerId);

      request$.subscribe({
        next: (addresses) => {
          if (!addresses || addresses.length === 0) {
            console.log(
              '🏁 Primeiro endereço identificado! Marcando como principal.'
            );
            this.form.patchValue({ mainAddress: true });
          }
        },
        error: (err) => console.error('Erro ao verificar endereços:', err),
      });
    }

    // Carrega rascunhos disponíveis
    this.loadAvailableDrafts();

    if (this.initialDraftId) {
      this.selectedDraftId = this.initialDraftId;
    }

    // Monitora mudanças no formulário
    this.subscriptions.add(
      this.form.valueChanges.subscribe(() => {
        const isDirty = this.form.dirty;
        this.actionsService.hasFormChanges.set(isDirty);
        this.formChanged.emit(isDirty);
      })
    );

    // Inscreve para atualizar lista quando rascunhos mudarem
    this.subscriptions.add(
      this.formDraftService.draftsChanges.subscribe(() => {
        this.loadAvailableDrafts();
      })
    );

    // Captura valor inicial após tudo estar carregado
    setTimeout(() => {
      this.captureInitialFormValue();
    }, 500);
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('🔄 ngOnChanges chamado:', changes);

    if (changes['address']) {
      console.log('📝 Mudança no address detectada:');
      console.log('  - Valor anterior:', changes['address'].previousValue);
      console.log('  - Valor atual:', changes['address'].currentValue);
      console.log('  - Primeira mudança?', changes['address'].firstChange);

      // Carrega dados sempre que o address mudar (incluindo primeira vez)
      if (this.address) {
        this.loadFormData();
      }
    }
  }

  private loadFormData() {
    if (!this.address) {
      console.log('⚠️ Nenhum endereço para carregar');
      return;
    }

    console.log('✅ Carregando dados no formulário:', this.address);

    const formData = {
      addressType: this.address.addressType,
      cep: this.addressService.formatCep(this.address.cep),
      street: this.address.street,
      number: this.address.number || '',
      complement: this.address.complement || '',
      neighborhood: this.address.neighborhood,
      city: this.address.city,
      state: this.address.state,
      country: this.address.country || 'Brasil',
      mainAddress: this.address.mainAddress || false,
      active: this.address.active,
    };

    console.log('📦 Dados para patchValue:', formData);

    this.form.patchValue(formData);

    // When loading data (including drafts), we consider this the new "clean" state
    setTimeout(() => {
      this.captureInitialFormValue();
      this.form.markAsPristine();
      this.actionsService.hasFormChanges.set(false);
    }, 100);

    console.log('✅ Formulário após patchValue:', this.form.value);
  }

  get isEditMode(): boolean {
    return !!this.address?.addressId;
  }

  onCepBlur() {
    const cep = this.form.get('cep')?.value;
    console.log('🔍 onCepBlur chamado - CEP digitado:', cep);

    if (!cep || cep.length < 8) {
      console.log('❌ CEP muito curto:', cep);
      return;
    }

    const cleanCep = this.addressService.cleanCep(cep);
    console.log('🧹 CEP limpo:', cleanCep);

    if (!this.addressService.isValidCep(cleanCep)) {
      console.log('❌ CEP inválido');
      this.toastr.error('CEP inválido');
      return;
    }

    console.log('✅ CEP válido - Iniciando busca...');
    this.loadingCep = true;

    this.cepService.getAddressByCep(cleanCep).subscribe({
      next: (data: ViaCepResponse) => {
        console.log('📦 Resposta do ViaCEP:', data);

        if (data.erro) {
          console.log('❌ CEP não encontrado no ViaCEP');
          this.toastr.error('CEP não encontrado');
          this.loadingCep = false;
          return;
        }

        console.log('✅ Preenchendo formulário com dados do ViaCEP');
        this.form.patchValue({
          street: data.logradouro || '',
          complement: data.complemento || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || '',
        });

        this.toastr.success('Endereço preenchido automaticamente');
        this.loadingCep = false;
      },
      error: (err) => {
        console.error('❌ Erro ao buscar CEP:', err);
        this.toastr.error('Erro ao buscar CEP');
        this.loadingCep = false;
      },
    });
  }

  onSubmit() {
    this.saveForm(false).subscribe();
  }

  /**
   * Implementação da interface CanComponentDeactivate
   * Verifica se há mudanças não salvas comparando com valor inicial
   */
  hasUnsavedChanges(): boolean {
    if (this.isSaving) {
      return false;
    }

    if (this.form.pristine) {
      return false;
    }

    if (!this.initialFormValue) {
      return false;
    }

    const currentValue = JSON.stringify(this.form.value);
    const hasChanges = currentValue !== this.initialFormValue;

    return hasChanges;
  }

  /**
   * Implementação da interface CanComponentDeactivate
   * Verifica se todos os campos obrigatórios estão preenchidos
   */
  canSaveForm(): boolean {
    if (this.form.valid) {
      return true;
    }

    const canSave = this.REQUIRED_FIELDS.every((field) => {
      const control = this.form.get(field);
      const value = control?.value;
      return value && value.toString().trim() !== '';
    });

    return canSave;
  }

  /**
   * Implementação da interface CanComponentDeactivate
   * Salva o formulário no backend
   */
  saveForm(isDraft: boolean): Observable<boolean> {
    console.log('[saveForm] Salvando endereço. IsDraft:', isDraft);

    this.isSaving = true;

    if (isDraft) {
      this.saveLocalDraft();
      this.isSaving = false;
      return of(true);
    }

    this.submitted = true;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.error('Preencha os campos obrigatórios corretamente');
      this.isSaving = false;
      return of(false);
    }

    return new Observable((observer) => {
      const formValue = this.form.value;
      const cepClean = this.addressService.cleanCep(formValue.cep || '');

      if (this.isEditMode) {
        const updateData: UpdateAddress = {
          addressType: formValue.addressType,
          cep: cepClean,
          street: formValue.street,
          number: formValue.number || undefined,
          complement: formValue.complement || undefined,
          neighborhood: formValue.neighborhood,
          city: formValue.city,
          state: formValue.state,
          country: formValue.country || 'Brasil',
          mainAddress: formValue.mainAddress || false,
          active: formValue.active ?? true,
        };

        this.addressService
          .update(this.address!.addressId!, updateData)
          .subscribe({
            next: () => {
              this.toastr.success('Endereço atualizado com sucesso');

              // Remove rascunho se houver
              const entityId = `addr_${this.address!.addressId}`;
              this.formDraftService.removeDraft(this.FORM_TYPE, entityId);

              this.isSaving = false;
              this.formSubmitted.emit();
              this.resetForm();
              observer.next(true);
              observer.complete();
            },
            error: (err) => {
              console.error('Erro ao atualizar:', err);
              this.toastr.error('Erro ao atualizar endereço');
              this.isSaving = false;
              observer.next(false);
              observer.complete();
            },
          });
      } else {
        const newAddress: CreateAddress = {
          personId: this.ownerType === 'person' ? this.ownerId : undefined,
          storeId: this.ownerType === 'store' ? this.ownerId : undefined,
          addressType: formValue.addressType,
          cep: cepClean,
          street: formValue.street,
          number: formValue.number || undefined,
          complement: formValue.complement || undefined,
          neighborhood: formValue.neighborhood,
          city: formValue.city,
          state: formValue.state,
          country: formValue.country || 'Brasil',
          mainAddress: formValue.mainAddress || false,
          active: formValue.active ?? true,
        };

        const draftIdToDelete = this.selectedDraftId;

        this.addressService.create(newAddress).subscribe({
          next: () => {
            this.toastr.success('Endereço cadastrado com sucesso');

            if (draftIdToDelete) {
              this.formDraftService.removeDraftById(draftIdToDelete);
            }

            this.isSaving = false;
            this.formSubmitted.emit();
            this.resetForm();
            observer.next(true);
            observer.complete();
          },
          error: (err) => {
            console.error('Erro ao criar:', err);
            this.toastr.error('Erro ao cadastrar endereço');
            this.isSaving = false;
            observer.next(false);
            observer.complete();
          },
        });
      }
    });
  }

  /**
   * Implementação da interface CanComponentDeactivate
   * Salva rascunho local no localStorage
   */
  saveLocalDraft(
    silent: boolean = false,
    draftName?: string,
    existingDraftId?: string,
    closeAfterSave: boolean = true
  ): void {
    const addressId = this.address?.addressId;

    let effectiveEntityId: string | number | undefined = addressId
      ? `addr_${addressId}`
      : undefined;

    if (!effectiveEntityId && existingDraftId) {
      const prefix = `${this.FORM_TYPE}_`;
      if (existingDraftId.startsWith(prefix)) {
        effectiveEntityId = existingDraftId.replace(prefix, '') as any;
      }
    }

    // Prepara os dados do rascunho incluindo ID de edição se aplicável
    const draftData = {
      ...this.form.value,
      _editingId: this.address?.addressId, // Preserva o ID se estiver editando
      ownerId: this.ownerId, // Include ownerId so PersonComponent can identify the owner
    };

    const draftId = this.formDraftService.saveDraft(
      this.FORM_TYPE,
      draftData,
      effectiveEntityId,
      draftName || `Endereço ${this.form.value.street || ''}`
    );

    // SEMPRE atualiza o ID do rascunho selecionado
    this.selectedDraftId = draftId;
    console.log('[saveLocalDraft] selectedDraftId atualizado para:', draftId);

    if (!silent) {
      this.toastr.info('Rascunho de endereço salvo localmente');
    }

    if (!closeAfterSave) {
      this.form.markAsPristine();
      this.actionsService.hasFormChanges.set(false);
      setTimeout(() => this.captureInitialFormValue(), 100);
    }

    if (closeAfterSave) {
      this.formSubmitted.emit();
    }
  }

  /**
   * Abre o diálogo para salvar rascunho ou atualiza o existente
   */
  openSaveDraftDialog() {
    // Se já tem um rascunho selecionado, atualiza direto SEM fechar
    if (this.selectedDraftId) {
      const currentDraft = this.availableDrafts.find(
        (d) => d.id === this.selectedDraftId
      );
      if (currentDraft) {
        this.saveLocalDraft(
          false,
          currentDraft.draftName,
          this.selectedDraftId,
          false // NÃO fechar o formulário
        );
        return;
      }
    }

    // Se é novo, abre diálogo para nomear
    const suggestedName =
      (this.form.value.street || '') +
        (this.form.value.number ? ', ' + this.form.value.number : '') ||
      `Endereço ${new Date().toLocaleString()}`;

    const dialogRef = this.dialog.open(SaveDraftDialogComponent, {
      data: {
        title: 'Salvar Rascunho de Endereço',
        suggestedName,
      },
    });

    dialogRef.afterClosed().subscribe((result: SaveDraftDialogResult) => {
      if (result && result.confirmed) {
        this.saveLocalDraft(false, result.draftName, undefined, false);
      }
    });
  }

  /**
   * Carrega a lista de rascunhos disponíveis
   */
  private loadAvailableDrafts(): void {
    this.availableDrafts = this.formDraftService.getDraftsByType(
      this.FORM_TYPE
    );

    // Filtra rascunhos relacionados à pessoa atual
    this.availableDrafts = this.availableDrafts.filter((d) => {
      const data = d.data as any;
      const draftOwnerId = data.ownerId;
      return !draftOwnerId || draftOwnerId === this.ownerId;
    });
  }

  /**
   * Seleciona um rascunho para carregar
   */
  protected onDraftSelected(event: any): void {
    const draftId = event.value;

    if (!draftId) {
      this.resetForm();
      this.selectedDraftId = null;
      return;
    }

    const draft = this.availableDrafts.find((d) => d.id === draftId);
    if (!draft) return;

    // Se o rascunho tem _editingId, significa que é edição de registro existente
    if (draft.data._editingId) {
      // Restaura o objeto address para indicar modo de edição
      this.address = {
        addressId: draft.data._editingId,
        ...draft.data,
      } as any;
    }

    this.form.patchValue(draft.data);
    this.selectedDraftId = draft.id;
    this.toastr.success('Rascunho carregado');

    console.log('[onDraftSelected] Rascunho carregado:', draft);
    console.log('[onDraftSelected] Modo de edição:', !!draft.data._editingId);

    setTimeout(() => {
      this.captureInitialFormValue();
      this.form.markAsPristine();
    }, 200);
  }

  /**
   * Exclui um rascunho
   */
  protected deleteDraft(draftId: string, event?: Event): void {
    if (event) event.stopPropagation();

    const draft = this.availableDrafts.find((d) => d.id === draftId);
    if (!draft) return;

    const confirmed = confirm(
      `Excluir rascunho "${draft.draftName || 'sem nome'}"?`
    );
    if (!confirmed) return;

    this.formDraftService.removeDraftById(draft.id);
    if (this.selectedDraftId === draftId) {
      this.resetForm();
      this.selectedDraftId = null;
    }
    this.toastr.success('Rascunho excluído');
  }

  /**
   * Formata a data do rascunho
   */
  protected formatDraftDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'agora mesmo';
    if (diffMins < 60) return `há ${diffMins} min`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `há ${diffHours} h`;

    return new Date(date).toLocaleDateString('pt-BR');
  }

  /**
   * Captura o valor inicial do formulário após carregar dados
   * Usado para detectar mudanças não salvas
   */
  private captureInitialFormValue(): void {
    this.initialFormValue = JSON.stringify(this.form.value);
  }

  onCancel() {
    if (this.hasUnsavedChanges()) {
      const dialogRef: MatDialogRef<ConfirmDialogComponent> = this.dialog.open(
        ConfirmDialogComponent,
        {
          data: {
            title: 'Descartar Alterações',
            message: 'Existem alterações não salvas. Deseja descartá-las?',
            confirmText: 'Descartar',
            cancelText: 'Continuar Editando',
          },
        }
      );

      dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          this.resetForm();
          this.formCancelled.emit();
        }
      });
    } else {
      this.resetForm();
      this.formCancelled.emit();
    }
  }

  private resetForm() {
    this.form.reset({
      addressType: AddressType.RESIDENCIAL,
      country: 'Brasil',
      mainAddress: false,
      active: true,
    });
    this.submitted = false;
  }
}
