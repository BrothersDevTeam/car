import { Component, inject, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CreateLegalEntity, Person } from '@interfaces/entity';
import { PersonService } from '@services/person.service';

import { MatButtonModule } from '@angular/material/button';

import { PrimaryInputComponent } from '@components/primary-input/primary-input.component';
import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';

@Component({
  selector: 'app-create-legal-entity-form',
   imports: [PrimaryInputComponent, ReactiveFormsModule, WrapperCardComponent, MatButtonModule ],
  templateUrl: './create-legal-entity-form.component.html',
  styleUrl: './create-legal-entity-form.component.scss'
})
export class CreateLegalEntityFormComponent implements OnChanges {
 submitted = false;

 @Input() dataForm: Person | null = null;

  private formBuilderService = inject(FormBuilder);

  protected form = this.formBuilderService.group({
    legalName: [this.dataForm?.person.legalName || '', Validators.required],
    tradeName: [''],
    contact: this.formBuilderService.group({
      email: ['', [Validators.email]],
      phone: ['']
    }),
    cnpj: [''],
    ie: [''],
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

  constructor(private personService: PersonService) {}

  ngOnChanges(changes: SimpleChanges) {
      if (changes['dataForm'] && this.dataForm) {
        this.form.patchValue({
          legalName: this.dataForm.person.legalName || '',
          tradeName: this.dataForm.person.tradeName || '',
          contact: {
            email: this.dataForm.person.contact?.email || '',
            phone: this.dataForm.person.contact?.phone || ''
          },
          cnpj: this.dataForm.person.cpf || '',
          ie: this.dataForm.person.ie || '',
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
    const formValue: CreateLegalEntity = {
      legalName: this.form.value.legalName || '',
      tradeName: this.form.value.tradeName || '',
      cnpj: this.form.value.cnpj || '',
      ie: this.form.value.ie || '',
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

    this.personService.create(formValue);
  }
}
