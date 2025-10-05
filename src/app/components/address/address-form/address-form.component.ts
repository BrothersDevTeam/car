import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';

import { PrimaryInputComponent } from '@components/primary-input/primary-input.component';
import { PrimarySelectComponent } from '@components/primary-select/primary-select.component';
import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';

import { AddressService } from '@services/address.service';
import { CepService } from '@services/cep.service';

import { Address, CreateAddress, UpdateAddress, ViaCepResponse } from '@interfaces/address';
import { AddressType, getAddressTypeOptions, BRAZILIAN_STATES, BrazilianState } from '../../../enums/addressTypes';

@Component({
  selector: 'app-address-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    PrimaryInputComponent,
    PrimarySelectComponent,
    WrapperCardComponent,
  ],
  templateUrl: './address-form.component.html',
  styleUrl: './address-form.component.scss'
})
export class AddressFormComponent implements OnInit, OnChanges {
  @Input() personId!: string;
  @Input() address: Address | null = null;
  @Output() formSubmitted = new EventEmitter<void>();
  @Output() formCancelled = new EventEmitter<void>();

  submitted = false;
  loadingCep = false;

  addressTypeOptions = getAddressTypeOptions();
  stateOptions = BRAZILIAN_STATES.map((uf: BrazilianState) => ({ value: uf, label: uf }));

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private addressService: AddressService,
    private cepService: CepService,
    private toastr: ToastrService
  ) {
    this.form = this.fb.group({
      addressType: [AddressType.RESIDENCIAL, Validators.required],
      cep: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(9)]],
      street: ['', [Validators.required, Validators.maxLength(100)]],
      number: ['', Validators.maxLength(10)],
      complement: ['', Validators.maxLength(100)],
      neighborhood: ['', [Validators.required, Validators.maxLength(100)]],
      city: ['', [Validators.required, Validators.maxLength(100)]],
      state: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(2)]],
      country: ['Brasil'],
      mainAddress: [false],
      active: [true, Validators.required],
    });
  }

  ngOnInit() {
    if (this.address) {
      this.form.patchValue({
        addressType: this.address.addressType,
        cep: this.addressService.formatCep(this.address.cep),
        street: this.address.street,
        number: this.address.number || '',
        complement: this.address.complement || '',
        neighborhood: this.address.neighborhood,
        city: this.address.city,
        state: this.address.state,
        country: this.address.country || 'Brasil',
        mainAddress: this.address.mainAddress || false,
        active: this.address.active,
      });
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['address'] && this.address && !changes['address'].firstChange) {
      this.ngOnInit();
    }
  }

  get isEditMode(): boolean {
    return !!this.address?.addressId;
  }

  onCepBlur() {
    const cep = this.form.get('cep')?.value;
    if (!cep || cep.length < 8) return;

    const cleanCep = this.addressService.cleanCep(cep);
    
    if (!this.addressService.isValidCep(cleanCep)) {
      this.toastr.error('CEP inválido');
      return;
    }

    this.loadingCep = true;
    this.cepService.getAddressByCep(cleanCep).subscribe({
      next: (data: ViaCepResponse) => {
        if (data.erro) {
          this.toastr.error('CEP não encontrado');
          this.loadingCep = false;
          return;
        }

        this.form.patchValue({
          street: data.logradouro || '',
          complement: data.complemento || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || '',
        });

        this.toastr.success('Endereço preenchido automaticamente');
        this.loadingCep = false;
      },
      error: () => {
        this.toastr.error('Erro ao buscar CEP');
        this.loadingCep = false;
      }
    });
  }

  onSubmit() {
    this.submitted = true;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.error('Preencha todos os campos obrigatórios');
      return;
    }

    const formValue = this.form.value;
    const cepClean = this.addressService.cleanCep(formValue.cep || '');

    if (this.isEditMode) {
      const updateData: UpdateAddress = {
        addressType: formValue.addressType as AddressType,
        cep: cepClean,
        street: formValue.street || '',
        number: formValue.number || undefined,
        complement: formValue.complement || undefined,
        neighborhood: formValue.neighborhood || '',
        city: formValue.city || '',
        state: formValue.state as BrazilianState,
        country: formValue.country || 'Brasil',
        mainAddress: formValue.mainAddress || false,
        active: formValue.active ?? true,
      };

      this.addressService.update(this.address!.addressId!, updateData).subscribe({
        next: () => {
          this.toastr.success('Endereço atualizado com sucesso');
          this.formSubmitted.emit();
          this.resetForm();
        },
        error: (err) => {
          console.error('Erro ao atualizar:', err);
          this.toastr.error('Erro ao atualizar endereço');
        }
      });
    } else {
      const newAddress: CreateAddress = {
        personId: this.personId,
        addressType: formValue.addressType as AddressType,
        cep: cepClean,
        street: formValue.street || '',
        number: formValue.number || undefined,
        complement: formValue.complement || undefined,
        neighborhood: formValue.neighborhood || '',
        city: formValue.city || '',
        state: formValue.state as BrazilianState,
        country: formValue.country || 'Brasil',
        mainAddress: formValue.mainAddress || false,
        active: formValue.active ?? true,
      };

      this.addressService.create(newAddress).subscribe({
        next: () => {
          this.toastr.success('Endereço cadastrado com sucesso');
          this.formSubmitted.emit();
          this.resetForm();
        },
        error: (err) => {
          console.error('Erro ao criar:', err);
          this.toastr.error('Erro ao cadastrar endereço');
        }
      });
    }
  }

  onCancel() {
    this.resetForm();
    this.formCancelled.emit();
  }

  private resetForm() {
    this.form.reset({
      addressType: AddressType.RESIDENCIAL,
      country: 'Brasil',
      mainAddress: false,
      active: true,
    });
    this.submitted = false;
  }
}
