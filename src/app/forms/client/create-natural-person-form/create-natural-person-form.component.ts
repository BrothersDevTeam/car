import { Component, inject, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

import { CreateNaturalPerson, Person } from '@interfaces/entity';
import { PersonService } from '@services/person.service';

import { MatButtonModule } from '@angular/material/button';

import { PrimaryInputComponent } from '@components/primary-input/primary-input.component';
import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';

@Component({
  selector: 'app-create-natural-person-form',
  imports: [PrimaryInputComponent, ReactiveFormsModule, WrapperCardComponent, MatButtonModule ],
  templateUrl: './create-natural-person-form.component.html',
  styleUrl: './create-natural-person-form.component.scss'
})
export class CreateNaturalPersonFormComponent implements OnChanges {
  submitted = false;

  @Input() dataForm: Person | null = null;

  private formBuilderService = inject(FormBuilder);

  protected form = this.formBuilderService.group({
    fullName: ['', Validators.required],
    tradeName: [''],
    contact: this.formBuilderService.group({
      email: ['', [Validators.email]],
      phone: ['']
    }),
    cpf: [''],
    address: this.formBuilderService.group({
      zipcode: [''],
      street: [''],
      number: [''],
      complement: [''],
      state: [''],
      city: [''],
      neighborhood: ['']
    })
  });

  constructor( private personService: PersonService, private toastrService: ToastrService ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['dataForm'] && this.dataForm) {
      this.form.patchValue({
        fullName: this.dataForm.person.fullName || '',
        tradeName: this.dataForm.person.tradeName || '',
        contact: {
          email: this.dataForm.person.contact?.email || '',
          phone: this.dataForm.person.contact?.phone || ''
        },
        cpf: this.dataForm.person.cpf || '',
        address: {
          zipcode: this.dataForm.person.address?.zipcode || '',
          street: this.dataForm.person.address?.street || '',
          number: this.dataForm.person.address?.number || '',
          complement: this.dataForm.person.address?.complement || '',
          state: this.dataForm.person.address?.state || '',
          city: this.dataForm.person.address?.city || '',
          neighborhood: this.dataForm.person.address?.neighborhood || ''
        }
      });
    }
  }

  onSubmit() {
    this.submitted = true;
    if (this.form.invalid) {
      // Marca todos os controles como "touched" para que os erros sejam exibidos
      this.form.markAllAsTouched();
      console.log('Formulário inválido: ', this.form.value);
      return;
    }

    // Processar envio se válido
    const formValue: CreateNaturalPerson = {

      fullName: this.form.value.fullName || '',
      tradeName: this.form.value.tradeName || '',
      cpf: this.form.value.cpf || '',
      contact: {
        email: this.form.value.contact?.email || '',
        phone: this.form.value.contact?.phone || ''
      },
      address: {
        zipcode: this.form.value.address?.zipcode || '',
        street: this.form.value.address?.street || '',
        number: this.form.value.address?.number || '',
        complement: this.form.value.address?.complement || '',
        state: this.form.value.address?.state || '',
        city: this.form.value.address?.city || '',
        neighborhood: this.form.value.address?.neighborhood || ''
      }
    };

    if (this.dataForm?.id) {
      this.personService.update(formValue, this.dataForm.id).subscribe({
        next: () => {
          this.toastrService.success("Atualização feita com sucesso")},
        error: () => this.toastrService.error("Erro inesperado! Tente novamente mais tarde")
      })
    } else {
      this.personService.create(formValue).subscribe({
        next: () => {
          this.toastrService.success("Cadastro realizado com sucesso")},
        error: () => this.toastrService.error("Erro inesperado! Tente novamente mais tarde")
      })
    }
  }
}
