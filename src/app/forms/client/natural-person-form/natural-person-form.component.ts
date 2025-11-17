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
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';

import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';
import { PrimaryInputComponent } from '@components/primary-input/primary-input.component';

import { CpfValidatorDirective } from '@directives/cpf-validator.directive';

import type {
  CreateNaturalPerson,
  Person,
} from '@interfaces/person';

import { PersonService } from '@services/person.service';
import { ActionsService } from '@services/actions.service';

import { Subscription } from 'rxjs';
import { removeEmptyPropertiesFromObject } from '../../../utils/removeEmptyPropertiesFromObject';
import { minLengthArray } from '../../../utils/minLengthArray';
import { AuthService } from '@services/auth/auth.service';
import { PrimarySelectComponent } from '@components/primary-select/primary-select.component';
import { RelationshipTypes } from '../../../enums/relationshipTypes';

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
export class NaturalPersonFormComponent implements OnInit, OnChanges {
  private subscriptions = new Subscription();
  submitted = false;

  readonly dialog = inject(MatDialog);
  private formBuilderService = inject(FormBuilder);

  @ViewChild('submitButton', { static: false, read: ElementRef })
  submitButton!: ElementRef<HTMLButtonElement>;

  @Input() dataForm: Person | null = null;
  @Output() formSubmitted = new EventEmitter<void>();
  @Output() formChanged = new EventEmitter<boolean>();

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
    return userRoles.includes('ROLE_CAR_ADMIN') || userRoles.includes('ROLE_MANAGER');
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
      [RelationshipTypes.CLIENTE], // ← Começa sempre com CLIENTE por padrão
      {
        validators: [minLengthArray(1)],
      }
    ),
    username: [''],
    password: [''],
    confirmPassword: [''], // Campo para confirmar senha
    roleName: [''],
  });

  // Validator personalizado para verificar se as senhas coincidem
  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      // Remove o erro se as senhas coincidem
      const errors = confirmPassword.errors;
      if (errors) {
        delete errors['passwordMismatch'];
        confirmPassword.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }
    }

    return null;
  }

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
    // Se estiver editando (dataForm existe), nunca mostra campos de usuário
    if (this.dataForm) {
      return false;
    }

    // Se estiver criando, só mostra se for FUNCIONARIO ou PROPRIETARIO
    const selectedTypes = this.form.get('relationshipTypes')?.value || [];
    return selectedTypes.some((type: RelationshipTypes) =>
      [RelationshipTypes.PROPRIETARIO, RelationshipTypes.FUNCIONARIO]
        .includes(type)
    );
  }

  constructor(
    private personService: PersonService,
    private toastrService: ToastrService,
    private actionsService: ActionsService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    /**
     * Inicialização do formulário
     * 
     * @description
     * - Define CLIENTE como tipo padrão (já setado no formulário)
     * - Configura validators dinâmicos
     * - Inscreve-se nas mudanças do formulário para controlar validações
     */

    // Adiciona o validator de senha no formulário
    this.form.setValidators(this.passwordMatchValidator.bind(this));

    // Observa mudanças no relationshipTypes para atualizar validators dinâmicos
    this.subscriptions.add(
      this.form.get('relationshipTypes')!.valueChanges.subscribe((types) => {
        this.updateConditionalValidators();
      })
    );

    // Observa mudanças gerais no formulário para controlar estado dirty
    this.subscriptions.add(
      this.form.valueChanges.subscribe(() => {
        const isDirty = this.form.dirty;
        this.actionsService.hasFormChanges.set(isDirty);
        this.formChanged.emit(isDirty);
      })
    );
  }

  /**
   * Alterna entre CLIENTE e FUNCIONARIO baseado no estado do checkbox
   * 
   * @description
   * Este método é chamado quando o usuário marca/desmarca o checkbox
   * "Cadastrar como funcionário".
   * 
   * IMPORTANTE: O array relationshipTypes sempre terá apenas UM elemento:
   * - Checkbox DESMARCADO: [CLIENTE]
   * - Checkbox MARCADO: [FUNCIONARIO]
   * 
   * Quando marcado como FUNCIONARIO, os campos de usuário (username, password, roleName)
   * se tornam obrigatórios automaticamente através do método updateConditionalValidators().
   * 
   * @returns {void}
   * 
   * @example
   * // Usuário marca checkbox
   * toggleEmployeeType() // isEmployee = true, relationshipTypes = [FUNCIONARIO]
   * 
   * // Usuário desmarca checkbox
   * toggleEmployeeType() // isEmployee = false, relationshipTypes = [CLIENTE]
   */
  protected toggleEmployeeType(): void {
    // Inverte o estado do checkbox
    this.isEmployee = !this.isEmployee;

    // Atualiza o relationshipTypes baseado no novo estado
    if (this.isEmployee) {
      // Marcado como funcionário
      this.form.get('relationshipTypes')?.setValue([RelationshipTypes.FUNCIONARIO]);
      console.log('[toggleEmployeeType] Alterado para FUNCIONARIO');
    } else {
      // Desmarcado (volta para cliente)
      this.form.get('relationshipTypes')?.setValue([RelationshipTypes.CLIENTE]);
      console.log('[toggleEmployeeType] Alterado para CLIENTE');
    }

    // Força a marcação do formulário como modificado
    this.form.markAsDirty();
  }

  private updateConditionalValidators() {
    if (!this.form) return;

    const usernameControl = this.form.get('username');
    const passwordControl = this.form.get('password');
    const confirmPasswordControl = this.form.get('confirmPassword');
    const roleNameControl = this.form.get('roleName');

    if (this.shouldShowUserFields) {
      usernameControl?.setValidators([Validators.required, Validators.minLength(3)]);
      passwordControl?.setValidators([Validators.required, Validators.minLength(6)]);
      confirmPasswordControl?.setValidators([Validators.required, Validators.minLength(6)]);
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

  /**
   * Limpeza ao destruir o componente
   * 
   * @description
   * Cancela todas as inscrições para evitar memory leaks.
   * Boa prática essencial em Angular para componentes que usam RxJS.
   * 
   * @returns {void}
   */
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    console.log('[ngOnDestroy] Subscriptions canceladas');
  }

  /**
   * Detecta mudanças no @Input dataForm (quando está editando)
   * 
   * @param changes - Mudanças detectadas pelo Angular
   * 
   * @description
   * Quando dataForm é preenchido (modo EDIÇÃO), preenche o formulário
   * com os dados do banco.
   * 
   * IMPORTANTE: O backend envia 'relationships' mas o frontend usa 'relationshipTypes'.
   * Precisamos fazer o mapeamento correto!
   * 
   * NOVA LÓGICA: Agora também atualiza o estado do checkbox 'isEmployee'
   * baseado no tipo de relacionamento que veio do banco.
   */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['dataForm'] && this.dataForm) {
      console.log('[natural-person-form] dataForm recebido:', this.dataForm);
      console.log('[natural-person-form] relationshipTypes do banco:', this.dataForm.relationshipTypes);
      console.log('[natural-person-form] relationships do banco:', (this.dataForm as any).relationships);
      
      /**
       * CORREÇÃO CRÍTICA: O backend retorna um array 'relationships' com objetos:
       * relationships: [{relationshipId: '...', relationshipName: 'FUNCIONARIO'}]
       * 
       * Mas o frontend precisa de um array simples de strings:
       * relationshipTypes: ['FUNCIONARIO']
       * 
       * Fazemos o mapeamento aqui!
       */
      const relationshipsFromBackend = (this.dataForm as any).relationships || [];
      const relationshipTypes = relationshipsFromBackend.map((rel: any) => rel.relationshipName);
      
      console.log('[natural-person-form] relationshipTypes mapeado:', relationshipTypes);
      
      /**
       * Atualiza o estado do checkbox baseado no tipo de relacionamento
       * Se for FUNCIONARIO ou PROPRIETARIO, marca o checkbox
       */
      this.isEmployee = relationshipTypes.includes(RelationshipTypes.FUNCIONARIO) || 
                       relationshipTypes.includes(RelationshipTypes.PROPRIETARIO);
      
      console.log('[natural-person-form] isEmployee setado para:', this.isEmployee);
      
      /**
       * Timeout para garantir que o formulário está completamente inicializado
       */
      setTimeout(() => {
        this.form.patchValue({
          name: this.dataForm!.name || '',
          relationshipTypes: relationshipTypes.length > 0 ? relationshipTypes : [RelationshipTypes.CLIENTE],
          nickName: this.dataForm!.nickName || '',
          email: this.dataForm!.email || '',
          phone: this.dataForm!.phone || '',
          cpf: this.dataForm!.cpf || '',
          rg: this.dataForm!.rg || '',
          rgIssuer: this.dataForm!.rgIssuer || '',
        });
        
        console.log('[natural-person-form] Formulário após patchValue:', this.form.value);
        console.log('[natural-person-form] relationshipTypes após patchValue:', this.form.get('relationshipTypes')?.value);
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

  /**
   * Submete o formulário para criação ou atualização de pessoa física
   * 
   * @description
   * Valida o formulário e envia os dados para o backend.
   * 
   * IMPORTANTE: O campo relationshipTypes sempre terá apenas um elemento:
   * - [CLIENTE] se checkbox desmarcado
   * - [FUNCIONARIO] se checkbox marcado
   * 
   * Campos de usuário (username, password, roleName) são enviados apenas
   * quando relationshipTypes inclui FUNCIONARIO ou PROPRIETARIO.
   * 
   * @returns {void}
   */
  onSubmit() {
    this.submitted = true;
    
    // Validação do formulário
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      console.log('[onSubmit] Formulário inválido:', this.form.value);
      console.log('[onSubmit] Erros do formulário:', this.form.errors);
      
      // Logs detalhados para debug
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
      return;
    }

    const storeId = this.authService.getStoreId();
    if (!storeId) {
      this.toastrService.error('Loja não identificada. Faça login novamente.');
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
      relationshipTypes: this.form.value.relationshipTypes as RelationshipTypes[],
    };

    let formValue: CreateNaturalPerson;

    if (this.shouldShowUserFields) {
      // Só adiciona username, password e roleName se for funcionário/contador/proprietário
      formValue = {
        ...baseData,
        username: this.form.value.username || '',
        password: this.form.value.password || '',
        roleName: this.form.value.roleName || '',
      };
    } else {
      // Cliente: NÃO envia username, password e roleName
      formValue = baseData;
    }

    console.log('Dados a serem enviados:', formValue);

    if (this.dataForm?.personId) {
      this.personService.update(formValue, this.dataForm.personId).subscribe({
        next: () => {
          this.toastrService.success('Atualização feita com sucesso');
          this.formSubmitted.emit();
        },
        error: (error) => {
          console.error('Erro ao atualizar:', error);
          this.toastrService.error(
            'Erro inesperado! Tente novamente mais tarde'
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
          this.formSubmitted.emit();
          this.resetForm();
        },
        error: (error) => {
          console.error('Erro ao criar:', error);
          this.toastrService.error(
            'Erro inesperado! Tente novamente mais tarde'
          );
        },
      });
    }
  }

  /**
   * Reseta o formulário para o estado inicial
   * 
   * @description
   * Chamado após um cadastro bem-sucedido para limpar o formulário.
   * 
   * IMPORTANTE: Sempre reseta para o estado padrão:
   * - relationshipTypes = [CLIENTE]
   * - isEmployee = false (checkbox desmarcado)
   * - active = true
   * - legalEntity = false
   * 
   * @returns {void}
   * @private
   */
  private resetForm(): void {
    // Limpa todos os campos do formulário
    this.form.reset();
    
    // Reseta o estado de submissão
    this.submitted = false;
    
    // Reseta o checkbox para desmarcado
    this.isEmployee = false;

    // Define valores padrão
    this.form.patchValue({
      active: true,
      legalEntity: false,
      relationshipTypes: [RelationshipTypes.CLIENTE],
    });
    
    console.log('[resetForm] Formulário resetado para estado inicial');
  }
}
