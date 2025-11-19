import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Store } from '@interfaces/store';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

export interface StoreFormDialogData {
  title: string;
  store?: Store;
  mode: 'create' | 'edit';
  storeType: 'MATRIZ' | 'BRANCH';
  mainStoreId?: string;
}

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
    NgxMaskDirective
  ],
  providers: [provideNgxMask()],
  templateUrl: './store-form-dialog.component.html',
  styleUrls: ['./store-form-dialog.component.scss'],
})
export class StoreFormDialogComponent implements OnInit {
  storeForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<StoreFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: StoreFormDialogData
  ) {}

  ngOnInit(): void {
    this.initForm();

    if (this.data.mode === 'edit' && this.data.store) {
      this.storeForm.patchValue({
        name: this.data.store.name,
        tradeName: this.data.store.tradeName,
        cnpj: this.data.store.cnpj,
        email: this.data.store.email,
        phoneNumber: this.data.store.phone,
      });
    }
  }

  private initForm(): void {
    this.storeForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      tradeName: ['', [Validators.minLength(3), Validators.maxLength(50)]],
      cnpj: ['', [Validators.required, Validators.minLength(14), Validators.maxLength(14)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(50)]],
      phoneNumber: ['', [Validators.maxLength(20)]],
    });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSubmit(): void {
    if (this.storeForm.valid) {
      const formValue = this.storeForm.value;

      const payload: any = {
        name: formValue.name,
        tradeName: formValue.tradeName || null,
        cnpj: formValue.cnpj.replace(/\D/g, ''),
        email: formValue.email,
        phoneNumber: formValue.phoneNumber ? formValue.phoneNumber.replace(/\D/g, '') : null,
      };

      if (this.data.storeType === 'BRANCH' && this.data.mainStoreId) {
        payload.mainStoreId = this.data.mainStoreId;
      }

      this.dialogRef.close(payload);
    } else {
      Object.keys(this.storeForm.controls).forEach((key) => {
        this.storeForm.get(key)?.markAsTouched();
      });
    }
  }

  getErrorMessage(fieldName: string): string {
    const control = this.storeForm.get(fieldName);

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
}
