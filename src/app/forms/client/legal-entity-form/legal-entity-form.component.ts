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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

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
      [],
      {
        validators: [minLengthArray(1)],
      }
    ),
    username: [''],
    password: [''],
    roleName: [''],
  });

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
    private cepService: CepService,
    private actionsService: ActionsService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.subscriptions.add(
      this.form.get('relationshipTypes')!.valueChanges.subscribe(() => {
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
    const roleNameControl = this.form.get('roleName');

    if (this.shouldShowUserFields) {
      usernameControl?.setValidators([Validators.required, Validators.minLength(3)]);
      passwordControl?.setValidators([Validators.required, Validators.minLength(6)]);
      roleNameControl?.setValidators([Validators.required]);

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
    this.subscriptions.unsubscribe(); // Limpa as inscrições para evitar vazamentos de memória
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
          cnpj: this.dataForm!.cnpj || '',
          ie: this.dataForm!.ie || '',
        });
      });
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
      // Marca todos os controles como "touched" para que os erros sejam exibidos
      this.form.markAllAsTouched();
      console.log('Formulário inválido: ', this.form.value);
      // NOVO: Logs específicos para campos obrigatórios (igual ao natural-person)
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

    const toStringOrUndefined = (value: any): string | undefined => {
      if (value === null || value === undefined || value === '') {
        return undefined;
      }
      return String(value);
    };

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
      const formCleaned = removeEmptyPropertiesFromObject<CreateLegalEntity>(
        formValue as Person
      );
      this.personService.create(formCleaned).subscribe({
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
      legalEntity: true,
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
