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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

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
      [], //TODO: Criar campo no formulário para selecionar o tipo de relacionamento
      {
        validators: [minLengthArray(1)], // pelo menos 1 selecionado
      }
    ),
    username: [''],
    password: [''],
    roleName: [''],
  });

  // Adicione o getter para verificar se deve mostrar campos de usuário
  get shouldShowUserFields(): boolean {
    const selectedTypes = this.form.get('relationshipTypes')?.value || [];
    return selectedTypes.some((type: RelationshipTypes) =>
      [RelationshipTypes.PROPRIETARIO, RelationshipTypes.FUNCIONARIO, RelationshipTypes.CONTADOR]
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
    // CORRIGIDO: Observar apenas mudanças no relationshipTypes para evitar loops infinitos
    this.subscriptions.add(
      this.form.get('relationshipTypes')!.valueChanges.subscribe(() => {
        this.updateConditionalValidators();
      })
    );

    // CORRIGIDO: Observar outras mudanças sem acionar validações condicionais
    this.subscriptions.add(
      this.form.valueChanges.subscribe(() => {
        const isDirty = this.form.dirty;
        this.actionsService.hasFormChanges.set(isDirty);
        this.formChanged.emit(isDirty);
      })
    );
  }

  // CORRIGIDO: Método otimizado para evitar loops infinitos
  private updateConditionalValidators() {
    if (!this.form) return;

    const usernameControl = this.form.get('username');
    const passwordControl = this.form.get('password');
    const roleNameControl = this.form.get('roleName');

    if (this.shouldShowUserFields) {
      // Adicionar validações quando mostrar campos de usuário
      usernameControl?.setValidators([Validators.required, Validators.minLength(3)]);
      passwordControl?.setValidators([Validators.required, Validators.minLength(6)]);
      roleNameControl?.setValidators([Validators.required]);

      // Atualizar sem emitir eventos para evitar loops
      usernameControl?.updateValueAndValidity({ emitEvent: false });
      passwordControl?.updateValueAndValidity({ emitEvent: false });
      roleNameControl?.updateValueAndValidity({ emitEvent: false });
    } else {
      // Remover validações quando ocultar campos
      usernameControl?.clearValidators();
      passwordControl?.clearValidators();
      roleNameControl?.clearValidators();

      // Limpar valores sem emitir eventos
      usernameControl?.setValue('', { emitEvent: false });
      passwordControl?.setValue('', { emitEvent: false });
      roleNameControl?.setValue('', { emitEvent: false });

      // Atualizar sem emitir eventos para evitar loops
      usernameControl?.updateValueAndValidity({ emitEvent: false });
      passwordControl?.updateValueAndValidity({ emitEvent: false });
      roleNameControl?.updateValueAndValidity({ emitEvent: false });
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['dataForm'] && this.dataForm) {
      setTimeout(() => {
        this.form.patchValue({
          name: this.dataForm!.name || '',
          relationshipTypes: this.dataForm!.relationshipTypes || [],
          nickName: this.dataForm!.nickName || '',
          email: this.dataForm!.email || '',
          phone: this.dataForm!.phone || '',
          cpf: this.dataForm!.cpf || '',
          rg: this.dataForm!.rg || '',
          rgIssuer: this.dataForm!.rgIssuer || '',
        });
      });
    }
  }

  onEnter(event: Event): void {
    if (event instanceof KeyboardEvent) {
      event.preventDefault(); // Impede o comportamento padrão do Enter

      if (
        this.form.valid &&
        document.activeElement === this.submitButton.nativeElement
      ) {
        this.onSubmit();
      }

      if (this.form.valid && this.submitButton) {
        this.submitButton.nativeElement.focus(); // Define o foco no botão de submit
      }
    }
  }

  onSubmit() {
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      console.log('Formulário inválido: ', this.form.value);
      // Log específico para relationshipTypes se inválido
      if (this.form.get('relationshipTypes')?.invalid) {
        console.log(
          'RelationshipTypes é obrigatório e deve ter pelo menos 1 item'
        );
      }
      // NOVO: Logs específicos para campos de usuário condicionais
      if (this.shouldShowUserFields) {
        if (this.form.get('username')?.invalid) {
          console.log('Username é obrigatório para funcionários/contadores/proprietários');
        }
        if (this.form.get('password')?.invalid) {
          console.log('Password é obrigatório para funcionários/contadores/proprietários');
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

    // CORRIGIDO: Função helper para garantir tipos corretos
    const toStringOrUndefined = (value: any): string | undefined => {
      if (value === null || value === undefined || value === '') {
        return undefined;
      }
      return String(value);
    };

    // CORRIGIDO: Construir dados base
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

    // CORRIGIDO: Construir formValue com tipos garantidos
    let formValue: CreateNaturalPerson;

    if (this.shouldShowUserFields) {
      formValue = {
        ...baseData,
        username: toStringOrUndefined(this.form.value.username),
        password: toStringOrUndefined(this.form.value.password),
        roleName: toStringOrUndefined(this.form.value.roleName),
      };
    } else {
      formValue = baseData;
    }

    if (this.dataForm?.personId) {
      this.personService.update(formValue, this.dataForm.personId).subscribe({
        next: () => {
          this.toastrService.success('Atualização feita com sucesso');
          this.formSubmitted.emit();
        },
        error: () =>
          this.toastrService.error(
            'Erro inesperado! Tente novamente mais tarde'
          ),
      });
    } else {
      const clean = removeEmptyPropertiesFromObject<CreateNaturalPerson>(
        formValue as Person
      );
      this.personService.create(clean).subscribe({
        next: () => {
          this.toastrService.success('Cadastro realizado com sucesso');
          this.formSubmitted.emit();
          this.resetForm();
        },
        error: () =>
          this.toastrService.error(
            'Erro inesperado! Tente novamente mais tarde'
          ),
      });
    }
  }

  private resetForm() {
    this.form.reset();
    this.submitted = false;

    this.form.get('relationshipTypes')?.setValue([]);

    this.form.patchValue({
      active: true,
      legalEntity: false,
    });
  }

  // getAddressByCep() {
  //   console.log('Buscando endereço pelo CEP');
  //   const cep = this.form.value.address?.zipcode || '';
  //   this.cepService
  //     .getAddressByCep(cep)
  //     .then((data) => {
  //       console.log('DATA: ', data);
  //       if (!data.erro) {
  //         this.form.patchValue({
  //           address: {
  //             street: data.logradouro.toUpperCase(),
  //             complement: data.complemento.toUpperCase(),
  //             state: data.uf.toUpperCase(),
  //             city: data.localidade.toUpperCase(),
  //             neighborhood: data.bairro.toUpperCase(),
  //           },
  //         });
  //       } else {
  //         console.error('Erro ao buscar endereço pelo CEP: ');
  //         this.form.get('address.zipcode')?.setErrors({ invalidCep: true });
  //         this.toastrService.error(
  //           'CEP inválido. Por favor, verifique e tente novamente.'
  //         );
  //       }
  //     })
  //     .catch((error) => {
  //       console.error('Erro ao buscar endereço pelo CEP: ', error);
  //     });
  // }

  // isCepValid(): boolean {
  //   const cepControl = this.form.get('address.zipcode');
  //   return cepControl?.valid && cepControl?.value?.length === 9 ? true : false;
  // }
}
