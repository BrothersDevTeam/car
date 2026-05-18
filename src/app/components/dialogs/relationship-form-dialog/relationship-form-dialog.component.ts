import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogModule,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';

export interface RelationshipFormDialogData {
  title: string;
}

@Component({
  selector: 'app-relationship-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogActions,
    MatDialogTitle,
    MatDialogContent,
  ],
  templateUrl: './relationship-form-dialog.component.html',
  styleUrls: ['./relationship-form-dialog.component.scss'],
})
export class RelationshipFormDialogComponent implements OnInit {
  relationshipForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<RelationshipFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RelationshipFormDialogData,
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.relationshipForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSubmit(): void {
    if (this.relationshipForm.valid) {
      const name = this.relationshipForm.value.name.trim().toUpperCase();
      this.dialogRef.close({ name });
    } else {
      Object.keys(this.relationshipForm.controls).forEach((key) => {
        this.relationshipForm.get(key)?.markAsTouched();
      });
    }
  }

  getErrorMessage(fieldName: string): string {
    const control = this.relationshipForm.get(fieldName);

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
