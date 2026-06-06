import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogRef,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-inutilizar-numeracao-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inutilizar-numeracao-dialog.html',
  styleUrl: './inutilizar-numeracao-dialog.scss',
})
export class InutilizarNumeracaoDialog {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<InutilizarNumeracaoDialog>,
  ) {
    this.form = this.fb.group({
      numeroInicial: [null, [Validators.required, Validators.min(1)]],
      numeroFinal: [null, [Validators.required, Validators.min(1)]],
      justificativa: ['', [Validators.required, Validators.minLength(15), Validators.maxLength(255)]],
    });
  }

  submit() {
    if (this.form.valid) {
      if (this.form.value.numeroInicial > this.form.value.numeroFinal) {
        this.form.get('numeroFinal')?.setErrors({ min: true });
        return;
      }
      this.dialogRef.close(this.form.value);
    } else {
      this.form.markAllAsTouched();
    }
  }
}
