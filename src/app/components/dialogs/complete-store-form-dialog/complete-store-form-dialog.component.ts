import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatStepperModule } from '@angular/material/stepper';
import { MatRadioModule } from '@angular/material/radio';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

export interface CompleteStoreFormData {
  title: string;
}

@Component({
  selector: 'app-complete-store-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatStepperModule,
    MatRadioModule,
    NgxMaskDirective
  ],
  providers: [provideNgxMask()],
  templateUrl: './complete-store-form-dialog.component.html',
  styleUrls: ['./complete-store-form-dialog.component.scss'],
})
export class CompleteStoreFormDialogComponent implements OnInit {
  storeForm!: FormGroup;
  ownerForm!: FormGroup;
  userForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CompleteStoreFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CompleteStoreFormData
  ) {}

  ngOnInit(): void {
    this.initForms();
  }

  private initForms(): void {
    this.storeForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      tradeName: ['', [Validators.minLength(3), Validators.maxLength(50)]],
      cnpj: ['', [Validators.required, Validators.minLength(14), Validators.maxLength(14)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(50)]],
      phoneNumber: ['', [Validators.maxLength(20)]],
    });

    this.ownerForm = this.fb.group({
      legalEntity: [false, Validators.required],
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      cpf: [''],
      cnpj: [''],
      email: ['', [Validators.email, Validators.maxLength(100)]],
      phone: ['', [Validators.maxLength(14)]],
    });

    this.userForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(50)]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(20)]],
      confirmPassword: ['', Validators.required]
    });

    this.ownerForm.get('legalEntity')?.valueChanges.subscribe(isLegalEntity => {
      if (isLegalEntity) {
        this.ownerForm.get('cnpj')?.setValidators([Validators.required, Validators.minLength(14)]);
        this.ownerForm.get('cpf')?.clearValidators();
      } else {
        this.ownerForm.get('cpf')?.setValidators([Validators.required, Validators.minLength(11)]);
        this.ownerForm.get('cnpj')?.clearValidators();
      }
      this.ownerForm.get('cpf')?.updateValueAndValidity();
      this.ownerForm.get('cnpj')?.updateValueAndValidity();
    });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSubmit(): void {
    if (this.storeForm.valid && this.ownerForm.valid && this.userForm.valid) {
      if (this.userForm.value.password !== this.userForm.value.confirmPassword) {
        alert('As senhas não coincidem!');
        return;
      }

      const payload = {
        store: {
          name: this.storeForm.value.name,
          tradeName: this.storeForm.value.tradeName || null,
          cnpj: this.storeForm.value.cnpj.replace(/\D/g, ''),
          email: this.storeForm.value.email,
          phoneNumber: this.storeForm.value.phoneNumber ? this.storeForm.value.phoneNumber.replace(/\D/g, '') : null,
        },
        owner: {
          legalEntity: this.ownerForm.value.legalEntity,
          name: this.ownerForm.value.name,
          cpf: this.ownerForm.value.legalEntity ? null : this.ownerForm.value.cpf?.replace(/\D/g, ''),
          cnpj: this.ownerForm.value.legalEntity ? this.ownerForm.value.cnpj?.replace(/\D/g, '') : null,
          email: this.ownerForm.value.email || null,
          phone: this.ownerForm.value.phone ? this.ownerForm.value.phone.replace(/\D/g, '') : null,
        },
        user: {
          username: this.userForm.value.username,
          password: this.userForm.value.password,
        }
      };

      this.dialogRef.close(payload);
    }
  }

  getErrorMessage(form: FormGroup, fieldName: string): string {
    const control = form.get(fieldName);

    if (control?.hasError('required')) return 'Este campo é obrigatório';
    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `Mínimo de ${minLength} caracteres`;
    }
    if (control?.hasError('maxlength')) {
      const maxLength = control.errors?.['maxlength'].requiredLength;
      return `Máximo de ${maxLength} caracteres`;
    }
    if (control?.hasError('email')) return 'Email inválido';

    return '';
  }
}
