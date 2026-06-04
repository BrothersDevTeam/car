import {
  Input,
  inject,
  OnInit,
  Output,
  Component,
  OnChanges,
  EventEmitter,
  SimpleChanges,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { ToastrService } from 'ngx-toastr';
import { Subscription, Observable, of } from 'rxjs';

import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';
import { PrimaryInputComponent } from '@components/primary-input/primary-input.component';
import { RelationshipFormDialogComponent } from '@components/dialogs/relationship-form-dialog/relationship-form-dialog.component';
import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';

import { CnpjValidatorDirective } from '@directives/cnpj-validator.directive';

import { RelationshipTypes } from '@enums/relationshipTypes';

import { CanComponentDeactivate } from '@guards/unsaved-changes.guard';

import type { CreateLegalEntity, Person } from '@interfaces/person';

import { extractErrorMessage } from '@utils/error-utils';
import { removeEmptyPropertiesFromObject } from '@utils/removeEmptyPropertiesFromObject';

import { PersonService } from '@services/person.service';
import { ActionsService } from '@services/actions.service';
import { FormDraftService, FormDraft } from '@services/form-draft.service';
import { StoreContextService } from '@services/store-context.service';
import { RelationshipService } from '@services/relationship.service';
import { RelationshipResponse } from '@interfaces/relationship';

@Component({
  selector: 'app-legal-entity-form',
  imports: [
    PrimaryInputComponent,
    ReactiveFormsModule,
    WrapperCardComponent,
    MatButtonModule,
    MatIconModule,
    CnpjValidatorDirective,
    MatCardModule,
    MatTooltipModule,
    MatSelectModule,
    MatFormFieldModule,
    CommonModule,
  ],
  templateUrl: './legal-entity-form.component.html',
  styleUrl: './legal-entity-form.component.scss',
})
export class LegalEntityFormComponent implements OnInit, OnChanges, OnDestroy, CanComponentDeactivate {
  private subscriptions = new Subscription();
  submitted = false;

  readonly dialog = inject(MatDialog);
  private formBuilderService = inject(FormBuilder);
  private storeContextService = inject(StoreContextService);

  @ViewChild('submitButton', { static: false, read: ElementRef })
  submitButton!: ElementRef<HTMLButtonElement>;

  /**
   * Armazena o valor inicial do formulário para comparação
   * Usado para detectar se houve mudanças não salvas
   */
  private initialFormValue: any = null;

  /**
   * Flag que indica se o formulário está sendo salvo
   * Evita verificação de mudanças durante salvamento
   */
  protected isSaving = false;
  protected isInitializing = false;
  private dataFormPatched = false;
  private lastSavedDraftValue: any = null;
  protected showFormFields = false;

  /**
   * Define os campos obrigatórios do formulário
   * Usado para verificar se pode salvar completo
   */
  private readonly REQUIRED_FIELDS = ['name', 'cnpj', 'email'];

  /**
   * Tipo do formulário para identificação no localStorage
   */
  private readonly FORM_TYPE = 'pessoa-juridica';

  @Input() dataForm: Person | null = null;
  @Input() draft: FormDraft | null | undefined = null;
  @Output() formSubmitted = new EventEmitter<void>();
  @Output() formChanged = new EventEmitter<boolean>();

  /**
   * Lista de rascunhos disponíveis para este tipo de formulário
   */
  protected availableDrafts: FormDraft[] = [];

  /**
   * ID do rascunho selecionado no combobox
   */
  protected selectedDraftId: string | null = null;

  /**
   * Lista de relacionamentos/cargos disponíveis carregados da API
   */
  protected relationships: RelationshipResponse[] = [];

  /**
   * Formulário reativo para cadastro/edição de pessoa jurídica
   */
  protected form = this.formBuilderService.group({
    name: [this.dataForm?.name || '', Validators.required],
    nickName: [''],
    email: ['', [Validators.email]],
    phone: [''],
    cnpj: ['', [Validators.required, Validators.minLength(14), Validators.maxLength(14)]],
    ie: [''],
    indicadorIe: [''],
    isuf: [''],
    im: [''],
    crc: [''],
    active: [true],
    storeId: [''],
    legalEntity: [true],
    relationshipId: ['', Validators.required],
  });

  constructor(
    private personService: PersonService,
    private toastrService: ToastrService,
    private actionsService: ActionsService,
    private formDraftService: FormDraftService,
    private relationshipService: RelationshipService,
  ) {}

  private checkAndEndInitialization() {
    const relationshipsReady = this.relationships.length > 0;
    const dataFormReady = !this.dataForm || this.dataFormPatched;

    if (relationshipsReady && dataFormReady) {
      this.isInitializing = false;

      if (!this.lastSavedDraftValue) {
        this.lastSavedDraftValue = this.form.getRawValue();
      }

      const hasActiveDraft = !!this.draft || !!this.selectedDraftId;
      const isEditMode = !!this.dataForm && !!this.dataForm.name;

      if (hasActiveDraft && isEditMode) {
        this.form.markAsDirty();
        this.actionsService.hasFormChanges.set(true);
        this.formChanged.emit(true);
        console.log('[checkAndEndInitialization] Edição baseada em rascunho: form mantido como dirty');
      } else {
        this.form.markAsPristine();
        const hasChanges = this.hasUnsavedChanges();
        this.actionsService.hasFormChanges.set(hasChanges);
        this.formChanged.emit(hasChanges);
        console.log('[checkAndEndInitialization] Form finalizado como pristine');
      }
    }
  }

  ngOnInit() {
    this.isInitializing = true;
    this.dataFormPatched = false;
    this.showFormFields = !!this.dataForm || !!this.draft;

    this.subscriptions.add(
      this.form.get('relationshipId')!.valueChanges.subscribe(() => {
        this.updateConditionalValidators();
      }),
    );

    this.subscriptions.add(
      this.form.valueChanges.subscribe(() => {
        const hasChanges = this.hasUnsavedChanges();
        this.actionsService.hasFormChanges.set(hasChanges);
        this.formChanged.emit(hasChanges);
      }),
    );

    this.loadAvailableDrafts();
    this.loadRelationships();

    setTimeout(() => {
      this.captureInitialFormValue();
      if (!this.dataForm) {
        this.dataFormPatched = true;
        this.checkAndEndInitialization();
      }
    }, 500);
  }

  private loadRelationships() {
    this.relationshipService.getAll().subscribe({
      next: (data) => {
        // Para Pessoa Jurídica, filtramos os cargos de funcionários físicos (PROPRIETARIO, GERENTE, VENDEDOR).
        // Apenas vínculos corporativos/gerais como CLIENTE ou FORNECEDOR devem aparecer!
        this.relationships = data.filter((r) => {
          const nameUpper = r.name.toUpperCase();
          return !['PROPRIETARIO', 'GERENTE', 'VENDEDOR'].includes(nameUpper);
        });

        // Aplica o patch value para edição ou novo cadastro
        this.applyRelationshipToForm();
        this.checkAndEndInitialization();
      },
      error: (err) => {
        this.toastrService.error('Erro ao buscar cargos e relacionamentos.');
        console.error(err);
        this.checkAndEndInitialization();
      },
    });
  }

  private applyRelationshipToForm() {
    if (this.dataForm) {
      let relId = this.dataForm.relationshipId || '';
      const rel = this.dataForm.relationship;
      if (rel) {
        if (typeof rel === 'object' && rel.relationshipId) {
          relId = rel.relationshipId;
        } else if (typeof rel === 'string') {
          const found = this.relationships.find((r) => r.name.toUpperCase() === (rel as string).toUpperCase());
          if (found) {
            relId = found.relationshipId;
          }
        }
      }
      this.form.patchValue({
        relationshipId: relId,
      });
    } else {
      // Novo cadastro -> seta CLIENTE como padrão
      const clienteRel = this.relationships.find((r) => r.name.toUpperCase() === 'CLIENTE');
      if (clienteRel) {
        this.form.patchValue({
          relationshipId: clienteRel.relationshipId,
        });
      }
    }
  }

  private updateConditionalValidators() {
    // Mantido vazio para compatibilidade, lógica de campos de usuário removida.
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Implementação da interface CanComponentDeactivate
   * Verifica se há mudanças não salvas comparando com valor inicial
   *
   * @returns true se há mudanças, false caso contrário
   */
  hasUnsavedChanges(): boolean {
    if (this.isSaving || this.isInitializing) {
      return false;
    }

    if (this.form.pristine) {
      console.log('[hasUnsavedChanges] Formulário pristine');
      return false;
    }

    // Se for edição
    if (this.dataForm) {
      return this.hasChangesComparedTo(this.dataForm);
    }

    // Se for novo cadastro
    const clienteRel = this.relationships.find((r) => r.name.toUpperCase() === 'CLIENTE');
    const defaultSource = {
      active: true,
      legalEntity: true,
      relationshipId: clienteRel?.relationshipId || '',
    };
    return this.hasChangesComparedTo(defaultSource);
  }

  private hasChangesComparedTo(source: any): boolean {
    const formValue = this.form.getRawValue() as any;

    const normalize = (val: any, isNumericField = false): string | null => {
      if (val === null || val === undefined) return null;
      let str = val.toString().trim();
      if (isNumericField) {
        str = str.replace(/\D/g, '');
      }
      return str === '' ? null : str;
    };

    const fieldsToCompare: { formField: string; sourceField: string | ((s: any) => any) }[] = [
      { formField: 'name', sourceField: 'name' },
      { formField: 'nickName', sourceField: 'nickName' },
      { formField: 'email', sourceField: 'email' },
      { formField: 'phone', sourceField: 'phone' },
      { formField: 'cnpj', sourceField: 'cnpj' },
      { formField: 'ie', sourceField: 'ie' },
      { formField: 'indicadorIe', sourceField: 'indicadorIe' },
      { formField: 'isuf', sourceField: 'isuf' },
      { formField: 'im', sourceField: 'im' },
      { formField: 'crc', sourceField: 'crc' },
      { formField: 'active', sourceField: 'active' },
      {
        formField: 'relationshipId',
        sourceField: (s) => s.relationshipId || s.relationship?.relationshipId,
      },
    ];

    for (const field of fieldsToCompare) {
      const fVal = formValue[field.formField];
      let sVal = typeof field.sourceField === 'function' ? field.sourceField(source) : source[field.sourceField];

      // Se o campo for booleano
      if (typeof fVal === 'boolean' || typeof sVal === 'boolean') {
        const boolF = !!fVal;
        const boolS = !!sVal;
        if (boolF !== boolS) {
          console.log(`[dirty-check] Mudança no booleano ${field.formField}: ${boolF} !== ${boolS}`);
          return true;
        }
        continue;
      }

      const isNumeric = ['phone', 'cnpj'].includes(field.formField);
      const normF = normalize(fVal, isNumeric);
      const normS = normalize(sVal, isNumeric);

      if (normF !== normS) {
        console.log(`[dirty-check] Mudança no campo ${field.formField}: '${normF}' !== '${normS}'`);
        return true;
      }
    }

    return false;
  }

  get isSaveButtonDisabled(): boolean {
    if (this.isSaving || this.isInitializing) {
      return true;
    }

    const hasActiveDraft = !!this.draft || !!this.selectedDraftId;
    const isEditMode = !!this.dataForm && !!this.dataForm.personId;

    if (isEditMode) {
      if (hasActiveDraft) {
        return !this.form.valid;
      }
      return !this.hasUnsavedChanges();
    }
    return !this.form.valid;
  }

  hasChangesComparedToDraft(): boolean {
    const source = this.lastSavedDraftValue;
    if (!source) {
      return this.hasUnsavedChanges();
    }
    return this.hasChangesComparedTo(source);
  }

  get canShowDraftButton(): boolean {
    return !this.isSaving && !this.isInitializing && this.form.dirty && this.hasChangesComparedToDraft();
  }

  /**
   * Implementação da interface CanComponentDeactivate
   * Verifica se todos os campos obrigatórios estão preenchidos
   *
   * @returns true se pode salvar completo, false caso contrário
   */
  canSaveForm(): boolean {
    if (this.form.valid) {
      console.log('[canSaveForm] Formulário válido, pode salvar');
      return true;
    }

    const canSave = this.REQUIRED_FIELDS.every((field) => {
      const control = this.form.get(field);
      const value = control?.value;
      const filled = value && value.toString().trim() !== '';

      if (!filled) {
        console.log(`[canSaveForm] Campo obrigatório vazio: ${field}`);
      }

      return filled;
    });

    console.log('[canSaveForm] Campos obrigatórios preenchidos?', canSave);
    return canSave;
  }

  /**
   * Implementação da interface CanComponentDeactivate
   * Salva o formulário no backend
   *
   * @param isDraft - Se true, salva como rascunho; se false, salva completo
   * @returns Observable que emite true quando salvo com sucesso
   */
  saveForm(isDraft: boolean): Observable<boolean> {
    console.log('[saveForm] Salvando formulário. IsDraft:', isDraft);

    this.isSaving = true;

    if (isDraft) {
      this.saveLocalDraft();
      this.isSaving = false;
      return of(true);
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastrService.error('Por favor, preencha todos os campos obrigatórios');
      this.isSaving = false;
      return of(false);
    }

    return new Observable((observer) => {
      try {
        const storeId = this.storeContextService.currentStoreId;
        if (!storeId) {
          this.toastrService.error('Loja não identificada. Faça login novamente.');
          this.isSaving = false;
          observer.next(false);
          observer.complete();
          return;
        }

        const baseData = {
          name: this.form.value.name || '',
          nickName: this.form.value.nickName || '',
          cnpj: this.form.value.cnpj?.replace(/\D/g, '') || '',
          ie: this.form.value.ie || '',
          active: true as const,
          email: this.form.value.email || '',
          phone: this.form.value.phone?.replace(/\D/g, '') || '',
          storeId,
          legalEntity: true as const,
          crc: this.form.value.crc || '',
          relationshipId: this.form.value.relationshipId || undefined,
          isEmployee: false,
        };

        const formValue: CreateLegalEntity = baseData;

        if (this.dataForm?.personId) {
          this.personService.update(formValue, this.dataForm.personId).subscribe({
            next: () => {
              this.toastrService.success('Atualização feita com sucesso');
              // Remove pelo personId
              const personId = this.dataForm!.personId;
              this.formDraftService.removeDraft(this.FORM_TYPE, personId);
              this.isSaving = false;
              observer.next(true);
              observer.complete();
            },
            error: (error) => {
              console.error('Erro ao atualizar:', error);
              const msg = extractErrorMessage(error, 'Erro ao atualizar pessoa');
              this.toastrService.error(msg);
              this.isSaving = false;
              observer.next(false);
              observer.complete();
            },
          });
        } else {
          const formCleaned = removeEmptyPropertiesFromObject<CreateLegalEntity>(formValue as Person);
          this.personService.create(formCleaned).subscribe({
            next: () => {
              this.toastrService.success('Cadastro realizado com sucesso');
              this.formDraftService.removeDraft(this.FORM_TYPE);
              this.isSaving = false;
              observer.next(true);
              observer.complete();
            },
            error: (error) => {
              console.error('Erro ao criar:', error);
              const msg = extractErrorMessage(error, 'Erro ao criar pessoa');
              this.toastrService.error(msg);
              this.isSaving = false;
              observer.next(false);
              observer.complete();
            },
          });
        }
      } catch (error) {
        console.error('[saveForm] Erro ao salvar:', error);
        this.isSaving = false;
        observer.next(false);
        observer.complete();
      }
    });
  }

  saveLocalDraft(
    silent: boolean = false,
    draftName?: string,
    existingDraftId?: string,
    closeAfterSave: boolean = true,
  ): void {
    // Prepara os dados do rascunho incluindo ID de edição se aplicável
    const draftData = {
      ...this.form.value,
      _editingId: this.dataForm?.personId, // Preserva o ID se estiver editando
    };

    const draftId = this.formDraftService.saveDraft(this.FORM_TYPE, draftData, this.dataForm?.personId, draftName);

    // Atualiza o ID do rascunho selecionado
    this.selectedDraftId = draftId;
    this.lastSavedDraftValue = this.form.getRawValue();

    if (!silent) {
      this.toastrService.info('Rascunho salvo localmente');
    }

    console.log('[saveLocalDraft] Rascunho salvo:', draftId);

    if (closeAfterSave) {
      this.formSubmitted.emit();
    } else {
      // Se não fechar, marca como pristine
      this.form.markAsPristine();
      this.actionsService.hasFormChanges.set(false);
      setTimeout(() => this.captureInitialFormValue(), 100);
    }
  }

  /**
   * Formata a data do rascunho para exibição
   */
  protected formatDraftDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'agora mesmo';
    } else if (diffMins < 60) {
      return `há ${diffMins} min${diffMins > 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else if (diffDays < 7) {
      return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    } else {
      return new Date(date).toLocaleDateString('pt-BR');
    }
  }

  /**
   * Carrega a lista de rascunhos disponíveis
   */
  private loadAvailableDrafts(): void {
    this.availableDrafts = this.formDraftService.getDraftsByType(this.FORM_TYPE);
    if (this.availableDrafts.length === 0) {
      this.showFormFields = true;
    } else if (this.dataForm || this.draft || this.selectedDraftId) {
      this.showFormFields = true;
    }
  }

  /**
   * Manipulador do evento de seleção de rascunho no combobox
   */
  protected onDraftSelected(event: any): void {
    const draftId = event.value;
    this.showFormFields = true;

    if (draftId === 'new') {
      this.resetForm();
      this.selectedDraftId = 'new';
      return;
    }

    const draft = this.availableDrafts.find((d) => d.id === draftId);
    if (!draft) return;

    this.loadDraftData(draft);
  }

  /**
   * Carrega os dados de um rascunho no formulário
   */
  private loadDraftData(draft: FormDraft): void {
    if (!draft || !draft.data) return;

    this.selectedDraftId = draft.id;

    // Se já temos dataForm (aberto a partir de Editar na listagem), preservamos o original do banco!
    // Se não temos dataForm (aberto a partir de rascunhos gerais do topo):
    if (!this.dataForm && draft.data._editingId) {
      this.dataForm = {
        personId: draft.data._editingId,
      } as any;
    }

    this.form.patchValue(draft.data);

    if (this.relationships.length > 0) {
      this.applyRelationshipToForm();
    }

    this.toastrService.success('Rascunho carregado com sucesso');

    // Armazena o estado do rascunho para controle do botão de salvar rascunho
    this.lastSavedDraftValue = this.form.getRawValue();

    setTimeout(() => {
      this.captureInitialFormValue();

      // Se for uma edição e temos o dataForm original do banco,
      // o formulário deve ser considerado dirty/alterado em relação ao banco!
      if (this.dataForm && this.dataForm.name) {
        this.form.markAsDirty();
        this.actionsService.hasFormChanges.set(true);
        this.formChanged.emit(true);
        console.log('[loadDraftData] Edição baseada em rascunho: formulário marcado como dirty');
      } else {
        this.form.markAsPristine();
        this.actionsService.hasFormChanges.set(false);
        this.formChanged.emit(false);
        console.log('[loadDraftData] Cadastro/rascunho geral: formulário marcado como pristine');
      }
    }, 200);
  }

  /**
   * Exclui um rascunho
   */
  protected deleteDraft(draftId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    const draft = this.availableDrafts.find((d) => d.id === draftId);
    if (!draft) return;

    this.formDraftService.removeDraftById(draft.id);
    this.loadAvailableDrafts();

    if (this.selectedDraftId === draftId) {
      this.resetForm();
      this.selectedDraftId = null;
      this.showFormFields = this.availableDrafts.length === 0;
    }
    this.toastrService.success('Rascunho excluído');
  }

  /**
   * Captura o valor inicial do formulário após carregar dados
   * Usado para detectar mudanças não salvas
   */
  private captureInitialFormValue(): void {
    this.initialFormValue = this.form.value;
    console.log('[captureInitialFormValue] Valor inicial capturado');
  }

  /**
   * Detecta mudanças no @Input dataForm (quando está editando)
   */
  ngOnChanges(changes: SimpleChanges) {
    const hasActiveDraft = !!this.draft || !!this.selectedDraftId;

    if (changes['dataForm'] && this.dataForm) {
      console.log('[legal-entity-form] dataForm recebido:', this.dataForm);
      console.log('[legal-entity-form] relationship do banco:', this.dataForm.relationship);
      this.isInitializing = true;
      this.dataFormPatched = false;

      setTimeout(() => {
        if (!this.dataForm) return;

        if (!hasActiveDraft) {
          this.form.patchValue({
            name: this.dataForm.name || '',
            nickName: this.dataForm.nickName || '',
            email: this.dataForm.email || '',
            phone: this.dataForm.phone || '',
            cnpj: this.dataForm.cnpj || '',
            ie: this.dataForm.ie || '',
            indicadorIe: this.dataForm.indicadorIe || '',
            isuf: this.dataForm.isuf || '',
            im: this.dataForm.im || '',
            crc: this.dataForm.crc || '',
            active: this.dataForm.active !== false,
            storeId: this.dataForm.storeId || '',
            legalEntity: this.dataForm.legalEntity || true,
          });

          if (this.relationships.length > 0) {
            this.applyRelationshipToForm();
          }
        }

        this.dataFormPatched = true;
        this.checkAndEndInitialization();

        console.log('[legal-entity-form] Formulário após patchValue:', this.form.value);
      }, 200);
    }

    if (changes['draft'] && this.draft) {
      console.log('[legal-entity-form] Rascunho recebido via input:', this.draft);
      this.loadDraftData(this.draft);
    }
  }

  onEnter(event: Event): void {
    if (event instanceof KeyboardEvent) {
      event.preventDefault();

      if (this.form.valid && document.activeElement === this.submitButton.nativeElement) {
        this.onSubmit();
      }

      if (this.form.valid && this.submitButton) {
        this.submitButton.nativeElement.focus();
      }
    }
  }

  onSubmit() {
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      console.log('Formulário inválido: ', this.form.value);

      return;
    }

    const storeId = this.storeContextService.currentStoreId;
    if (!storeId) {
      this.toastrService.error('Loja não identificada. Faça login novamente.');
      return;
    }

    const baseData = {
      name: this.form.value.name || '',
      nickName: this.form.value.nickName || '',
      cnpj: this.form.value.cnpj?.replace(/\D/g, '') || '',
      ie: this.form.value.ie || '',
      indicadorIe: this.form.value.indicadorIe || '',
      isuf: this.form.value.isuf || '',
      im: this.form.value.im || '',
      active: true as const,
      email: this.form.value.email || '',
      phone: this.form.value.phone?.replace(/\D/g, '') || '',
      storeId,
      legalEntity: true as const,
      crc: this.form.value.crc || '',
      relationshipId: this.form.value.relationshipId || undefined,
      isEmployee: false,
    };

    const formValue: CreateLegalEntity = baseData;

    console.log('Dados a serem enviados:', formValue);

    if (this.dataForm?.personId) {
      // Captura o ID do rascunho ANTES da requisição
      const draftIdToDelete = this.selectedDraftId || this.draft?.id;

      this.personService.update(formValue, this.dataForm.personId).subscribe({
        next: () => {
          this.toastrService.success('Atualização feita com sucesso');

          // Remove pelo ID específico do rascunho se houver
          if (draftIdToDelete) {
            this.formDraftService.removeDraftById(draftIdToDelete);
          } else {
            // Fallback: Remove pelo personId
            const personId = this.dataForm!.personId;
            this.formDraftService.removeDraft(this.FORM_TYPE, personId);
          }

          this.formSubmitted.emit();
        },
        error: (error) => {
          console.error('Erro ao atualizar:', error);
          this.toastrService.error('Erro inesperado! Tente novamente mais tarde');
        },
      });
    } else {
      const formCleaned = removeEmptyPropertiesFromObject<CreateLegalEntity>(formValue as Person);
      console.log('Dados limpos:', formCleaned);

      // Captura o ID do rascunho ANTES da requisição
      const draftIdToDelete = this.selectedDraftId || this.draft?.id;

      this.personService.create(formCleaned).subscribe({
        next: () => {
          this.toastrService.success('Cadastro realizado com sucesso');

          // Remove o rascunho se houver
          if (draftIdToDelete) {
            this.formDraftService.removeDraftById(draftIdToDelete);
          } else {
            this.formDraftService.removeDraft(this.FORM_TYPE);
          }

          this.formSubmitted.emit();
          this.resetForm();
        },
        error: (error) => {
          console.error('Erro ao criar:', error);
          this.toastrService.error('Erro inesperado! Tente novamente mais tarde');
        },
      });
    }
  }

  private resetForm() {
    this.form.reset();
    this.submitted = false;

    // Novo cadastro -> seta CLIENTE como padrão
    const clienteRel = this.relationships.find((r) => r.name.toUpperCase() === 'CLIENTE');
    if (clienteRel) {
      this.form.patchValue({
        relationshipId: clienteRel.relationshipId,
      });
    }

    this.form.patchValue({
      active: true,
      legalEntity: true,
    });
  }

  getSelectedRelationshipName(): string {
    const relId = this.form.get('relationshipId')?.value;
    const rel = this.relationships.find((r) => r.relationshipId === relId);
    return rel ? rel.name : '';
  }

  openAddRelationshipDialog(event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    const dialogRef = this.dialog.open(RelationshipFormDialogComponent, {
      data: { title: 'Adicionar Novo Vínculo / Cargo' },
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.name) {
        const storeId = this.storeContextService.currentStoreId;
        if (!storeId) {
          this.toastrService.error('Loja não identificada. Faça login novamente.');
          return;
        }

        this.relationshipService.create(storeId, { name: result.name }).subscribe({
          next: (newRel) => {
            this.toastrService.success('Vínculo criado com sucesso!');
            this.relationshipService.getAll().subscribe((data) => {
              this.relationships = data.filter((r) => {
                const nameUpper = r.name.toUpperCase();
                return !['PROPRIETARIO', 'GERENTE', 'VENDEDOR'].includes(nameUpper);
              });
              this.form.patchValue({ relationshipId: newRel.relationshipId });
            });
          },
          error: (err) => {
            const msg = extractErrorMessage(err, 'Erro ao criar vínculo');
            this.toastrService.error(msg);
            console.error(err);
          },
        });
      }
    });
  }

  deleteRelationship(rel: RelationshipResponse, event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Excluir Vínculo / Cargo',
        message: `Tem certeza que deseja excluir o cargo <strong>${rel.name}</strong>? Esta ação não poderá ser desfeita.`,
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
        type: 'danger',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.relationshipService.delete(rel.relationshipId).subscribe({
          next: () => {
            this.toastrService.success('Vínculo excluído com sucesso!');
            if (this.form.get('relationshipId')?.value === rel.relationshipId) {
              this.form.patchValue({ relationshipId: '' });
            }
            this.relationshipService.getAll().subscribe((data) => {
              this.relationships = data.filter((r) => {
                const nameUpper = r.name.toUpperCase();
                return !['PROPRIETARIO', 'GERENTE', 'VENDEDOR'].includes(nameUpper);
              });
            });
          },
          error: (err) => {
            const msg = extractErrorMessage(err, 'Erro ao excluir vínculo');
            this.toastrService.error(msg);
            console.error(err);
          },
        });
      }
    });
  }
}
