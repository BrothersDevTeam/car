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
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';
import { PrimaryInputComponent } from '@components/primary-input/primary-input.component';

import { CpfValidatorDirective } from '@directives/cpf-validator.directive';
import { Observable, of, Subscription } from 'rxjs';

import { FormDraftService } from '@services/form-draft.service';

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
  ],
  templateUrl: './natural-person-form.component.html',
  styleUrl: './natural-person-form.component.scss',
})
export class NaturalPersonFormComponent
  implements OnInit, OnChanges, CanComponentDeactivate
{
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
  private isSaving = false;

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
  ) {}

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

    if (!this.initialFormValue) {
      return false;
    }

    const currentValue = JSON.stringify(this.form.value);
    const hasChanges = currentValue !== this.initialFormValue;

    console.log('[hasUnsavedChanges] Tem mudanças não salvas?', hasChanges);
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
          this.personService
            .update(formValue, this.dataForm.personId)
            .subscribe({
              next: () => {
                this.toastrService.success('Atualização feita com sucesso');
                // Converte personId para o tipo correto antes de passar
                const personId = Number(this.dataForm!.personId);
                this.formDraftService.removeDraft(
                  this.FORM_TYPE,
                  personId
                );
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
          this.personService.create(clean).subscribe({
            next: () => {
              this.toastrService.success('Cadastro realizado com sucesso');
              this.formDraftService.removeDraft(this.FORM_TYPE);
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
   */
  saveLocalDraft(silent: boolean = false): void {
    const draftId = this.formDraftService.saveDraft(
      this.FORM_TYPE,
      this.form.value,
      this.dataForm?.personId
    );

    if (!silent) {
      this.toastrService.info('Rascunho salvo localmente');
    }

    console.log('[saveLocalDraft] Rascunho salvo:', draftId);
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
        const isDirty = this.form.dirty;
        this.actionsService.hasFormChanges.set(isDirty);
        this.formChanged.emit(isDirty);
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

    this.checkForDrafts();

    setTimeout(() => {
      this.captureInitialFormValue();
    }, 500);
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
      console.log('[onSubmit] Formulário inválido:', this.form.value);
      console.log('[onSubmit] Erros do formulário:', this.form.errors);

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
          this.formDraftService.removeDraft(
            this.FORM_TYPE,
            personId
          );
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
      this.personService.create(clean).subscribe({
        next: () => {
          this.toastrService.success('Cadastro realizado com sucesso');
          this.formDraftService.removeDraft(this.FORM_TYPE);
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
