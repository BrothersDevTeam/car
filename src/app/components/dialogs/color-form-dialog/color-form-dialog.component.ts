import { Component, inject, Inject, OnInit } from '@angular/core';
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
import { Color } from '@interfaces/vehicle';
import { AuthService } from '@services/auth/auth.service';

export interface ColorFormDialogData {
  title: string;
  color?: Color; // Se existir, é edição; senão, é criação
  mode: 'create' | 'edit';
}

@Component({
  selector: 'app-color-form-dialog',
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
  templateUrl: './color-form-dialog.component.html',
  styleUrls: ['./color-form-dialog.component.scss'],
})
export class ColorFormDialogComponent implements OnInit {
  colorForm!: FormGroup;

  // colorStatuses = [
  //   { value: 'ACTIVE', label: 'Ativo' },
  //   { value: 'INACTIVE', label: 'Inativo' },
  // ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    public dialogRef: MatDialogRef<ColorFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ColorFormDialogData
  ) {}

  ngOnInit(): void {
    this.initForm();

    if (this.data.mode === 'edit' && this.data.color) {
      this.colorForm.patchValue({
        name: this.data.color.name,
        // status: this.data.color.status || 'ACTIVE',
      });
    }
  }

  private initForm(): void {
    this.colorForm = this.fb.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
        ],
      ],
      // status: ['ACTIVE', [Validators.required]],
    });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSubmit(): void {
    if (this.colorForm.valid) {
      const formValue = this.colorForm.value;

      let payload: any = {
        name: formValue.name,
        // status: formValue.status,
        isGlobal: false, // Sempre false para cores criadas pela loja
        storeId: this.authService.getStoreId(),
      };

      console.log('Color Payload before ID addition:', payload);

      if (this.data.mode === 'edit' && this.data.color) {
        payload = {
          ...payload,
          colorId: this.data.color.colorId,
        };
      }

      this.dialogRef.close(payload);
    } else {
      // Marca todos os campos como touched para mostrar erros
      Object.keys(this.colorForm.controls).forEach((key) => {
        this.colorForm.get(key)?.markAsTouched();
      });
    }
  }

  getErrorMessage(fieldName: string): string {
    const control = this.colorForm.get(fieldName);

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
