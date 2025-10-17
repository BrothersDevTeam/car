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
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';

import { ToastrService } from 'ngx-toastr';

import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';
import { PrimaryInputComponent } from '@components/primary-input/primary-input.component';

import type { CreateLegalEntity, Person } from '@interfaces/person';

import { CepService } from '@services/cep.service';
import { PersonService } from '@services/person.service';
import { ActionsService } from '@services/actions.service';
import { AuthService } from '@services/auth/auth.service';
import { CnpjValidatorDirective } from '@directives/cnpj-validator.directive';
import { PrimarySelectComponent } from '@components/primary-select/primary-select.component';
import { minLengthArray } from '../../../utils/minLengthArray';
import { removeEmptyPropertiesFromObject } from '../../../utils/removeEmptyPropertiesFromObject';
import { Subscription } from 'rxjs';
import { RelationshipTypes } from '../../../enums/relationshipTypes';

@Component({
  selector: 'app-legal-entity-form',
  imports: [
    PrimaryInputComponent,
    ReactiveFormsModule,
    WrapperCardComponent,
    MatButtonModule,
    MatIconModule,
    CnpjValidatorDirective,
    PrimarySelectComponent,
  ],
  templateUrl: './legal-entity-form.component.html',
  styleUrl: './legal-entity-form.component.scss',
})
export class LegalEntityFormComponent implements OnInit, OnChanges, OnDestroy {
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
   * Formulário reativo para cadastro/edição de pessoa jurídica
   * 
   * IMPORTANTE: relationshipTypes começa VAZIO e só recebe valor padrão
   * [CLIENTE] se estiver CRIANDO uma nova pessoa (não editando).
   */
  protected form = this.formBuilderService.group({
    name: [this.dataForm?.name || '', Validators.required],
    nickName: [''],
    email: ['', [Validators.email]],
    phone: [''],
    cnpj: [''],
    ie: [''],
    crc: [''],
    active: [true],
    storeId: [''],
    legalEntity: [true],
    relationshipTypes: this.formBuilderService.control<RelationshipTypes[]>(
      [], // ← Começa VAZIO
      {
        validators: [minLengthArray(1)],
      }
    ),
    username: [''],
    password: [''],
    confirmPassword: [''],
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
      const errors = confirmPassword.errors;
      if (errors) {
        delete errors['passwordMismatch'];
        confirmPassword.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }
    }

    return null;
  }

  get shouldShowUserFields(): boolean {
    const selectedTypes = this.form.get('relationshipTypes')?.value || [];
    return selectedTypes.some((type: RelationshipTypes) =>
      [RelationshipTypes.PROPRIETARIO, RelationshipTypes.FUNCIONARIO]
        .includes(type)
    );
  }

  constructor(
    private personService: PersonService,
    private toastrService: ToastrService,
    private cepService: CepService,
    private actionsService: ActionsService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    /**
     * Define o valor padrão de relationshipTypes apenas se NÃO estiver editando
     */
    if (!this.dataForm) {
      this.form.get('relationshipTypes')?.setValue([RelationshipTypes.CLIENTE]);
    }

    // Adiciona o validator de senha no formulário
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

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Detecta mudanças no @Input dataForm (quando está editando)
   * 
   * IMPORTANTE: O backend envia 'relationships', mapeamos para 'relationshipTypes'!
   */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['dataForm'] && this.dataForm) {
      console.log('[legal-entity-form] dataForm recebido:', this.dataForm);
      console.log('[legal-entity-form] relationshipTypes do banco:', this.dataForm.relationshipTypes);
      console.log('[legal-entity-form] relationships do banco:', (this.dataForm as any).relationships);
      
      /**
       * Mapeia relationships do backend para relationshipTypes do frontend
       */
      const relationshipsFromBackend = (this.dataForm as any).relationships || [];
      const relationshipTypes = relationshipsFromBackend.map((rel: any) => rel.relationshipName);
      
      console.log('[legal-entity-form] relationshipTypes mapeado:', relationshipTypes);
      
      /**
       * Aumentado o timeout para garantir sincronização com as opções
       */
      setTimeout(() => {
        this.form.patchValue({
          name: this.dataForm!.name || '',
          relationshipTypes: relationshipTypes.length > 0 ? relationshipTypes : [],
          nickName: this.dataForm!.nickName || '',
          email: this.dataForm!.email || '',
          phone: this.dataForm!.phone || '',
          cnpj: this.dataForm!.cnpj || '',
          ie: this.dataForm!.ie || '',
        });
        
        console.log('[legal-entity-form] Formulário após patchValue:', this.form.value);
        console.log('[legal-entity-form] relationshipTypes após patchValue:', this.form.get('relationshipTypes')?.value);
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      console.log('Formulário inválido: ', this.form.value);
      
      if (this.form.get('relationshipTypes')?.invalid) {
        console.log('RelationshipTypes é obrigatório e deve ter pelo menos 1 item');
      }
      if (this.shouldShowUserFields) {
        if (this.form.get('username')?.invalid) {
          console.log('Username é obrigatório para funcionários/contadores/proprietários');
        }
        if (this.form.get('password')?.invalid) {
          console.log('Password é obrigatório para funcionários/contadores/proprietários');
        }
        if (this.form.get('confirmPassword')?.invalid) {
          console.log('Confirmação de senha é obrigatória');
        }
        if (this.form.errors?.['passwordMismatch']) {
          console.log('As senhas não coincidem');
        }
        if (this.form.get('roleName')?.invalid) {
          console.log('RoleName é obrigatório para funcionários/contadores/proprietários');
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
      nickName: this.form.value.nickName || '',
      cnpj: this.form.value.cnpj?.replace(/\D/g, '') || '',
      ie: this.form.value.ie || '',
      active: true as const,
      email: this.form.value.email || '',
      phone: this.form.value.phone?.replace(/\D/g, '') || '',
      storeId,
      legalEntity: true as const,
      crc: this.form.value.crc || '',
      relationshipTypes: this.form.value.relationshipTypes as RelationshipTypes[],
    };

    let formValue: CreateLegalEntity;

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
      const formCleaned = removeEmptyPropertiesFromObject<CreateLegalEntity>(
        formValue as Person
      );
      console.log('Dados limpos:', formCleaned);
      this.personService.create(formCleaned).subscribe({
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

  private resetForm() {
    this.form.reset();
    this.submitted = false;

    this.form.get('relationshipTypes')?.setValue([RelationshipTypes.CLIENTE]);

    this.form.patchValue({
      active: true,
      legalEntity: true,
    });
  }
}
