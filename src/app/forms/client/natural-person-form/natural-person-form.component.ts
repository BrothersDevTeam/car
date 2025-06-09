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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ToastrService } from 'ngx-toastr';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { PersonService } from '@services/person.service';
import { CreateNaturalPerson, Person } from '@interfaces/person';

import { CepService } from '@services/cep.service';
import { CpfValidatorDirective } from '@directives/cpf-validator.directive';
import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';
import { PrimaryInputComponent } from '@components/primary-input/primary-input.component';

import { ActionsService } from '@services/actions.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-natural-person-form',
  imports: [
    PrimaryInputComponent,
    ReactiveFormsModule,
    WrapperCardComponent,
    MatButtonModule,
    MatIconModule,
    CpfValidatorDirective,
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
    fullName: ['', Validators.required],
    tradeName: [''],
    contact: this.formBuilderService.group({
      email: ['', [Validators.email]],
      phone: [''],
    }),
    cpf: [''],
    address: this.formBuilderService.group({
      zipcode: [''],
      street: [''],
      number: [''],
      complement: [''],
      state: [''],
      city: [''],
      neighborhood: [''],
    }),
  });

  constructor(
    private personService: PersonService,
    private toastrService: ToastrService,
    private cepService: CepService,
    private actionsService: ActionsService
  ) {}

  ngOnInit() {
    this.subscriptions.add(
      this.form.valueChanges.subscribe(() => {
        const isDirty = this.form.dirty;
        this.actionsService.hasFormChanges.set(isDirty);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe(); // Limpa as inscrições para evitar vazamentos de memória
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['dataForm'] && this.dataForm) {
      setTimeout(() => {
        this.form.patchValue({
          fullName: this.dataForm!.person.fullName || '',
          contact: {
            email: this.dataForm!.person.contact?.email || '',
            phone: this.dataForm!.person.contact?.phone || '',
          },
          cpf: this.dataForm!.person.cpf || '',
          address: {
            zipcode: this.dataForm!.person.address?.zipcode || '',
            street: this.dataForm!.person.address?.street || '',
            number: this.dataForm!.person.address?.number || '',
            complement: this.dataForm!.person.address?.complement || '',
            state: this.dataForm!.person.address?.state || '',
            city: this.dataForm!.person.address?.city || '',
            neighborhood: this.dataForm!.person.address?.neighborhood || '',
          },
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
      return;
    }

    const formValue: CreateNaturalPerson = {
      fullName: this.form.value.fullName || '',
      cpf: this.form.value.cpf?.replace(/\D/g, '') || '',
      active: true,
      contact: {
        email: this.form.value.contact?.email || '',
        phone: this.form.value.contact?.phone?.replace(/\D/g, '') || '',
      },
      address: {
        zipcode: this.form.value.address?.zipcode || '',
        street: this.form.value.address?.street || '',
        number: this.form.value.address?.number || '',
        complement: this.form.value.address?.complement || '',
        state: this.form.value.address?.state || '',
        city: this.form.value.address?.city || '',
        neighborhood: this.form.value.address?.neighborhood || '',
      },
    };

    if (this.dataForm?.id) {
      this.personService.update(formValue, this.dataForm.id).subscribe({
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
      this.personService.create(formValue).subscribe({
        next: () => {
          this.toastrService.success('Cadastro realizado com sucesso');
          this.formSubmitted.emit();
        },
        error: () =>
          this.toastrService.error(
            'Erro inesperado! Tente novamente mais tarde'
          ),
      });
    }
  }

  getAddressByCep() {
    console.log('Buscando endereço pelo CEP');
    const cep = this.form.value.address?.zipcode || '';
    this.cepService
      .getAddressByCep(cep)
      .then((data) => {
        console.log('DATA: ', data);
        if (!data.erro) {
          this.form.patchValue({
            address: {
              street: data.logradouro.toUpperCase(),
              complement: data.complemento.toUpperCase(),
              state: data.uf.toUpperCase(),
              city: data.localidade.toUpperCase(),
              neighborhood: data.bairro.toUpperCase(),
            },
          });
        } else {
          console.error('Erro ao buscar endereço pelo CEP: ');
          this.form.get('address.zipcode')?.setErrors({ invalidCep: true });
          this.toastrService.error(
            'CEP inválido. Por favor, verifique e tente novamente.'
          );
        }
      })
      .catch((error) => {
        console.error('Erro ao buscar endereço pelo CEP: ', error);
      });
  }

  isCepValid(): boolean {
    const cepControl = this.form.get('address.zipcode');
    return cepControl?.valid && cepControl?.value?.length === 9 ? true : false;
  }
}
