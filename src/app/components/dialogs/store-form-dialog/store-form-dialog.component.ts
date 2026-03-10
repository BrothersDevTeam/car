import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatStepperModule } from '@angular/material/stepper';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Store } from '@interfaces/store';
import { StoreService } from '@services/store.service';
import { PersonService } from '@services/person.service';
import { AuthService } from '@services/auth/auth.service';
import { PrimaryInputComponent } from '../../primary-input/primary-input.component';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { of, throwError } from 'rxjs';

/**
 * Interface de dados para o dialog de cadastro de loja
 */
export interface StoreFormDialogData {
  title: string;
  mode: 'create' | 'edit';
  isCarAdmin?: boolean; // Define se usa endpoint de MATRIZ ou FILIAL
}

/**
 * Componente wizard para cadastro completo de nova loja matriz
 *
 * Este componente implementa um fluxo de 3 etapas para resolver o problema
 * do "loop infinito" no cadastro:
 *
 * PROBLEMA ORIGINAL:
 * - Para criar Person → precisa de Store
 * - Para fazer login → precisa de User
 * - Para criar User → precisa de Person
 * - LOOP! 🔄
 *
 * SOLUÇÃO (3 STEPS):
 * Step 1: Dados da Loja (CNPJ, razão social, email, telefone)
 * Step 2: Dados do Proprietário (CPF/CNPJ, nome, email, telefone)
 * Step 3: Dados de Acesso (username, senha)
 *
 * FLUXO DE EXECUÇÃO:
 * 1. POST /stores/mainstore → Cria loja MATRIZ
 * 2. POST /persons → Cria pessoa vinculada à loja (com user e password)
 * 3. POST /stores/owner → Vincula pessoa como proprietária da loja
 *
 * Após isso, o cliente pode fazer login e começar a usar o sistema!
 */
@Component({
  selector: 'app-store-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatStepperModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    PrimaryInputComponent, // Componente de input customizado
  ],
  providers: [],
  templateUrl: './store-form-dialog.component.html',
  styleUrls: ['./store-form-dialog.component.scss'],
})
export class StoreFormDialogComponent implements OnInit {
  // Formulários dos 3 steps
  storeForm!: FormGroup; // Step 1: Dados da Loja
  personForm!: FormGroup; // Step 2: Dados do Proprietário
  accessForm!: FormGroup; // Step 3: Dados de Acesso

  // Estados de carregamento e erro
  isSubmitting = false;
  submitError: string | null = null;

  constructor(
    private fb: FormBuilder,
    private storeService: StoreService,
    private personService: PersonService,
    private authService: AuthService,
    public dialogRef: MatDialogRef<StoreFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: StoreFormDialogData
  ) {}

  ngOnInit(): void {
    this.initForms();
  }

  /**
   * Inicializa os 3 formulários do wizard
   */
  private initForms(): void {
    // STEP 1: Formulário de dados da loja
    this.storeForm = this.fb.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(50),
        ],
      ],
      tradeName: ['', [Validators.minLength(3), Validators.maxLength(50)]],
      cnpj: [
        '',
        [
          Validators.required,
          Validators.minLength(14),
          Validators.maxLength(14),
        ],
      ],
      email: [
        '',
        [Validators.required, Validators.email, Validators.maxLength(50)],
      ],
      phoneNumber: ['', [Validators.maxLength(20)]],
    });

    // STEP 2: Formulário de dados do proprietário
    this.personForm = this.fb.group({
      legalEntity: [false], // false = Pessoa Física, true = Pessoa Jurídica
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(50),
        ],
      ],
      nickName: ['', [Validators.minLength(3), Validators.maxLength(50)]],
      cpf: [''], // Validação condicional
      cnpj: [''], // Validação condicional
      rg: ['', [Validators.maxLength(14)]],
      rgIssuer: ['', [Validators.maxLength(14)]],
      email: [
        '',
        [Validators.required, Validators.email, Validators.maxLength(255)],
      ],
      phone: ['', [Validators.maxLength(14)]],
    });

    // STEP 3: Formulário de dados de acesso
    this.accessForm = this.fb.group({
      username: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(50),
        ],
      ],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(6),
          Validators.maxLength(20),
        ],
      ],
      confirmPassword: ['', [Validators.required]],
    });

    // Listener para alternar validação entre CPF e CNPJ
    this.personForm
      .get('legalEntity')
      ?.valueChanges.subscribe((isLegalEntity) => {
        this.updatePersonDocumentValidation(isLegalEntity);
      });

    // Inicializa validação de CPF (padrão é Pessoa Física)
    this.updatePersonDocumentValidation(false);
  }

  /**
   * Atualiza validação de CPF/CNPJ baseado no tipo de pessoa
   * @param isLegalEntity true = Pessoa Jurídica (CNPJ), false = Pessoa Física (CPF)
   */
  private updatePersonDocumentValidation(isLegalEntity: boolean): void {
    const cpfControl = this.personForm.get('cpf');
    const cnpjControl = this.personForm.get('cnpj');

    if (isLegalEntity) {
      // Pessoa Jurídica: CNPJ obrigatório, CPF opcional
      cpfControl?.clearValidators();
      cnpjControl?.setValidators([
        Validators.required,
        Validators.minLength(14),
        Validators.maxLength(14),
      ]);
    } else {
      // Pessoa Física: CPF obrigatório, CNPJ opcional
      cnpjControl?.clearValidators();
      cpfControl?.setValidators([
        Validators.required,
        Validators.minLength(11),
        Validators.maxLength(11),
      ]);
    }

    cpfControl?.updateValueAndValidity();
    cnpjControl?.updateValueAndValidity();
  }

  /**
   * Valida se as senhas conferem
   */
  passwordsMatch(): boolean {
    const password = this.accessForm.get('password')?.value;
    const confirmPassword = this.accessForm.get('confirmPassword')?.value;
    return password === confirmPassword;
  }

  /**
   * Cancela o cadastro e fecha o dialog
   */
  onCancel(): void {
    this.dialogRef.close(null);
  }

  /**
   * Submete o cadastro completo (3 requisições em sequência)
   *
   * FLUXO:
   * 1. Cria Store → retorna storeId
   * 2. Cria Person (com storeId) → retorna personId
   * 3. Vincula Person como owner da Store
   * 4. Retorna sucesso e fecha dialog
   */
  onSubmit(): void {
    // Valida todos os formulários
    if (
      !this.storeForm.valid ||
      !this.personForm.valid ||
      !this.accessForm.valid
    ) {
      this.markAllAsTouched();
      return;
    }

    // Valida se as senhas conferem
    if (!this.passwordsMatch()) {
      this.submitError = 'As senhas não conferem';
      return;
    }

    this.isSubmitting = true;
    this.submitError = null;

    // Prepara payload da Store
    let storePayload;
    try {
      storePayload = this.prepareStorePayload();
    } catch (error: any) {
      // Se o prepareStorePayload lançar erro (ex: mainStoreId não encontrado)
      this.submitError = error.message || 'Erro ao preparar dados da loja';
      this.isSubmitting = false;
      return;
    }

    // 📝 LOG: Mostra qual endpoint será chamado
    console.log(
      '🎯 Tipo de cadastro:',
      this.data.isCarAdmin ? 'MATRIZ' : 'FILIAL'
    );
    console.log(
      '📦 Payload que será enviado:',
      JSON.stringify(storePayload, null, 2)
    );

    // PASSO 1: Criar Store (MATRIZ ou FILIAL baseado na role)
    const createStoreObservable = this.data.isCarAdmin
      ? this.storeService.createMainStore(storePayload) // CAR_ADMIN → POST /stores/mainstore
      : this.storeService.createBranch(storePayload); // ADMIN → POST /stores

    createStoreObservable
      .pipe(
        // Captura o storeId retornado
        tap((createdStore: Store) => {
          console.log('✅ Store criada:', createdStore);
        }),

        // PASSO 2: Criar Person com o storeId
        switchMap((createdStore: Store) => {
          // Valida se storeId existe
          if (!createdStore.storeId) {
            throw new Error('Store criada sem storeId');
          }

          const personPayload = this.preparePersonPayload(createdStore.storeId);
          console.log('📝 Criando proprietário:', personPayload);
          console.log('🆔 StoreId para vinculação:', createdStore.storeId);

          return this.personService.createPerson(personPayload).pipe(
            // Backend retorna o objeto Person completo, não apenas o ID
            tap((createdPerson: any) => {
              console.log('✅ Proprietário criado:', createdPerson);
              console.log('🆔 PersonId extraído:', createdPerson.personId);
              console.log('📊 Tipo do objeto:', typeof createdPerson);
            }),
            // PASSO 3: Vincular Person como owner da Store usando o personId extraído
            switchMap((createdPerson: any) => {
              console.log('🔗 Vinculando proprietário à loja');

              // Validação adicional para garantir que storeId ainda existe
              if (!createdStore.storeId) {
                throw new Error('storeId não encontrado');
              }

              // Valida se personId existe no objeto retornado
              if (!createdPerson.personId) {
                throw new Error('Person criada sem personId');
              }

              console.log('📤 Payload de vinculação:', {
                storeId: createdStore.storeId,
                personId: createdPerson.personId,
              });

              return this.storeService
                .setStoreOwner(
                  createdStore.storeId,
                  createdPerson.personId // ✅ Agora extrai do objeto
                )
                .pipe(
                  tap({
                    next: (updatedStore) => {
                      console.log(
                        '✅ Proprietário vinculado com sucesso:',
                        updatedStore
                      );
                    },
                    error: (error) => {
                      console.error('❌ Erro ao vincular proprietário:', error);
                      console.error('📋 Detalhes do erro:', {
                        status: error.status,
                        statusText: error.statusText,
                        message: error.error?.message || error.message,
                        fullError: error,
                      });
                    },
                  }),
                  // Retorna a store completa
                  switchMap(() => of(createdStore))
                );
            })
          );
        }),

        // Tratamento de erro
        catchError((error) => {
          console.error('❌ Erro no cadastro:', error);
          this.isSubmitting = false;

          // Mensagem de erro amigável baseada no tipo de erro
          if (error.error?.message) {
            this.submitError = error.error.message;
          } else if (error.status === 400) {
            this.submitError =
              'Dados inválidos. Verifique os campos e tente novamente.';
          } else if (error.status === 409 || error.status === 500) {
            // Verifica se é erro de duplicação no corpo do erro
            const errorMessage = JSON.stringify(
              error.error || error.message || ''
            ).toLowerCase();

            if (
              errorMessage.includes('email') &&
              errorMessage.includes('already exists')
            ) {
              this.submitError =
                '❌ Este email já está cadastrado no sistema. Use outro email para a loja.';
            } else if (
              errorMessage.includes('cnpj') &&
              errorMessage.includes('already exists')
            ) {
              this.submitError = '❌ Este CNPJ já está cadastrado no sistema.';
            } else if (
              errorMessage.includes('cpf') &&
              errorMessage.includes('already exists')
            ) {
              this.submitError = '❌ Este CPF já está cadastrado no sistema.';
            } else if (
              errorMessage.includes('username') &&
              errorMessage.includes('already exists')
            ) {
              this.submitError =
                '❌ Este nome de usuário já está em uso. Escolha outro.';
            } else if (errorMessage.includes('duplicate key')) {
              this.submitError =
                '❌ Dados duplicados. Verifique se o email, CNPJ ou CPF já não estão cadastrados.';
            } else {
              this.submitError =
                'Erro ao cadastrar loja. Tente novamente ou contate o suporte.';
            }
          } else {
            this.submitError = 'Erro ao cadastrar loja. Tente novamente.';
          }

          return throwError(() => error);
        })
      )
      .subscribe({
        next: (createdStore: Store) => {
          console.log('🎉 Cadastro completo com sucesso!');
          this.isSubmitting = false;
          // Fecha dialog e retorna a store criada
          this.dialogRef.close(createdStore);
        },
        error: () => {
          // Erro já tratado no catchError
          this.isSubmitting = false;
        },
      });
  }

  /**
   * Prepara o payload da Store para envio
   * Se for ADMIN (filial), adiciona mainStoreId automaticamente
   *
   * IMPORTANTE:
   * - CAR_ADMIN cria MATRIZ → mainStoreId = null (não envia)
   * - ADMIN cria FILIAL → mainStoreId = obrigatório (storeId da matriz)
   */
  private prepareStorePayload(): any {
    const formValue = this.storeForm.value;

    const payload: any = {
      name: formValue.name,
      tradeName: formValue.tradeName || null,
      cnpj: formValue.cnpj.replace(/\D/g, ''), // Remove formatação
      email: formValue.email,
      phoneNumber: formValue.phoneNumber
        ? formValue.phoneNumber.replace(/\D/g, '')
        : null,
    };

    // Se não for CAR_ADMIN, é uma filial e precisa do mainStoreId
    if (!this.data.isCarAdmin) {
      // Busca o storeId do usuário logado (que é a matriz)
      const userStoreId = this.authService.getStoreId();

      // ⚠️ VALIDAÇÃO CRÍTICA: Backend exige mainStoreId para criar filial
      if (!userStoreId) {
        throw new Error(
          'Erro: não foi possível identificar a loja matriz. Faça login novamente.'
        );
      }

      console.log('🏢 Criando FILIAL da matriz:', userStoreId);
      payload.mainStoreId = userStoreId;
    } else {
      console.log('🏢 Criando MATRIZ (CAR_ADMIN)');
      // MATRIZ não envia mainStoreId (será null no backend)
    }

    console.log('📦 Payload da Store preparado:', payload);
    return payload;
  }

  /**
   * Prepara o payload da Person para envio
   * @param storeId ID da loja criada no passo anterior
   */
  private preparePersonPayload(storeId: string): any {
    const personValue = this.personForm.value;
    const accessValue = this.accessForm.value;

    return {
      storeId: storeId,
      name: personValue.name,
      nickName: personValue.nickName || null,
      email: personValue.email,
      phone: personValue.phone ? personValue.phone.replace(/\D/g, '') : null,
      legalEntity: personValue.legalEntity,
      cpf: personValue.legalEntity ? null : personValue.cpf?.replace(/\D/g, ''),
      cnpj: personValue.legalEntity
        ? personValue.cnpj?.replace(/\D/g, '')
        : null,
      rg: personValue.rg || null,
      rgIssuer: personValue.rgIssuer || null,
      ie: null,
      im: null,
      crc: null,
      active: true,
      username: accessValue.username,
      password: accessValue.password,
      roleName: 'ROLE_ADMIN', // Proprietário sempre é ADMIN da loja
      relationship: 'PROPRIETARIO', // Define como proprietário
    };
  }

  /**
   * Marca todos os campos de todos os formulários como touched
   * para exibir erros de validação
   */
  private markAllAsTouched(): void {
    Object.keys(this.storeForm.controls).forEach((key) => {
      this.storeForm.get(key)?.markAsTouched();
    });
    Object.keys(this.personForm.controls).forEach((key) => {
      this.personForm.get(key)?.markAsTouched();
    });
    Object.keys(this.accessForm.controls).forEach((key) => {
      this.accessForm.get(key)?.markAsTouched();
    });
  }

  /**
   * Retorna mensagem de erro de validação para um campo específico
   * @param form Formulário que contém o campo
   * @param fieldName Nome do campo
   */
  getErrorMessage(form: FormGroup, fieldName: string): string {
    const control = form.get(fieldName);

    if (control?.hasError('required')) {
      return 'Este campo é obrigatório';
    }

    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `Mínimo de ${minLength} caracteres`;
    }

    if (control?.hasError('maxlength')) {
      const maxLength = control.errors?.['maxlength'].requiredLength;
      return `Máximo de ${maxLength} caracteres`;
    }

    if (control?.hasError('email')) {
      return 'Email inválido';
    }

    return '';
  }
}
