import { Component, Inject, OnInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatStepperModule } from '@angular/material/stepper';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Store } from '@interfaces/store';
import { StoreService } from '@services/store.service';
import { PersonService } from '@services/person.service';
import { StoreContextService } from '@services/store-context.service';
import { FormDraftService, FormDraft } from '@services/form-draft.service';
import { ToastrService } from 'ngx-toastr';
import {
  SaveDraftDialogComponent,
  SaveDraftDialogResult,
} from '@components/dialogs/save-draft-dialog/save-draft-dialog.component';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PrimaryInputComponent } from '../../primary-input/primary-input.component';
import { catchError, switchMap, tap, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { of, throwError } from 'rxjs';

/**
 * Interface de dados para o dialog de cadastro de loja
 */
export interface StoreFormDialogData {
  title: string;
  mode: 'create' | 'edit';
  isCarAdmin?: boolean; // Define se usa endpoint de MATRIZ ou FILIAL
  store?: Store; // Para passar os dados na edição
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
    MatCardModule,
    MatSelectModule,
    MatTooltipModule,
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

  readonly FORM_TYPE = 'store';

  availableDrafts: FormDraft[] = [];
  selectedDraftId: string | null = null;
  lastSavedDraftValue: any = null;
  initialFormValues: any = null;
  showFormFields = false;

  // Estados de carregamento e erro
  isSubmitting = false;
  submitError: string | null = null;
  createdStoreInstance: Store | null = null;

  constructor(
    private fb: FormBuilder,
    private storeService: StoreService,
    private personService: PersonService,
    private storeContextService: StoreContextService,
    public dialogRef: MatDialogRef<StoreFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: StoreFormDialogData,
    private elementRef: ElementRef,
    private formDraftService: FormDraftService,
    private dialog: MatDialog,
    private toastrService: ToastrService,
  ) {}

  ngOnInit(): void {
    this.initForms();
    if (this.data.mode === 'edit' && this.data.store) {
      this.storeForm.patchValue({
        name: this.data.store.name,
        tradeName: this.data.store.tradeName,
        cnpj: this.data.store.cnpj,
        email: this.data.store.email,
        phoneNumber: this.data.store.phone,
      });
      this.showFormFields = true;

      // Monitora mudanças no formulário no modo de edição
      this.storeForm.valueChanges.subscribe(() => {
        this.captureInitialFormValue();
      });

      // Captura o estado inicial da edição (após aplicar os dados da loja)
      setTimeout(() => {
        this.captureInitialFormValue();
      }, 100);
    } else {
      this.loadAvailableDrafts();

      // Monitora mudanças nos formulários para controlar o estado dirty e hasChanges
      const formsChanges = () => {
        this.captureInitialFormValue();
      };

      this.storeForm.valueChanges.subscribe(() => {
        formsChanges();
        this.createdStoreInstance = null;
      });
      this.personForm.valueChanges.subscribe(formsChanges);
      this.accessForm.valueChanges.subscribe(formsChanges);

      // Captura o estado inicial vazio
      setTimeout(() => {
        this.captureInitialFormValue();
      }, 500);
    }

    // Inscreve para atualizar a lista de rascunhos se houver mudanças no localStorage
    this.formDraftService.draftsChanges.subscribe(() => {
      if (this.data.mode === 'create') {
        this.loadAvailableDrafts();
      }
    });

    // Validação de CNPJ em tempo real com debounce
    this.storeForm
      .get('cnpj')
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((cnpj) => {
          if (!cnpj) return of(false);
          const cleanCnpj = cnpj.replace(/\D/g, '');
          if (cleanCnpj.length !== 14) return of(false);
          return this.storeService.checkCnpjExists(cleanCnpj).pipe(catchError(() => of(false)));
        }),
      )
      .subscribe((exists) => {
        const control = this.storeForm.get('cnpj');
        if (exists) {
          control?.setErrors({ uniqueCnpj: true });
        } else {
          if (control?.hasError('uniqueCnpj')) {
            const errors = { ...control.errors };
            delete errors['uniqueCnpj'];
            control.setErrors(Object.keys(errors).length ? errors : null);
          }
        }
      });

    // Validação de E-mail de Usuário em tempo real com debounce
    this.accessForm
      .get('username')
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((email) => {
          if (!email || !email.includes('@') || email.length < 5) return of(false);
          return this.personService.checkUserEmailExists(email).pipe(catchError(() => of(false)));
        }),
      )
      .subscribe((exists) => {
        const control = this.accessForm.get('username');
        if (exists) {
          control?.setErrors({ uniqueEmail: true });
        } else {
          if (control?.hasError('uniqueEmail')) {
            const errors = { ...control.errors };
            delete errors['uniqueEmail'];
            control.setErrors(Object.keys(errors).length ? errors : null);
          }
        }
      });

    // Validação de Razão Social em tempo real com debounce
    this.storeForm
      .get('name')
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((name) => {
          if (!name || name.length < 3) return of(false);
          return this.storeService.checkNameExists(name).pipe(catchError(() => of(false)));
        }),
      )
      .subscribe((exists) => {
        const control = this.storeForm.get('name');
        if (exists) {
          control?.setErrors({ uniqueName: true });
        } else {
          if (control?.hasError('uniqueName')) {
            const errors = { ...control.errors };
            delete errors['uniqueName'];
            control.setErrors(Object.keys(errors).length ? errors : null);
          }
        }
      });

    // Validação de E-mail da Loja em tempo real com debounce
    this.storeForm
      .get('email')
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((email) => {
          if (!email || !email.includes('@') || email.length < 5) return of(false);
          return this.storeService.checkEmailExists(email).pipe(catchError(() => of(false)));
        }),
      )
      .subscribe((exists) => {
        const control = this.storeForm.get('email');
        if (exists) {
          control?.setErrors({ uniqueStoreEmail: true });
        } else {
          if (control?.hasError('uniqueStoreEmail')) {
            const errors = { ...control.errors };
            delete errors['uniqueStoreEmail'];
            control.setErrors(Object.keys(errors).length ? errors : null);
          }
        }
      });
  }

  /**
   * Move o scroll do diálogo para o passo ativo ao mudar de etapa
   */
  onStepChange(event: any): void {
    setTimeout(() => {
      const stepHeaders = this.elementRef.nativeElement.querySelectorAll('.mat-step-header');
      if (stepHeaders && stepHeaders[event.selectedIndex]) {
        stepHeaders[event.selectedIndex].scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    }, 250);
  }

  private getCurrentFormValue(): any {
    return {
      store: this.storeForm.value,
      person: this.personForm.value,
      access: this.accessForm.value,
    };
  }

  private captureInitialFormValue(): void {
    if (!this.initialFormValues) {
      this.initialFormValues = this.getCurrentFormValue();
    }
  }

  private normalizeValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? null : trimmed;
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeValue(item));
    }
    if (typeof value === 'object') {
      const normalized: any = {};
      for (const key of Object.keys(value)) {
        normalized[key] = this.normalizeValue(value[key]);
      }
      return normalized;
    }
    return value;
  }

  hasUnsavedChanges(): boolean {
    if (!this.initialFormValues) return false;
    const current = JSON.stringify(this.normalizeValue(this.getCurrentFormValue()));
    const initial = JSON.stringify(this.normalizeValue(this.initialFormValues));
    return current !== initial;
  }

  hasChangesComparedToDraft(): boolean {
    const source = this.lastSavedDraftValue;
    if (!source) {
      return this.hasUnsavedChanges();
    }
    const current = JSON.stringify(this.normalizeValue(this.getCurrentFormValue()));
    const lastSaved = JSON.stringify(this.normalizeValue(source));
    return current !== lastSaved;
  }

  get canShowDraftButton(): boolean {
    if (this.data.mode !== 'create') return false;
    const isDirty = this.storeForm.dirty || this.personForm.dirty || this.accessForm.dirty;
    return !this.isSubmitting && isDirty && this.hasChangesComparedToDraft();
  }

  private loadAvailableDrafts(): void {
    this.availableDrafts = this.formDraftService.getDraftsByType(this.FORM_TYPE);
    if (this.availableDrafts.length === 0) {
      this.showFormFields = true;
    } else if (this.selectedDraftId) {
      this.showFormFields = true;
    } else {
      this.showFormFields = false;
    }
  }

  onDraftSelected(event: any): void {
    const draftId = event.value;
    this.showFormFields = true;

    if (draftId === 'new') {
      this.resetForms();
      this.selectedDraftId = 'new';
      return;
    }

    const draft = this.availableDrafts.find((d) => d.id === draftId);
    if (!draft) {
      return;
    }

    this.loadDraftData(draft);
  }

  private loadDraftData(draft: FormDraft): void {
    this.selectedDraftId = draft.id;
    if (draft.data) {
      if (draft.data.store) this.storeForm.patchValue(draft.data.store);
      if (draft.data.person) this.personForm.patchValue(draft.data.person);
      if (draft.data.access) this.accessForm.patchValue(draft.data.access);
    }

    this.toastrService.success(`Rascunho "${draft.draftName || 'sem nome'}" carregado`);
    this.lastSavedDraftValue = this.getCurrentFormValue();

    // Marca os formulários como dirty
    setTimeout(() => {
      this.captureInitialFormValue();
      this.storeForm.markAsDirty();
      this.personForm.markAsDirty();
      this.accessForm.markAsDirty();
    }, 200);
  }

  saveLocalDraft(
    silent: boolean = false,
    draftName?: string,
    existingDraftId?: string,
    closeAfterSave: boolean = true,
  ): void {
    let effectiveEntityId = undefined;

    if (existingDraftId) {
      const prefix = `${this.FORM_TYPE}_`;
      if (existingDraftId.startsWith(prefix)) {
        effectiveEntityId = existingDraftId.replace(prefix, '') as any;
      }
    }

    const draftData = this.normalizeValue(this.getCurrentFormValue());
    const draftId = this.formDraftService.saveDraft(this.FORM_TYPE, draftData, effectiveEntityId, draftName);

    this.selectedDraftId = draftId;
    this.lastSavedDraftValue = this.getCurrentFormValue();

    if (!silent) {
      this.toastrService.info('Rascunho salvo localmente');
    }

    if (closeAfterSave) {
      this.dialogRef.close(null);
    } else {
      this.storeForm.markAsPristine();
      this.personForm.markAsPristine();
      this.accessForm.markAsPristine();
      this.captureInitialFormValue();
    }
  }

  openSaveDraftDialog(): void {
    if (this.selectedDraftId && this.selectedDraftId !== 'new') {
      const currentDraft = this.availableDrafts.find((d) => d.id === this.selectedDraftId);
      if (currentDraft) {
        this.saveLocalDraft(false, currentDraft.draftName, this.selectedDraftId, true);
        return;
      }
    }

    const rawName = this.storeForm.value.name;
    const suggestedName =
      rawName && typeof rawName === 'string' && rawName.trim()
        ? rawName.trim()
        : `Loja em ${new Date().toLocaleString()}`;

    const dialogRef = this.dialog.open(SaveDraftDialogComponent, {
      data: {
        title: 'Salvar Rascunho',
        suggestedName,
      },
    });

    dialogRef.afterClosed().subscribe((result: SaveDraftDialogResult) => {
      if (result && result.confirmed) {
        const nameExists = this.availableDrafts.some((d) => d.draftName === result.draftName);

        if (nameExists) {
          this.toastrService.error('Já existe um rascunho com este nome. Por favor, escolha outro.', 'Nome Duplicado');
          this.openSaveDraftDialog();
          return;
        }

        this.saveLocalDraft(false, result.draftName, undefined, true);
      }
    });
  }

  deleteDraft(draftId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    const draft = this.availableDrafts.find((d) => d.id === draftId);
    if (!draft) {
      return;
    }

    this.formDraftService.removeDraftById(draft.id);
    this.loadAvailableDrafts();

    if (this.selectedDraftId === draftId) {
      this.resetForms();
      this.selectedDraftId = null;
      this.showFormFields = this.availableDrafts.length === 0;
    }

    this.toastrService.success('Rascunho excluído');
  }

  private resetForms(): void {
    this.storeForm.reset();
    this.personForm.reset({
      legalEntity: false,
    });
    this.accessForm.reset();
    this.updatePersonDocumentValidation(false);
    this.initialFormValues = null;
    this.createdStoreInstance = null;
    this.captureInitialFormValue();
  }

  formatDraftDate(date: Date): string {
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
   * Inicializa os 3 formulários do wizard
   */
  private initForms(): void {
    // STEP 1: Formulário de dados da loja
    this.storeForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      tradeName: ['', [Validators.minLength(3), Validators.maxLength(50)]],
      cnpj: ['', [Validators.required, Validators.minLength(14), Validators.maxLength(14)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(50)]],
      phoneNumber: ['', [Validators.maxLength(20)]],
    });

    // STEP 2: Formulário de dados do proprietário
    this.personForm = this.fb.group({
      legalEntity: [false], // false = Pessoa Física, true = Pessoa Jurídica
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      nickName: ['', [Validators.minLength(3), Validators.maxLength(50)]],
      cpf: [''], // Validação condicional
      cnpj: [''], // Validação condicional
      rg: ['', [Validators.maxLength(14)]],
      rgIssuer: ['', [Validators.maxLength(14)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      phone: ['', [Validators.maxLength(14)]],
    });

    // STEP 3: Formulário de dados de acesso
    this.accessForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(20)]],
      confirmPassword: ['', [Validators.required]],
    });

    // Listener para alternar validação entre CPF e CNPJ
    this.personForm.get('legalEntity')?.valueChanges.subscribe((isLegalEntity) => {
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
      cnpjControl?.setValidators([Validators.required, Validators.minLength(14), Validators.maxLength(14)]);
    } else {
      // Pessoa Física: CPF obrigatório, CNPJ opcional
      cnpjControl?.clearValidators();
      cpfControl?.setValidators([Validators.required, Validators.minLength(11), Validators.maxLength(11)]);
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
    if (this.data.mode === 'edit') {
      this.submitEdit();
      return;
    }

    // Valida todos os formulários
    if (!this.storeForm.valid || !this.personForm.valid || !this.accessForm.valid) {
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
    console.log('🎯 Tipo de cadastro:', this.data.isCarAdmin ? 'MATRIZ' : 'FILIAL');
    console.log('📦 Payload que será enviado:', JSON.stringify(storePayload, null, 2));

    // PASSO 1: Criar Store (MATRIZ ou FILIAL baseado na role) ou usar a instância criada em tentativa anterior
    const createStoreObservable = this.createdStoreInstance
      ? of(this.createdStoreInstance)
      : (this.data.isCarAdmin
          ? this.storeService.createMainStore(storePayload) // CAR_ADMIN → POST /stores/mainstore
          : this.storeService.createBranch(storePayload)
        ) // ADMIN → POST /stores
          .pipe(
            tap((createdStore: Store) => {
              this.createdStoreInstance = createdStore;
              console.log('✅ Store criada e salva no estado:', createdStore);
            }),
          );

    createStoreObservable
      .pipe(
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
                  createdPerson.personId, // ✅ Agora extrai do objeto
                )
                .pipe(
                  tap({
                    next: (updatedStore) => {
                      console.log('✅ Proprietário vinculado com sucesso:', updatedStore);
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
                  switchMap(() => of(createdStore)),
                );
            }),
          );
        }),

        // Tratamento de erro
        catchError((error) => {
          console.error('❌ Erro no cadastro:', error);
          this.isSubmitting = false;

          let extractedErrorMessage = '';

          // Trata array de erros de validação (Spring Boot @Valid)
          if (Array.isArray(error.error)) {
            const messages = error.error.map((err: any) => err.defaultMessage).filter(Boolean);
            if (messages.length > 0) {
              extractedErrorMessage = messages.join(' | ');
            }
          }

          // Mensagem de erro amigável baseada no tipo de erro
          if (extractedErrorMessage) {
            this.submitError = extractedErrorMessage;
          } else if (error.error?.message) {
            this.submitError = error.error.message;
          } else if (error.status === 400) {
            this.submitError = 'Dados inválidos. Verifique os campos e tente novamente.';
          } else if (error.status === 409 || error.status === 500) {
            // Verifica se é erro de duplicação no corpo do erro
            const errorMessage = JSON.stringify(error.error || error.message || '').toLowerCase();

            if (errorMessage.includes('email') && errorMessage.includes('already exists')) {
              this.submitError = '❌ Este email já está cadastrado no sistema. Use outro email para a loja.';
            } else if (errorMessage.includes('cnpj') && errorMessage.includes('already exists')) {
              this.submitError = '❌ Este CNPJ já está cadastrado no sistema.';
            } else if (errorMessage.includes('cpf') && errorMessage.includes('already exists')) {
              this.submitError = '❌ Este CPF já está cadastrado no sistema.';
            } else if (errorMessage.includes('username') && errorMessage.includes('already exists')) {
              this.submitError = '❌ Este nome de usuário já está em uso. Escolha outro.';
            } else if (errorMessage.includes('duplicate key')) {
              this.submitError = '❌ Dados duplicados. Verifique se o email, CNPJ ou CPF já não estão cadastrados.';
            } else {
              this.submitError = 'Erro ao cadastrar loja. Tente novamente ou contate o suporte.';
            }
          } else {
            this.submitError = 'Erro ao cadastrar loja. Tente novamente.';
          }

          // Feedback visual via Toastr (notificação flutuante para evitar problemas de scroll)
          if (this.submitError) {
            const cleanMessage = this.submitError.replace(/^[❌\s]+/, '');
            this.toastrService.error(cleanMessage, 'Erro no Cadastro', {
              timeOut: 5000,
              progressBar: true,
              closeButton: true,
            });
          }

          return throwError(() => error);
        }),
      )
      .subscribe({
        next: (createdStore: Store) => {
          console.log('🎉 Cadastro completo com sucesso!');
          this.isSubmitting = false;
          // Notifica o sistema que uma nova loja foi adicionada
          this.storeService.notifyStoreUpdated();

          // Remove o rascunho ativo se aplicável
          if (this.selectedDraftId && this.selectedDraftId !== 'new') {
            this.formDraftService.removeDraftById(this.selectedDraftId);
          }

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
      phoneNumber: formValue.phoneNumber ? formValue.phoneNumber.replace(/\D/g, '') : null,
    };

    // Se não for CAR_ADMIN, é uma filial e precisa do mainStoreId
    if (!this.data.isCarAdmin) {
      // Busca o storeId do usuário logado (que é a matriz)
      const userStoreId = this.storeContextService.currentStoreId;

      // ⚠️ VALIDAÇÃO CRÍTICA: Backend exige mainStoreId para criar filial
      if (!userStoreId) {
        throw new Error('Erro: não foi possível identificar a loja matriz. Faça login novamente.');
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
      cnpj: personValue.legalEntity ? personValue.cnpj?.replace(/\D/g, '') : null,
      rg: personValue.rg || null,
      rgIssuer: personValue.rgIssuer || null,
      ie: null,
      im: null,
      crc: null,
      active: true,
      userEmail: accessValue.username,
      password: accessValue.password,
      relationshipId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
      isEmployee: true,
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
   * Retorna mensagem de erro customizada para o CNPJ da loja
   */
  getCnpjErrorMessage(): string {
    const control = this.storeForm.get('cnpj');
    if (control?.hasError('required')) return 'Este campo é obrigatório';
    if (control?.hasError('minlength') || control?.hasError('maxlength')) return 'O CNPJ deve ter 14 dígitos';
    if (control?.hasError('uniqueCnpj')) return 'CNPJ já cadastrado no sistema';
    return '';
  }

  /**
   * Retorna mensagem de erro customizada para o e-mail de acesso
   */
  getUsernameErrorMessage(): string {
    const control = this.accessForm.get('username');
    if (control?.hasError('required')) return 'Este campo é obrigatório';
    if (control?.hasError('minlength')) return 'Mínimo de 3 caracteres';
    if (control?.hasError('uniqueEmail')) return 'E-mail de usuário já cadastrado';
    return '';
  }

  /**
   * Retorna mensagem de erro customizada para a Razão Social
   */
  getNameErrorMessage(): string {
    const control = this.storeForm.get('name');
    if (control?.hasError('required')) return 'Este campo é obrigatório';
    if (control?.hasError('minlength')) return 'Mínimo de 3 caracteres';
    if (control?.hasError('uniqueName')) return 'Razão Social já cadastrada no sistema';
    return '';
  }

  /**
   * Retorna mensagem de erro customizada para o e-mail da loja
   */
  getStoreEmailErrorMessage(): string {
    const control = this.storeForm.get('email');
    if (control?.hasError('required')) return 'Este campo é obrigatório';
    if (control?.hasError('email')) return 'Formato de e-mail inválido';
    if (control?.hasError('uniqueStoreEmail')) return 'E-mail da loja já cadastrado';
    return '';
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

  private submitEdit(): void {
    if (!this.storeForm.valid) {
      Object.keys(this.storeForm.controls).forEach((key) => {
        this.storeForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    this.submitError = null;

    let storePayload;
    try {
      storePayload = this.prepareStorePayload();
    } catch (error: any) {
      this.submitError = error.message || 'Erro ao preparar dados da loja';
      this.isSubmitting = false;
      return;
    }

    console.log('🔧 Editando loja ID:', this.data.store?.storeId);
    console.log('📦 Payload de edição:', storePayload);

    const updateObservable = this.data.isCarAdmin
      ? this.storeService.updateMainStore(this.data.store!.storeId!, storePayload)
      : this.storeService.update(this.data.store!.storeId!, storePayload);

    updateObservable.subscribe({
      next: (updatedStore) => {
        console.log('✅ Loja editada com sucesso:', updatedStore);
        this.isSubmitting = false;
        this.storeService.notifyStoreUpdated();
        this.dialogRef.close(updatedStore);
      },
      error: (error) => {
        console.error('❌ Erro na edição:', error);
        this.isSubmitting = false;
        if (error.error?.message) {
          this.submitError = error.error.message;
        } else if (error.status === 400) {
          this.submitError = 'Dados inválidos. Verifique os campos e tente novamente.';
        } else {
          this.submitError = 'Erro ao editar loja. Tente novamente.';
        }
      },
    });
  }
}
