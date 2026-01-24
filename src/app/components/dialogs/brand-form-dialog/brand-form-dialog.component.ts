import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogModule,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { Brand } from '@interfaces/vehicle';
import { AuthService } from '@services/auth/auth.service';

export interface BrandFormDialogData {
  title: string;
  brand?: Brand; // Se existir, é edição; senão, é criação
  mode: 'create' | 'edit';
}

@Component({
  selector: 'app-brand-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDialogActions,
    MatDialogTitle,
    MatDialogContent,
  ],
  templateUrl: './brand-form-dialog.component.html',
  styleUrls: ['./brand-form-dialog.component.scss'],
})
export class BrandFormDialogComponent implements OnInit {
  brandForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    public dialogRef: MatDialogRef<BrandFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BrandFormDialogData
  ) {}

  ngOnInit(): void {
    this.initForm();

    if (this.data.mode === 'edit' && this.data.brand) {
      this.brandForm.patchValue({
        name: this.data.brand.name,
      });
    }
  }

  private initForm(): void {
    this.brandForm = this.fb.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
        ],
      ],
    });

    this.brandForm.get('name')?.valueChanges.subscribe((value) => {
      if (value) {
        this.brandForm
          .get('name')
          ?.setValue(value.toUpperCase(), { emitEvent: false });
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSubmit(): void {
    if (this.brandForm.valid) {
      const formValue = this.brandForm.value;

      let payload: any = {
        name: formValue.name,
        isGlobal: false, // Sempre false para marcas criadas pela loja
        storeId: this.authService.getStoreId(),
      };

      if (this.data.mode === 'edit' && this.data.brand) {
        payload = {
          ...payload,
          brandId: this.data.brand.brandId,
        };
      }

      this.dialogRef.close(payload);
    } else {
      // Marca todos os campos como touched para mostrar erros
      Object.keys(this.brandForm.controls).forEach((key) => {
        this.brandForm.get(key)?.markAsTouched();
      });
    }
  }

  getErrorMessage(fieldName: string): string {
    const control = this.brandForm.get(fieldName);

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

    return '';
  }
}
