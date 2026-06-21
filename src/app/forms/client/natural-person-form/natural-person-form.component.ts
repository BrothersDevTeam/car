import {
  Input,
  inject,
  OnInit,
  Output,
  OnChanges,
  Component,
  EventEmitter,
  SimpleChanges,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';
import { PrimaryInputComponent } from '@components/primary-input/primary-input.component';
import {
  SaveDraftDialogComponent,
  SaveDraftDialogResult,
} from '@components/dialogs/save-draft-dialog/save-draft-dialog.component';
import { RelationshipFormDialogComponent } from '@components/dialogs/relationship-form-dialog/relationship-form-dialog.component';
import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';

import { CpfValidatorDirective } from '@directives/cpf-validator.directive';
import { Observable, of, Subscription } from 'rxjs';

import { FormDraftService, FormDraft } from '@services/form-draft.service';

import type { CreateNaturalPerson, Person } from '@interfaces/person';

import { PersonService } from '@services/person.service';
import { ActionsService } from '@services/actions.service';
import { AuthService } from '@services/auth/auth.service';
import { StoreContextService } from '@services/store-context.service';
import { RelationshipService } from '@services/relationship.service';
import { RelationshipResponse } from '@interfaces/relationship';

import { removeEmptyPropertiesFromObject } from '../../../utils/removeEmptyPropertiesFromObject';
import { extractErrorMessage } from '@utils/error-utils';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { Authorizations } from '../../../enums/authorizations';

@Component({
  selector: 'app-natural-person-form',
  imports: [
    PrimaryInputComponent,
    ReactiveFormsModule,
    WrapperCardComponent,
    MatButtonModule,
    MatIconModule,
    CpfValidatorDirective,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatCardModule,
  ],
  templateUrl: './natural-person-form.component.html',
  styleUrl: './natural-person-form.component.scss',
})
export class NaturalPersonFormComponent implements OnInit, OnChanges, CanComponentDeactivate {
  private subscriptions = new Subscription();
  submitted = false;

  hasOfficialNfe = false;

  readonly dialog = inject(MatDialog);
  private formBuilderService = inject(FormBuilder);
  private storeContextService = inject(StoreContextService);

  @ViewChild('submitButton', { static: false, read: ElementRef })
  submitButton!: ElementRef<HTMLButtonElement>;

  /**
   * Referência ao campo de input username
   *
   * @description
   * ViewChild permite acesso direto ao elemento DOM do campo username.
   * Usado para aplicar foco automaticamente quando há erro de username duplicado.
   *
   * @example
   * // No template:
   * // <app-primary-input #usernameInput formControlName="username" />
   *
   * // No componente:
   * this.usernameInput.nativeElement.querySelector('input')?.focus();
   */
  @ViewChild('usernameInput', { static: false, read: ElementRef })
  usernameInput?: ElementRef;

  @ViewChild('nameInput', { static: false })
  nameInput?: PrimaryInputComponent;

  @Input() dataForm: Person | null = null;
  @Input() draft: FormDraft | null | undefined = null; // Added to receive draft from parent
  @Output() formSubmitted = new EventEmitter<void>();
  @Output() formChanged = new EventEmitter<boolean>();

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
  private readonly REQUIRED_FIELDS = ['name', 'cpf', 'email'];

  /**
   * Tipo do formulário para identificação no localStorage
   */
  private readonly FORM_TYPE = 'pessoa-fisica';

  /**
   * Indica se o usuário já clicou/interagiu com o seletor de rascunhos
   */
  protected draftSelectorClicked = false;

  /**
   * Lista de rascunhos disponíveis para este tipo de formulário
   */
  protected availableDrafts: any[] = [];

  /**
   * ID do rascunho selecionado no combobox
   */
  protected selectedDraftId: string | null = null;

  /**
   * Lista de relacionamentos/cargos disponíveis carregados da API
   */
  protected relationships: RelationshipResponse[] = [];

  /**
   * Formulário reativo para cadastro/edição de pessoa física
   */
  protected form = this.formBuilderService.group({
    name: ['', Validators.required],
    nickName: [''],
    email: ['', [Validators.email]],
    phone: [''],
    cpf: ['', [Validators.required, Validators.minLength(11), Validators.maxLength(11)]],
    rg: [''],
    rgIssuer: [''],
    idEstrangeiro: [''],
    active: [true],
    storeId: [''],
    legalEntity: [false],
    relationshipId: ['', Validators.required],
    isEmployee: [false],
  });

  constructor(
    private personService: PersonService,
    private toastrService: ToastrService,
    private actionsService: ActionsService,
    private authService: AuthService,
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
      isEmployee: false,
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
      { formField: 'cpf', sourceField: 'cpf' },
      { formField: 'rg', sourceField: 'rg' },
      { formField: 'rgIssuer', sourceField: 'rgIssuer' },
      { formField: 'idEstrangeiro', sourceField: 'idEstrangeiro' },
      { formField: 'active', sourceField: 'active' },
      {
        formField: 'relationshipId',
        sourceField: (s) => s.relationshipId || s.relationship?.relationshipId,
      },
      { formField: 'isEmployee', sourceField: 'isEmployee' },
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

      const isNumeric = ['phone', 'cpf'].includes(field.formField);
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

  get currentDraftName(): string | undefined {
    if (this.selectedDraftId) {
      const draft = this.availableDrafts.find((d) => d.id === this.selectedDraftId);
      return draft?.draftName;
    }
    return undefined;
  }

  get suggestedDraftName(): string {
    return this.form.value.name || `Rascunho ${new Date().toLocaleString()}`;
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

    return this.executeSave(isDraft);
  }

  private executeSave(isDraft: boolean): Observable<boolean> {
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

        const formRawValue = this.form.getRawValue();
        const baseData = {
          name: formRawValue.name || '',
          storeId,
          cpf: formRawValue.cpf?.replace(/\D/g, '') || '',
          active: true as const,
          email: formRawValue.email || '',
          phone: formRawValue.phone?.replace(/\D/g, '') || '',
          nickName: formRawValue.nickName || '',
          legalEntity: false as const,
          rg: formRawValue.rg?.replace(/\D/g, '') || '',
          rgIssuer: '',
          relationshipId: formRawValue.relationshipId || undefined,
          isEmployee: !!formRawValue.isEmployee,
        };

        const formValue: CreateNaturalPerson = baseData;

        if (this.dataForm?.personId) {
          // Captura o ID do rascunho ANTES da requisição
          const draftIdToDelete = this.selectedDraftId;

          this.personService.update(formValue, this.dataForm.personId).subscribe({
            next: () => {
              this.toastrService.success('Atualização feita com sucesso');

              // Remove pelo ID específico do rascunho se houver
              if (draftIdToDelete) {
                console.log('[saveForm] Removendo rascunho de edição:', draftIdToDelete);
                this.formDraftService.removeDraftById(draftIdToDelete);
              } else {
                // Fallback: Remove pelo personId
                const personId = this.dataForm!.personId;
                this.formDraftService.removeDraft(this.FORM_TYPE, personId);
              }

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
          const clean = removeEmptyPropertiesFromObject<CreateNaturalPerson>(formValue as Person);

          // Captura o ID do rascunho ANTES da requisição
          // Evita problemas caso resetForm seja chamado durante processamento
          const draftIdToDelete = this.selectedDraftId || this.draft?.id;
          console.log('[saveForm] ID capturado para exclusão futura:', draftIdToDelete);

          this.personService.create(clean).subscribe({
            next: () => {
              this.toastrService.success('Cadastro realizado com sucesso');

              // Remove o rascunho específico se houver
              if (draftIdToDelete) {
                this.formDraftService.removeDraftById(draftIdToDelete);
              } else {
                // Fallback para comportamento antigo (só se não tiver ID específico)
                this.formDraftService.removeDraft(this.FORM_TYPE);
              }

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

  onCpfBlur(): void {
    const rawCpf = this.form.get('cpf')?.value;
    const cleanCpf = rawCpf?.replace(/\D/g, '') || '';

    // Se for novo cadastro (ou se o CPF do input for diferente do dataForm carregado)
    const isNew = !this.dataForm?.personId;
    const isCpfChanged = !isNew && cleanCpf !== (this.dataForm?.cpf?.replace(/\D/g, '') || '');

    if (cleanCpf.length === 11 && (isNew || isCpfChanged)) {
      this.personService.getPaginatedData(0, 10, { cpf: cleanCpf, includeInactive: true }).subscribe({
        next: (response) => {
          if (response.content && response.content.length > 0) {
            const person = response.content[0];
            if (person.active === false) {
              this.toastrService.info('Cadastro inativo encontrado. Dados recuperados para reativação.');

              // Popula o formulário com dados antigos
              this.form.patchValue({
                name: person.name || '',
                nickName: person.nickName || '',
                email: person.email || '',
                phone: person.phone || '',
                cpf: person.cpf || '',
                rg: person.rg || '',
                rgIssuer: person.rgIssuer || '',
                idEstrangeiro: person.idEstrangeiro || '',
                active: true, // Força reativação como true
                storeId: person.storeId || '',
                legalEntity: person.legalEntity || false,
                relationshipId: person.relationshipId || person.relationship?.relationshipId || '',
              });

              // Define o dataForm para o formulário reconhecer como edição (e fazer PUT com o personId)
              this.dataForm = person;
              this.dataFormPatched = true;

              // Como é edição de um registro com histórico, recarrega o histórico
              this.personService.getBusinessHistory(person.personId).subscribe({
                next: (history) => {
                  this.hasOfficialNfe = !!history.hasOfficialNfe;
                  this.checkCpfDisableState();
                },
              });
            }
          }
        },
        error: (err) => {
          console.error('Erro ao buscar CPF inativo:', err);
        },
      });
    }
  }

  checkCpfDisableState(): void {
    if (this.hasOfficialNfe) {
      this.form.get('cpf')?.disable();
    } else {
      this.form.get('cpf')?.enable();
    }
  }

  /**
   * Implementação da interface CanComponentDeactivate
   * Salva rascunho local no localStorage
   *
   * @param silent - Se true, não mostra mensagem de sucesso
   * @param draftName - Nome dado pelo usuário ao rascunho (opcional)
   * @param existingDraftId - ID do rascunho existente para atualizar (opcional)
   * @param closeAfterSave - Se true, fecha o formulário após salvar (padrão: true)
   */
  saveLocalDraft(
    silent: boolean = false,
    draftName?: string,
    existingDraftId?: string,
    closeAfterSave: boolean = true,
  ): void {
    const personId = this.dataForm?.personId || undefined;

    // Se temos um ID de rascunho existente (seja passado explicitamente ou via unique ID strategy)
    // O service vai lidar com a criação ou atualização.
    // Mas para o caso de ID único gerado por timestamp, precisamos garantir que estamos atualizando O MESMO.

    // ATENÇÃO: O serviço saveDraft usa entityId como identificador se fornecido.
    // Se for edição de registro existente (personId), ok.
    // Se for novo cadastro, o "entityId" no saveDraft é usado como sufixo.
    // Precisamos ajustar o service para aceitar um draftId explícito?
    // O service saveDraft(formType, data, entityId, draftName)
    // Se entityId não for passado, ele gera um novo timestamp.
    // ISSO CRIA DUPLICATAS AO ATUALIZAR UM NOVO CADASTRO.

    // CORREÇÃO: Vamos usar o método de salvar do service, mas precisamos passar o identificador correto.
    // Se já estamos editando um rascunho (selectedDraftId), PRECISAMOS extrair o timestamp/sufixo dele.

    let effectiveEntityId = personId;
    const actualDraftId = existingDraftId || this.selectedDraftId;

    if (!effectiveEntityId && actualDraftId) {
      // Se estamos editando um rascunho de NOVO CADASTRO (sem personId),
      // O ID do rascunho é algo como "pessoa-fisica_new_123456789"
      // O service espera "new_123456789" (ou similar) no parametro entityId?
      // Vamos olhar o service:
      // const draftId = entityId ? `${formType}_${entityId}` : ...

      // Se passarmos o sufixo como entityId, funciona?
      // Se eu passar "new_12345" como entityId -> ID vira "pessoa-fisica_new_12345".
      // O ID original no storage é "pessoa-fisica_new_12345".
      // Então sim, precisamos extrair o "identificador" do draftId completo.

      // Formato: formType_SUFIXO
      const prefix = `${this.FORM_TYPE}_`;
      if (actualDraftId.startsWith(prefix)) {
        effectiveEntityId = actualDraftId.replace(prefix, '') as any;
      }
    }

    // Prepara os dados do rascunho incluindo ID de edição se aplicável
    const draftData = {
      ...this.form.value,
      _editingId: this.dataForm?.personId, // Preserva o ID se estiver editando
    };

    const draftId = this.formDraftService.saveDraft(this.FORM_TYPE, draftData, effectiveEntityId, draftName);

    // CRITICAL FIX: SEMPRE atualiza o ID do rascunho selecionado
    this.selectedDraftId = draftId;
    this.lastSavedDraftValue = this.form.getRawValue();
    console.log('[saveLocalDraft] selectedDraftId e lastSavedDraftValue atualizados');

    if (!silent) {
      this.toastrService.info('Rascunho salvo localmente');
    }

    console.log('[saveLocalDraft] Rascunho salvo:', draftId);

    // **IMPORTANTE**: Marca o formulário como pristine após salvar
    // Isso evita que o sistema peça para salvar novamente ao fechar
    if (!closeAfterSave) {
      this.form.markAsPristine();
      this.actionsService.hasFormChanges.set(false);

      // Atualiza o valor inicial para o novo estado salvo
      setTimeout(() => {
        this.captureInitialFormValue();
      }, 100);

      console.log('[saveLocalDraft] Formulário marcado como pristine');
    }

    // Fecha o formulário após salvar SOMENTE se closeAfterSave for true
    if (closeAfterSave) {
      this.formSubmitted.emit();
    }
  }

  /**
   * Abre o diálogo para salvar rascunho ou atualiza o existente
   *
   * @description
   * Se já existe um rascunho selecionado, atualiza diretamente sem pedir nome.
   * Se é um novo rascunho, abre o diálogo para o usuário nomear.
   */
  openSaveDraftDialog() {
    // 1. Se já tem um rascunho selecionado, atualiza direto SEM fechar
    if (this.selectedDraftId) {
      const currentDraft = this.availableDrafts.find((d) => d.id === this.selectedDraftId);
      if (currentDraft) {
        // Salva silenciosamente, mantendo o formulário aberto
        this.saveLocalDraft(
          false,
          currentDraft.draftName,
          this.selectedDraftId,
          true, // FECHAR o formulário
        );
        return;
      }
    }

    // 2. Se é novo, abre diálogo para nomear
    const suggestedName = this.form.value.name || `Rascunho ${new Date().toLocaleString()}`;

    const dialogRef = this.dialog.open(SaveDraftDialogComponent, {
      data: {
        title: 'Salvar Rascunho',
        suggestedName,
      },
    });

    dialogRef.afterClosed().subscribe((result: SaveDraftDialogResult) => {
      if (result && result.confirmed) {
        // Validação estrita de nome único
        const nameExists = this.availableDrafts.some((d) => d.draftName === result.draftName);

        if (nameExists) {
          this.toastrService.error('Já existe um rascunho com este nome. Por favor, escolha outro.', 'Nome Duplicado');
          // Reabre o diálogo para o usuário tentar novamente
          this.openSaveDraftDialog();
          return;
        }

        // Salva novo rascunho e fecha
        this.saveLocalDraft(false, result.draftName, undefined, true);
      }
    });
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
   * Carrega a lista de rascunhos disponíveis
   */
  private loadAvailableDrafts(): void {
    this.availableDrafts = this.formDraftService.getDraftsByType(this.FORM_TYPE);
    console.log('[loadAvailableDrafts] Rascunhos carregados:', this.availableDrafts.length);
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
      // Usuário escolheu "Iniciar novo cadastro"
      this.resetForm();
      this.selectedDraftId = 'new';
      this.focusNameField();
      return;
    }

    const draft = this.availableDrafts.find((d) => d.id === draftId);
    if (!draft) {
      console.error('[onDraftSelected] Rascunho não encontrado:', draftId);
      return;
    }

    this.loadDraftData(draft);
    this.focusNameField();
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
    if (!draft) {
      return;
    }

    // Remove do localStorage
    this.formDraftService.removeDraftById(draft.id);
    this.loadAvailableDrafts();

    // Limpa o formulário se este era o rascunho selecionado
    if (this.selectedDraftId === draftId) {
      this.resetForm();
      this.selectedDraftId = null;
      this.showFormFields = this.availableDrafts.length === 0;
    }

    this.toastrService.success('Rascunho excluído');
    console.log('[deleteDraft] Rascunho excluído:', draftId);
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

  ngOnInit() {
    this.isInitializing = true;
    this.dataFormPatched = false;
    this.showFormFields = !!this.dataForm || !!this.draft;

    this.subscriptions.add(
      this.form.valueChanges.subscribe(() => {
        const hasChanges = this.hasUnsavedChanges();
        this.actionsService.hasFormChanges.set(hasChanges);
        this.formChanged.emit(hasChanges);
      }),
    );

    this.loadAvailableDrafts();
    this.loadRelationships();
    this.setupRelationshipChangeListener();

    setTimeout(() => {
      this.captureInitialFormValue();
      if (!this.dataForm) {
        this.dataFormPatched = true;
        this.checkAndEndInitialization();
      }
    }, 500);

    // Inscreve para atualizar lista quando rascunhos mudarem
    this.subscriptions.add(
      this.formDraftService.draftsChanges.subscribe(() => {
        this.loadAvailableDrafts();
      }),
    );

    // Inscreve para atualizar lista quando relacionamentos mudarem (sincronização reativa PF/PJ)
    this.subscriptions.add(
      this.relationshipService.relationshipsUpdated$.subscribe(() => {
        this.loadRelationships();
      }),
    );

    if (this.showFormFields) {
      this.focusNameField();
    }
  }

  private loadRelationships() {
    this.relationshipService.getAll().subscribe({
      next: (data) => {
        // Oculta a opção 'PROPRIETARIO' no select de criação/edição comum.
        // Só mantém se estiver em modo edição de um registro que já possua esse cargo.
        this.relationships = data.filter((r) => {
          const isProprietario = r.name.toUpperCase() === 'PROPRIETARIO';
          if (!isProprietario) return true;
          const currentRelName = this.dataForm?.relationship?.name || '';
          return !!this.dataForm && currentRelName.toUpperCase() === 'PROPRIETARIO';
        });

        // Agora que os relacionamentos estão carregados, aplica o patch value para edição ou novo cadastro
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
      let isEmp = !!this.dataForm.isEmployee;

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

      // Agora que temos o relId final, buscamos na lista de relacionamentos para validar regras de funcionário
      const selectedRel = this.relationships.find((r) => r.relationshipId === relId);
      if (selectedRel) {
        const relNameUpper = selectedRel.name.toUpperCase();
        if (['PROPRIETARIO', 'GERENTE', 'VENDEDOR'].includes(relNameUpper)) {
          isEmp = true;
        }
      }

      this.form.patchValue({
        relationshipId: relId,
        isEmployee: isEmp,
      });

      // Controla habilitação do toggle
      this.manageEmployeeToggleState(relId);
    } else {
      // Novo cadastro -> seta CLIENTE como padrão
      const clienteRel = this.relationships.find((r) => r.name.toUpperCase() === 'CLIENTE');
      if (clienteRel) {
        this.form.patchValue({
          relationshipId: clienteRel.relationshipId,
          isEmployee: false,
        });
        this.form.get('isEmployee')?.disable();
      }
    }
  }

  private manageEmployeeToggleState(relId: string) {
    const selectedRel = this.relationships.find((r) => r.relationshipId === relId);
    if (selectedRel) {
      const relNameUpper = selectedRel.name.toUpperCase();
      if (['PROPRIETARIO', 'GERENTE', 'VENDEDOR'].includes(relNameUpper)) {
        this.form.get('isEmployee')?.setValue(true);
        this.form.get('isEmployee')?.disable();
      } else if (relNameUpper === 'CLIENTE') {
        this.form.get('isEmployee')?.setValue(false);
        this.form.get('isEmployee')?.disable();
      } else {
        this.form.get('isEmployee')?.enable();
      }
    }
  }

  private setupRelationshipChangeListener() {
    this.subscriptions.add(
      this.form.get('relationshipId')!.valueChanges.subscribe((relId) => {
        if (relId) {
          this.manageEmployeeToggleState(relId);
        }
      }),
    );
  }

  private updateConditionalValidators() {
    // Método mantido vazio para compatibilidade se necessário em refatorações futuras
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    console.log('[ngOnDestroy] Subscriptions canceladas');
  }

  ngOnChanges(changes: SimpleChanges) {
    const hasActiveDraft = !!this.draft || !!this.selectedDraftId;

    if (changes['dataForm']) {
      if (this.dataForm) {
        console.log('[natural-person-form] dataForm recebido:', this.dataForm);
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
              cpf: this.dataForm.cpf || '',
              rg: this.dataForm.rg || '',
              rgIssuer: this.dataForm.rgIssuer || '',
              idEstrangeiro: this.dataForm.idEstrangeiro || '',
              active: this.dataForm.active !== false,
              storeId: this.dataForm.storeId || '',
              legalEntity: this.dataForm.legalEntity || false,
            });

            if (this.relationships.length > 0) {
              this.applyRelationshipToForm();
            }
          }

          this.dataFormPatched = true;
          this.checkAndEndInitialization();

          if (this.dataForm.personId) {
            this.personService.getBusinessHistory(this.dataForm.personId).subscribe({
              next: (history) => {
                this.hasOfficialNfe = !!history.hasOfficialNfe;
                this.checkCpfDisableState();
              },
              error: (err) => {
                console.error('Erro ao buscar histórico:', err);
              },
            });
          }

          console.log('[natural-person-form] Formulário após patchValue de inicialização:', this.form.value);
        }, 200);
      } else {
        this.hasOfficialNfe = false;
        this.form.get('cpf')?.enable();
      }
    }

    if (changes['draft'] && this.draft) {
      console.log('[natural-person-form] Rascunho recebido via input:', this.draft);
      this.loadDraftData(this.draft);
    }
  }

  /**
   * Carrega os dados de um rascunho no formulário
   */
  private loadDraftData(draft: FormDraft): void {
    this.selectedDraftId = draft.id;
    console.log('[loadDraftData] selectedDraftId definido para:', draft.id);

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

    this.toastrService.success(`Rascunho "${draft.draftName || 'sem nome'}" carregado`);

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
    this.isSaving = true;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastrService.error('Por favor, verifique os campos em vermelho.', 'Formulário Inválido');

      this.isSaving = false;
      return;
    }

    const storeId = this.storeContextService.currentStoreId;
    if (!storeId) {
      this.toastrService.error('Loja não identificada. Faça login novamente.');
      this.isSaving = false;
      return;
    }

    const formRawValue = this.form.getRawValue();
    const baseData = {
      name: formRawValue.name || '',
      storeId,
      cpf: formRawValue.cpf?.replace(/\D/g, '') || '',
      active: true as const,
      email: formRawValue.email || '',
      phone: formRawValue.phone?.replace(/\D/g, '') || '',
      nickName: formRawValue.nickName || '',
      legalEntity: false as const,
      rg: formRawValue.rg || '',
      rgIssuer: formRawValue.rgIssuer || '',
      idEstrangeiro: formRawValue.idEstrangeiro || '',
      crc: '',
      relationshipId: formRawValue.relationshipId || undefined,
      isEmployee: !!formRawValue.isEmployee,
    };

    const formValue: CreateNaturalPerson = baseData;

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
          this.isSaving = false;
        },
        error: (error) => {
          console.error('Erro ao atualizar:', error);
          this.isSaving = false;

          if (error.error && Array.isArray(error.error)) {
            const validationErrors = error.error;

            const usernameError = validationErrors.find((err: any) => err.code === 'usernameConflict');

            if (usernameError) {
              this.toastrService.error('Nome de usuário já cadastrado', 'Erro');

              this.form.get('username')?.setErrors({
                usernameConflict: true,
              });

              this.focusUsernameField();

              return;
            }

            const firstError = validationErrors[0];
            this.toastrService.error(firstError.defaultMessage || 'Erro de validação', 'Erro ao atualizar');
            return;
          }

          this.toastrService.error('Erro inesperado! Tente novamente mais tarde', 'Erro');
        },
      });
    } else {
      const clean = removeEmptyPropertiesFromObject<CreateNaturalPerson>(formValue as Person);
      console.log('Dados limpos:', clean);

      // Captura o ID do rascunho ANTES da requisição
      // Evita problemas caso resetForm seja chamado durante processamento
      const draftIdToDelete = this.selectedDraftId || this.draft?.id;

      this.personService.create(clean).subscribe({
        next: () => {
          this.toastrService.success('Cadastro realizado com sucesso');

          // Remove o rascunho específico se houver
          if (draftIdToDelete) {
            this.formDraftService.removeDraftById(draftIdToDelete);
          } else {
            this.formDraftService.removeDraft(this.FORM_TYPE);
          }

          this.formSubmitted.emit();
          this.resetForm();
          this.isSaving = false;
        },
        error: (error) => {
          console.error('Erro ao criar:', error);
          this.isSaving = false;

          if (error.error && Array.isArray(error.error)) {
            const validationErrors = error.error;

            const usernameError = validationErrors.find((err: any) => err.code === 'usernameConflict');

            if (usernameError) {
              this.toastrService.error('Nome de usuário já cadastrado', 'Erro');

              this.form.get('username')?.setErrors({
                usernameConflict: true,
              });

              this.focusUsernameField();

              return;
            }

            const firstError = validationErrors[0];
            this.toastrService.error(firstError.defaultMessage || 'Erro de validação', 'Erro ao cadastrar');
            return;
          }

          this.toastrService.error('Erro inesperado! Tente novamente mais tarde', 'Erro');
        },
      });
    }
  }

  private resetForm(): void {
    this.form.reset();

    this.submitted = false;
    this.isSaving = false;

    this.hasOfficialNfe = false;
    this.form.get('cpf')?.enable();

    const clienteRel = this.relationships.find((r) => r.name.toUpperCase() === 'CLIENTE');

    this.form.patchValue({
      active: true,
      legalEntity: false,
      relationshipId: clienteRel ? clienteRel.relationshipId : '',
      isEmployee: false,
    });

    this.form.get('isEmployee')?.disable();

    setTimeout(() => {
      this.captureInitialFormValue();
    }, 100);

    console.log('[resetForm] Formulário resetado para estado inicial');
  }

  private focusUsernameField(): void {
    setTimeout(() => {
      if (this.usernameInput) {
        const inputElement = this.usernameInput.nativeElement.querySelector('input') as HTMLInputElement;

        if (inputElement) {
          inputElement.focus();
          inputElement.select();
          console.log('[focusUsernameField] Foco aplicado no campo username');
        } else {
          console.warn('[focusUsernameField] Input username não encontrado no DOM');
        }
      } else {
        console.warn('[focusUsernameField] ViewChild usernameInput não está disponível');
      }
    }, 100);
  }

  /**
   * Foca automaticamente no campo "Nome completo"
   */
  focusNameField(): void {
    setTimeout(() => {
      if (this.nameInput) {
        this.nameInput.focus();
        console.log('[focusNameField] Foco aplicado no campo Nome completo');
      } else {
        console.warn('[focusNameField] ViewChild nameInput não está disponível');
      }
    }, 100);
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
                const isProprietario = r.name.toUpperCase() === 'PROPRIETARIO';
                if (!isProprietario) return true;
                const currentRelName = this.dataForm?.relationship?.name || '';
                return !!this.dataForm && currentRelName.toUpperCase() === 'PROPRIETARIO';
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
                const isProprietario = r.name.toUpperCase() === 'PROPRIETARIO';
                if (!isProprietario) return true;
                const currentRelName = this.dataForm?.relationship?.name || '';
                return !!this.dataForm && currentRelName.toUpperCase() === 'PROPRIETARIO';
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
