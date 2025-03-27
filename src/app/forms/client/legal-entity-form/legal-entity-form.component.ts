import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

import { PrimaryInputComponent } from '@components/primary-input/primary-input.component';
import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';
import { DialogComponent } from '@components/dialog/dialog.component';

import type { CreateLegalEntity, Person } from '@interfaces/person';

import { PersonService } from '@services/person.service';
import { CepService } from '@services/cep.service';
import { ActionsService } from '@services/actions.service';

@Component({
  selector: 'app-legal-entity-form',
  imports: [
    PrimaryInputComponent,
    ReactiveFormsModule,
    WrapperCardComponent,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './legal-entity-form.component.html',
  styleUrl: './legal-entity-form.component.scss',
})
export class LegalEntityFormComponent implements OnInit, OnChanges {
  submitted = false;

  readonly dialog = inject(MatDialog);
  private formBuilderService = inject(FormBuilder);

  @Input() dataForm: Person | null = null;
  @Output() formSubmitted = new EventEmitter<void>();
  @Output() formChanged = new EventEmitter<boolean>();

  protected form = this.formBuilderService.group({
    legalName: [this.dataForm?.person.legalName || '', Validators.required],
    tradeName: [''],
    contact: this.formBuilderService.group({
      email: ['', [Validators.email]],
      phone: [''],
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
    // Inscreve-se no valueChanges para detectar mudanças no formulário
    this.form.valueChanges.subscribe(() => {
      const isDirty = this.form.dirty; // Verifica se o formulário foi modificado
      this.actionsService.hasFormChanges.set(isDirty);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['dataForm'] && this.dataForm) {
      setTimeout(() => {
        this.form.patchValue({
          legalName: this.dataForm!.person.legalName || '',
          tradeName: this.dataForm!.person.tradeName || '',
          contact: {
            email: this.dataForm!.person.contact?.email || '',
            phone: this.dataForm!.person.contact?.phone || '',
          },
          cnpj: this.dataForm!.person.cnpj || '',
          ie: this.dataForm!.person.ie || '',
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
      active: true,
      contact: {
        email: this.form.value.contact?.email || '',
        phone: this.form.value.contact?.phone || '',
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

  onDelete() {
    this.openDialog();
  }

  openDialog() {
    const dialogRef: MatDialogRef<DialogComponent> = this.dialog.open(
      DialogComponent,
      {
        data: {
          title: 'Confirmar Deleção',
          message: 'Você tem certeza que deseja deletar este registro?',
          confirmText: 'Sim',
          cancelText: 'Não',
        },
      }
    );

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.deleteConfirmed();
      }
    });
  }

  deleteConfirmed() {
    if (this.dataForm?.id) {
      this.personService.delete(this.dataForm.id).subscribe({
        next: (response) => {
          console.log('Deleção bem-sucedida', response);
          this.toastrService.success('Deleção bem-sucedida');
          this.formSubmitted.emit();
        },
        error: (error) => {
          console.error('Erro ao deletar cliente: ', error);
          this.toastrService.error('Erro ao deletar cliente');
        },
      });
    } else {
      console.error('ID não encontrado para deleção');
      this.toastrService.error('ID não encontrado para deleção');
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
