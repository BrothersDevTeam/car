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
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';
import { PrimaryInputComponent } from '@components/primary-input/primary-input.component';
import {
  SaveDraftDialogComponent,
  SaveDraftDialogResult,
} from '@components/dialogs/save-draft-dialog/save-draft-dialog.component'; // Added

import { CpfValidatorDirective } from '@directives/cpf-validator.directive';
import { Observable, of, Subscription } from 'rxjs';

import { FormDraftService, FormDraft } from '@services/form-draft.service';

import type { CreateNaturalPerson, Person } from '@interfaces/person';

import { PersonService } from '@services/person.service';
import { ActionsService } from '@services/actions.service';
import { AuthService } from '@services/auth/auth.service';

import { removeEmptyPropertiesFromObject } from '../../../utils/removeEmptyPropertiesFromObject';
import { minLengthArray } from '../../../utils/minLengthArray';
import { PrimarySelectComponent } from '@components/primary-select/primary-select.component';
import { RelationshipTypes } from '../../../enums/relationshipTypes';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';

@Component({
  selector: 'app-natural-person-form',
  imports: [
    PrimaryInputComponent,
    ReactiveFormsModule,
    WrapperCardComponent,
    MatButtonModule,
    MatIconModule,
    CpfValidatorDirective,
    PrimarySelectComponent,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule,
  ],
  templateUrl: './natural-person-form.component.html',
  styleUrl: './natural-person-form.component.scss',
})
export class NaturalPersonFormComponent
  implements OnInit, OnChanges, CanComponentDeactivate {
  private subscriptions = new Subscription();
  submitted = false;

  readonly dialog = inject(MatDialog);
  private formBuilderService = inject(FormBuilder);

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

  @Input() dataForm: Person | null = null;
  @Input() draft: FormDraft | null | undefined = null; // Added to receive draft from parent
  @Output() formSubmitted = new EventEmitter<void>();
  @Output() formChanged = new EventEmitter<boolean>();

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
  private readonly REQUIRED_FIELDS = ['name', 'cpf', 'email'];

  /**
   * Tipo do formulário para identificação no localStorage
   */
  private readonly FORM_TYPE = 'pessoa-fisica';

  /**
   * Lista de rascunhos disponíveis para este tipo de formulário
   */
  protected availableDrafts: any[] = [];

  /**
   * ID do rascunho selecionado no combobox
   */
  protected selectedDraftId: string | null = null;

  /**
   * Controla o estado do checkbox "Cadastrar como funcionário"
   *
   * @property {boolean} isEmployee - Indica se a pessoa será cadastrada como funcionário
   * @default false - Por padrão, toda pessoa é cadastrada como CLIENTE
   *
   * @description
   * Esta propriedade está vinculada ao checkbox do template e controla
   * automaticamente o valor do campo 'relationshipTypes' no formulário.
   * - Quando false: relationshipTypes = [CLIENTE]
   * - Quando true: relationshipTypes = [FUNCIONARIO]
   */
  protected isEmployee = false;

  /**
   * Verifica se o usuário logado tem permissão para cadastrar funcionários
   *
   * @returns {boolean} true se o usuário tem ROLE_CAR_ADMIN ou ROLE_MANAGER
   *
   * @description
   * Apenas usuários com as roles ROLE_CAR_ADMIN ou ROLE_MANAGER podem
   * visualizar o checkbox e cadastrar funcionários no sistema.
   *
   * Para outros usuários (ROLE_SELLER, ROLE_FINANCIAL):
   * - O checkbox não será exibido
   * - Todas as pessoas serão cadastradas como CLIENTE automaticamente
   */
  protected get canRegisterEmployee(): boolean {
    const userRoles = this.authService.getRoles();
    return ['ROLE_CAR_ADMIN', 'ROLE_ADMIN', 'ROLE_MANAGER'].includes(
      userRoles[0]
    );
  }

  /**
   * Formulário reativo para cadastro/edição de pessoa física
   *
   * IMPORTANTE: relationshipTypes agora é controlado pelo checkbox 'isEmployee'
   * - Por padrão: [CLIENTE]
   * - Quando checkbox marcado: [FUNCIONARIO]
   *
   * O campo relationshipTypes é SEMPRE um array com apenas UM elemento,
   * gerenciado automaticamente pelo método toggleEmployeeType()
   */
  protected form = this.formBuilderService.group({
    name: ['', Validators.required],
    nickName: [''],
    email: ['', [Validators.email]],
    phone: [''],
    cpf: [''],
    rg: [''],
    rgIssuer: [''],
    active: [true],
    storeId: [''],
    legalEntity: [false],
    relationshipTypes: this.formBuilderService.control<RelationshipTypes[]>(
      [RelationshipTypes.CLIENTE],
      {
        validators: [minLengthArray(1)],
      }
    ),
    username: [''],
    password: [''],
    confirmPassword: [''],
    roleName: [''],
  });

  /**
   * Verifica se deve mostrar os campos de usuário do sistema
   *
   * @returns {boolean} true se deve mostrar os campos
   *
   * @description
   * Os campos de usuário (username, password, roleName) só aparecem quando:
   * 1. O tipo selecionado é FUNCIONARIO ou PROPRIETARIO
   * 2. Está no modo de CRIAÇÃO (dataForm é null)
   *
   * No modo de EDIÇÃO, esses campos NUNCA aparecem.
   * A edição de dados de acesso será feita posteriormente em outra tela.
   */
  get shouldShowUserFields(): boolean {
    if (this.dataForm) {
      return false;
    }

    const selectedTypes = this.form.get('relationshipTypes')?.value || [];
    return selectedTypes.some((type: RelationshipTypes) =>
      [RelationshipTypes.PROPRIETARIO, RelationshipTypes.FUNCIONARIO].includes(
        type
      )
    );
  }

  constructor(
    private personService: PersonService,
    private toastrService: ToastrService,
    private actionsService: ActionsService,
    private authService: AuthService,
    private formDraftService: FormDraftService
  ) { }

  /**
   * Implementação da interface CanComponentDeactivate
   * Verifica se há mudanças não salvas comparando com valor inicial
   *
   * @returns true se há mudanças, false caso contrário
   */
  hasUnsavedChanges(): boolean {
    if (this.isSaving) {
      return false;
    }

    if (this.form.pristine) {
      console.log('[hasUnsavedChanges] Formulário pristine');
      return false;
    }

    if (!this.initialFormValue) {
      return false;
    }

    const currentValue = JSON.stringify(this.form.value);
    const hasChanges = currentValue !== this.initialFormValue;

    console.log('[hasUnsavedChanges] Tem mudanças?', hasChanges);
    return hasChanges;
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
      this.toastrService.error(
        'Por favor, preencha todos os campos obrigatórios'
      );
      this.isSaving = false;
      return of(false);
    }

    return new Observable((observer) => {
      try {
        const storeId = this.authService.getStoreId();
        if (!storeId) {
          this.toastrService.error(
            'Loja não identificada. Faça login novamente.'
          );
          this.isSaving = false;
          observer.next(false);
          observer.complete();
          return;
        }

        const baseData = {
          name: this.form.value.name || '',
          storeId,
          cpf: this.form.value.cpf?.replace(/\D/g, '') || '',
          active: true as const,
          email: this.form.value.email || '',
          phone: this.form.value.phone?.replace(/\D/g, '') || '',
          nickName: this.form.value.nickName || '',
          legalEntity: false as const,
          rg: this.form.value.rg?.replace(/\D/g, '') || '',
          rgIssuer: '',
          crc: '',
          relationshipTypes: this.form.value
            .relationshipTypes as RelationshipTypes[],
        };

        let formValue: CreateNaturalPerson;

        if (this.shouldShowUserFields) {
          formValue = {
            ...baseData,
            username: this.form.value.username || '',
            password: this.form.value.password || '',
            roleName: this.form.value.roleName || '',
          };
        } else {
          formValue = baseData;
        }

        if (this.dataForm?.personId) {
          // Captura o ID do rascunho ANTES da requisição
          const draftIdToDelete = this.selectedDraftId;

          this.personService
            .update(formValue, this.dataForm.personId)
            .subscribe({
              next: () => {
                this.toastrService.success('Atualização feita com sucesso');

                // Remove pelo ID específico do rascunho se houver
                if (draftIdToDelete) {
                  console.log(
                    '[saveForm] Removendo rascunho de edição:',
                    draftIdToDelete
                  );
                  this.formDraftService.removeDraftById(draftIdToDelete);
                } else {
                  // Fallback: Remove pelo personId
                  const personId = Number(this.dataForm!.personId);
                  this.formDraftService.removeDraft(this.FORM_TYPE, personId);
                }

                this.isSaving = false;
                observer.next(true);
                observer.complete();
              },
              error: (error) => {
                console.error('Erro ao atualizar:', error);
                this.toastrService.error('Erro ao atualizar pessoa');
                this.isSaving = false;
                observer.next(false);
                observer.complete();
              },
            });
        } else {
          const clean = removeEmptyPropertiesFromObject<CreateNaturalPerson>(
            formValue as Person
          );

          // Captura o ID do rascunho ANTES da requisição
          // Evita problemas caso resetForm seja chamado durante processamento
          const draftIdToDelete = this.selectedDraftId || this.draft?.id;
          console.log(
            '[saveForm] ID capturado para exclusão futura:',
            draftIdToDelete
          );

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
              this.toastrService.error('Erro ao criar pessoa');
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
    closeAfterSave: boolean = true
  ): void {
    const personId = this.dataForm?.personId
      ? Number(this.dataForm.personId)
      : undefined;

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

    if (!effectiveEntityId && existingDraftId) {
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
      if (existingDraftId.startsWith(prefix)) {
        effectiveEntityId = existingDraftId.replace(prefix, '') as any;
      }
    }

    // Prepara os dados do rascunho incluindo ID de edição se aplicável
    const draftData = {
      ...this.form.value,
      _editingId: this.dataForm?.personId, // Preserva o ID se estiver editando
    };

    const draftId = this.formDraftService.saveDraft(
      this.FORM_TYPE,
      draftData,
      effectiveEntityId,
      draftName
    );

    // CRITICAL FIX: SEMPRE atualiza o ID do rascunho selecionado
    this.selectedDraftId = draftId;
    console.log('[saveLocalDraft] selectedDraftId atualizado para:', draftId);

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
      const currentDraft = this.availableDrafts.find(
        (d) => d.id === this.selectedDraftId
      );
      if (currentDraft) {
        // Salva silenciosamente, mantendo o formulário aberto
        this.saveLocalDraft(
          false,
          currentDraft.draftName,
          this.selectedDraftId,
          true // FECHAR o formulário
        );
        return;
      }
    }

    // 2. Se é novo, abre diálogo para nomear
    const suggestedName =
      this.form.value.name || `Rascunho ${new Date().toLocaleString()}`;

    const dialogRef = this.dialog.open(SaveDraftDialogComponent, {
      data: {
        title: 'Salvar Rascunho',
        suggestedName,
      },
    });

    dialogRef.afterClosed().subscribe((result: SaveDraftDialogResult) => {
      if (result && result.confirmed) {
        // Validação estrita de nome único
        const nameExists = this.availableDrafts.some(
          (d) => d.draftName === result.draftName
        );

        if (nameExists) {
          this.toastrService.error(
            'Já existe um rascunho com este nome. Por favor, escolha outro.',
            'Nome Duplicado'
          );
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
    this.initialFormValue = JSON.stringify(this.form.value);
    console.log('[captureInitialFormValue] Valor inicial capturado');
  }

  /**
   * Carrega a lista de rascunhos disponíveis
   */
  private loadAvailableDrafts(): void {
    this.availableDrafts = this.formDraftService.getDraftsByType(
      this.FORM_TYPE
    );
    console.log(
      '[loadAvailableDrafts] Rascunhos carregados:',
      this.availableDrafts.length
    );
  }

  /**
   * Manipulador do evento de seleção de rascunho no combobox
   */
  protected onDraftSelected(event: any): void {
    const draftId = event.value;

    if (!draftId) {
      // Usuário escolheu "Iniciar novo cadastro"
      this.resetForm();
      this.selectedDraftId = null;
      return;
    }

    const draft = this.availableDrafts.find((d) => d.id === draftId);
    if (!draft) {
      console.error('[onDraftSelected] Rascunho não encontrado:', draftId);
      return;
    }

    this.loadDraftData(draft);
  }

  /**
   * Exclui um rascunho
   */
  protected deleteDraft(draftId: string): void {
    const draft = this.availableDrafts.find((d) => d.id === draftId);
    if (!draft) {
      return;
    }

    const confirmed = confirm(
      `Tem certeza que deseja excluir o rascunho "${draft.draftName || 'sem nome'
      }"?`
    );

    if (!confirmed) {
      return;
    }

    // Remove do localStorage
    this.formDraftService.removeDraftById(draft.id);

    // Limpa o formulário se este era o rascunho selecionado
    if (this.selectedDraftId === draftId) {
      this.resetForm();
      this.selectedDraftId = null;
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

  /**
   * Verifica se existe rascunho salvo e pergunta se deseja carregar
   */
  private checkForDrafts(): void {
    if (this.dataForm?.personId) {
      return;
    }

    // Converte personId de string para number
    const personId = this.dataForm?.personId
      ? Number(this.dataForm.personId)
      : undefined;

    const draft = this.formDraftService.getDraft<any>(this.FORM_TYPE, personId);

    if (draft) {
      const loadDraft = confirm(
        `Foi encontrado um rascunho salvo em ${draft.lastModified.toLocaleString()}.\n\nDeseja carregar este rascunho?`
      );

      if (loadDraft) {
        this.form.patchValue(draft.data);

        const relationshipTypes = draft.data.relationshipTypes || [];
        this.isEmployee = relationshipTypes.includes(
          RelationshipTypes.FUNCIONARIO
        );

        this.toastrService.success('Rascunho carregado com sucesso');
        console.log('[checkForDrafts] Rascunho carregado:', draft);
      } else {
        this.formDraftService.removeDraft(this.FORM_TYPE);
        console.log('[checkForDrafts] Rascunho removido');
      }
    }
  }

  // Validator personalizado para verificar se as senhas coincidem
  private passwordMatchValidator(
    control: AbstractControl
  ): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      const errors = confirmPassword.errors;
      if (errors) {
        delete errors['passwordMismatch'];
        confirmPassword.setErrors(
          Object.keys(errors).length > 0 ? errors : null
        );
      }
    }

    return null;
  }

  ngOnInit() {
    this.form.setValidators(this.passwordMatchValidator.bind(this));

    this.subscriptions.add(
      this.form.get('relationshipTypes')!.valueChanges.subscribe((types) => {
        this.updateConditionalValidators();
      })
    );

    this.subscriptions.add(
      this.form.valueChanges.subscribe(() => {
        const hasChanges = this.hasUnsavedChanges();
        this.actionsService.hasFormChanges.set(hasChanges);
        this.formChanged.emit(hasChanges);
      })
    );

    this.subscriptions.add(
      this.form.get('username')?.valueChanges.subscribe(() => {
        const usernameControl = this.form.get('username');
        if (usernameControl?.hasError('usernameConflict')) {
          const errors = { ...usernameControl.errors };
          delete errors['usernameConflict'];
          usernameControl.setErrors(
            Object.keys(errors).length > 0 ? errors : null
          );
        }
      }) ?? new Subscription()
    );

    this.loadAvailableDrafts();
    // this.checkForDrafts(); // Removido verificação automática pois agora é selecionável

    setTimeout(() => {
      this.captureInitialFormValue();
    }, 500);

    // Inscreve para atualizar lista quando rascunhos mudarem
    this.subscriptions.add(
      this.formDraftService.draftsChanges.subscribe(() => {
        this.loadAvailableDrafts();
      })
    );
  }

  protected toggleEmployeeType(): void {
    this.isEmployee = !this.isEmployee;

    if (this.isEmployee) {
      this.form
        .get('relationshipTypes')
        ?.setValue([RelationshipTypes.FUNCIONARIO]);
      console.log('[toggleEmployeeType] Alterado para FUNCIONARIO');
    } else {
      this.form.get('relationshipTypes')?.setValue([RelationshipTypes.CLIENTE]);
      console.log('[toggleEmployeeType] Alterado para CLIENTE');
    }

    this.form.markAsDirty();
  }

  private updateConditionalValidators() {
    if (!this.form) return;

    const usernameControl = this.form.get('username');
    const passwordControl = this.form.get('password');
    const confirmPasswordControl = this.form.get('confirmPassword');
    const roleNameControl = this.form.get('roleName');

    if (this.shouldShowUserFields) {
      usernameControl?.setValidators([
        Validators.required,
        Validators.minLength(3),
      ]);
      passwordControl?.setValidators([
        Validators.required,
        Validators.minLength(6),
      ]);
      confirmPasswordControl?.setValidators([
        Validators.required,
        Validators.minLength(6),
      ]);
      roleNameControl?.setValidators([Validators.required]);

      usernameControl?.updateValueAndValidity({ emitEvent: false });
      passwordControl?.updateValueAndValidity({ emitEvent: false });
      confirmPasswordControl?.updateValueAndValidity({ emitEvent: false });
      roleNameControl?.updateValueAndValidity({ emitEvent: false });
    } else {
      usernameControl?.clearValidators();
      passwordControl?.clearValidators();
      confirmPasswordControl?.clearValidators();
      roleNameControl?.clearValidators();

      usernameControl?.setValue('', { emitEvent: false });
      passwordControl?.setValue('', { emitEvent: false });
      confirmPasswordControl?.setValue('', { emitEvent: false });
      roleNameControl?.setValue('', { emitEvent: false });

      usernameControl?.updateValueAndValidity({ emitEvent: false });
      passwordControl?.updateValueAndValidity({ emitEvent: false });
      confirmPasswordControl?.updateValueAndValidity({ emitEvent: false });
      roleNameControl?.updateValueAndValidity({ emitEvent: false });
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    console.log('[ngOnDestroy] Subscriptions canceladas');
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['dataForm'] && this.dataForm) {
      console.log('[natural-person-form] dataForm recebido:', this.dataForm);
      console.log(
        '[natural-person-form] relationshipTypes do banco:',
        this.dataForm.relationshipTypes
      );
      console.log(
        '[natural-person-form] relationships do banco:',
        (this.dataForm as any).relationships
      );

      const relationshipsFromBackend =
        (this.dataForm as any).relationships || [];
      const relationshipTypes = relationshipsFromBackend.map(
        (rel: any) => rel.relationshipName
      );

      console.log(
        '[natural-person-form] relationshipTypes mapeado:',
        relationshipTypes
      );

      this.isEmployee =
        relationshipTypes.includes(RelationshipTypes.FUNCIONARIO) ||
        relationshipTypes.includes(RelationshipTypes.PROPRIETARIO);

      console.log(
        '[natural-person-form] isEmployee setado para:',
        this.isEmployee
      );

      setTimeout(() => {
        this.form.patchValue({
          name: this.dataForm!.name || '',
          relationshipTypes:
            relationshipTypes.length > 0
              ? relationshipTypes
              : [RelationshipTypes.CLIENTE],
          nickName: this.dataForm!.nickName || '',
          email: this.dataForm!.email || '',
          phone: this.dataForm!.phone || '',
          cpf: this.dataForm!.cpf || '',
          rg: this.dataForm!.rg || '',
          rgIssuer: this.dataForm!.rgIssuer || '',
        });

        console.log(
          '[natural-person-form] Formulário após patchValue:',
          this.form.value
        );
        console.log(
          '[natural-person-form] relationshipTypes após patchValue:',
          this.form.get('relationshipTypes')?.value
        );
      }, 200);
    }

    if (changes['draft'] && this.draft) {
      console.log(
        '[natural-person-form] Rascunho recebido via input:',
        this.draft
      );
      this.loadDraftData(this.draft);
    }
  }

  /**
   * Carrega os dados de um rascunho no formulário
   */
  private loadDraftData(draft: FormDraft): void {
    // CRITICAL: Define o selectedDraftId ANTES de tudo
    this.selectedDraftId = draft.id;
    console.log('[loadDraftData] selectedDraftId definido para:', draft.id);

    // Se o rascunho tem _editingId, significa que é edição de registro existente
    if (draft.data._editingId) {
      // Restaura o dataForm para indicar modo de edição
      this.dataForm = {
        personId: draft.data._editingId,
        ...draft.data,
      } as any;
    }

    this.form.patchValue(draft.data);

    const relationshipTypes = draft.data.relationshipTypes || [];
    this.isEmployee = relationshipTypes.includes(RelationshipTypes.FUNCIONARIO);

    this.toastrService.success(
      `Rascunho "${draft.draftName || 'sem nome'}" carregado`
    );

    console.log('[loadDraftData] Rascunho carregado:', draft);
    console.log('[loadDraftData] Modo de edição:', !!draft.data._editingId);

    setTimeout(() => {
      this.captureInitialFormValue();
      this.form.markAsPristine();
      this.actionsService.hasFormChanges.set(false);
      console.log('[loadDraftData] Formulário marcado como pristine');
    }, 500);
  }

  onEnter(event: Event): void {
    if (event instanceof KeyboardEvent) {
      event.preventDefault();

      if (
        this.form.valid &&
        document.activeElement === this.submitButton.nativeElement
      ) {
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
      this.toastrService.error(
        'Por favor, verifique os campos em vermelho.',
        'Formulário Inválido'
      );

      if (this.shouldShowUserFields) {
        if (this.form.get('username')?.invalid) {
          console.log('[onSubmit] Username é obrigatório para funcionários');
        }
        if (this.form.get('password')?.invalid) {
          console.log('[onSubmit] Password é obrigatório para funcionários');
        }
        if (this.form.get('confirmPassword')?.invalid) {
          console.log('[onSubmit] Confirmação de senha é obrigatória');
        }
        if (this.form.errors?.['passwordMismatch']) {
          console.log('[onSubmit] As senhas não coincidem');
        }
        if (this.form.get('roleName')?.invalid) {
          console.log('[onSubmit] RoleName é obrigatório para funcionários');
        }
      }
      this.isSaving = false;
      return;
    }

    const storeId = this.authService.getStoreId();
    if (!storeId) {
      this.toastrService.error('Loja não identificada. Faça login novamente.');
      this.isSaving = false;
      return;
    }

    const baseData = {
      name: this.form.value.name || '',
      storeId,
      cpf: this.form.value.cpf?.replace(/\D/g, '') || '',
      active: true as const,
      email: this.form.value.email || '',
      phone: this.form.value.phone?.replace(/\D/g, '') || '',
      nickName: this.form.value.nickName || '',
      legalEntity: false as const,
      rg: this.form.value.rg?.replace(/\D/g, '') || '',
      rgIssuer: '',
      crc: '',
      relationshipTypes: this.form.value
        .relationshipTypes as RelationshipTypes[],
    };

    let formValue: CreateNaturalPerson;

    if (this.shouldShowUserFields) {
      formValue = {
        ...baseData,
        username: this.form.value.username || '',
        password: this.form.value.password || '',
        roleName: this.form.value.roleName || '',
      };
    } else {
      formValue = baseData;
    }

    console.log('Dados a serem enviados:', formValue);

    if (this.dataForm?.personId) {
      this.personService.update(formValue, this.dataForm.personId).subscribe({
        next: () => {
          this.toastrService.success('Atualização feita com sucesso');
          // Converte personId para o tipo correto antes de passar
          const personId = Number(this.dataForm!.personId);
          this.formDraftService.removeDraft(this.FORM_TYPE, personId);
          this.formSubmitted.emit();
          this.isSaving = false;
        },
        error: (error) => {
          console.error('Erro ao atualizar:', error);
          this.isSaving = false;

          if (error.error && Array.isArray(error.error)) {
            const validationErrors = error.error;

            const usernameError = validationErrors.find(
              (err: any) => err.code === 'usernameConflict'
            );

            if (usernameError) {
              this.toastrService.error('Nome de usuário já cadastrado', 'Erro');

              this.form.get('username')?.setErrors({
                usernameConflict: true,
              });

              this.focusUsernameField();

              return;
            }

            const firstError = validationErrors[0];
            this.toastrService.error(
              firstError.defaultMessage || 'Erro de validação',
              'Erro ao atualizar'
            );
            return;
          }

          this.toastrService.error(
            'Erro inesperado! Tente novamente mais tarde',
            'Erro'
          );
        },
      });
    } else {
      const clean = removeEmptyPropertiesFromObject<CreateNaturalPerson>(
        formValue as Person
      );
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

            const usernameError = validationErrors.find(
              (err: any) => err.code === 'usernameConflict'
            );

            if (usernameError) {
              this.toastrService.error('Nome de usuário já cadastrado', 'Erro');

              this.form.get('username')?.setErrors({
                usernameConflict: true,
              });

              this.focusUsernameField();

              return;
            }

            const firstError = validationErrors[0];
            this.toastrService.error(
              firstError.defaultMessage || 'Erro de validação',
              'Erro ao cadastrar'
            );
            return;
          }

          this.toastrService.error(
            'Erro inesperado! Tente novamente mais tarde',
            'Erro'
          );
        },
      });
    }
  }

  private resetForm(): void {
    this.form.reset();

    this.submitted = false;

    this.isEmployee = false;
    this.isSaving = false;

    this.form.patchValue({
      active: true,
      legalEntity: false,
      relationshipTypes: [RelationshipTypes.CLIENTE],
    });

    setTimeout(() => {
      this.captureInitialFormValue();
    }, 100);

    console.log('[resetForm] Formulário resetado para estado inicial');
  }

  private focusUsernameField(): void {
    setTimeout(() => {
      if (this.usernameInput) {
        const inputElement = this.usernameInput.nativeElement.querySelector(
          'input'
        ) as HTMLInputElement;

        if (inputElement) {
          inputElement.focus();
          inputElement.select();
          console.log('[focusUsernameField] Foco aplicado no campo username');
        } else {
          console.warn(
            '[focusUsernameField] Input username não encontrado no DOM'
          );
        }
      } else {
        console.warn(
          '[focusUsernameField] ViewChild usernameInput não está disponível'
        );
      }
    }, 100);
  }
}
