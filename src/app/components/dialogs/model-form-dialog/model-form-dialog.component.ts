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
import { Model } from '@interfaces/vehicle';
import { AuthService } from '@services/auth/auth.service';

export interface ModelFormDialogData {
  title: string;
  model?: Model; // Se existir, é edição; senão, é criação
  mode: 'create' | 'edit';
  brandId?: string; // ID da marca (obrigatório para criação)
  brandName?: string; // Nome da marca (apenas para exibição)
}

@Component({
  selector: 'app-model-form-dialog',
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
  templateUrl: './model-form-dialog.component.html',
  styleUrls: ['./model-form-dialog.component.scss'],
})
export class ModelFormDialogComponent implements OnInit {
  modelForm!: FormGroup;
  currentYear = new Date().getFullYear();

  categories: string[] = [
    'Hatch',
    'Sedan',
    'SUV',
    'Picape',
    'Van',
    'Minivan',
    'Esportivo',
    'Conversível',
    'Wagon',
  ].sort();

  statuses: string[] = ['ACTIVE', 'INACTIVE'];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ModelFormDialogComponent>,
    private authService: AuthService,
    @Inject(MAT_DIALOG_DATA) public data: ModelFormDialogData
  ) {}

  ngOnInit(): void {
    this.initForm();

    if (this.data.mode === 'edit' && this.data.model) {
      this.modelForm.patchValue(this.data.model);
    }
  }

  private initForm(): void {
    this.modelForm = this.fb.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(1),
          Validators.maxLength(100),
        ],
      ],
    });
  }

  // Validator customizado para garantir que yearEnd >= yearStart
  // private yearRangeValidator(form: FormGroup) {
  //   const yearStart = form.get('yearStart')?.value;
  //   const yearEnd = form.get('yearEnd')?.value;

  //   if (yearStart && yearEnd && parseInt(yearEnd) < parseInt(yearStart)) {
  //     return { yearRange: true };
  //   }

  //   return null;
  // }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSubmit(): void {
    if (this.modelForm.valid) {
      const formValue = this.modelForm.value;

      let payload: any = {
        name: formValue.name,
        // description: formValue.description || '',
        // yearStart: formValue.yearStart || null,
        // yearEnd: formValue.yearEnd || null,
        // category: formValue.category || null,
        status: 'ACTIVE', // Sempre ativo ao criar/editar via diálogo
        isGlobal: false, // Sempre false para modelos criados pela loja
        storeId: this.authService.getStoreId(), // Será preenchido pelo backend com a loja do usuário
      };

      console.log('\n########  #########\nthis.data.model:', this.data.model);
      console.log('\n#######  ##########\nthis.data.mode:', this.data.mode);

      if (this.data.mode === 'create') {
        // Para criação, usa o brandId passado
        payload.brandId = this.data.brandId;
      } else if (this.data.mode === 'edit' && this.data.model) {
        // Para edição, mantém o brandId do modelo e adiciona o modelId
        console.log(
          '\n#################\nModelo sendo editado:',
          this.data.model
        );
        payload.brandId = this.data.model.brandId;
        payload.modelId = this.data.model.modelId;
      }

      this.dialogRef.close(payload);
    } else {
      // Marca todos os campos como touched para mostrar erros
      Object.keys(this.modelForm.controls).forEach((key) => {
        this.modelForm.get(key)?.markAsTouched();
      });
    }
  }

  getErrorMessage(fieldName: string): string {
    const control = this.modelForm.get(fieldName);

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

    if (control?.hasError('pattern')) {
      return 'Ano inválido (formato: AAAA)';
    }

    if (control?.hasError('min')) {
      return `Ano mínimo: ${control.errors?.['min'].min}`;
    }

    if (control?.hasError('max')) {
      return `Ano máximo: ${control.errors?.['max'].max}`;
    }

    if (
      this.modelForm.hasError('yearRange') &&
      (fieldName === 'yearEnd' || fieldName === 'yearStart')
    ) {
      return 'Ano final deve ser maior ou igual ao ano inicial';
    }

    return '';
  }
}
