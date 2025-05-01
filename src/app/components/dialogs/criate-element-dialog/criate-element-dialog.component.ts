import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogModule,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';

@Component({
  selector: 'app-criate-element-dialog',
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    FormsModule,
    MatDialogActions,
    MatDialogClose,
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
  ],
  templateUrl: './criate-element-dialog.component.html',
  styleUrl: './criate-element-dialog.component.scss',
})
export class CriateElementConfirmDialogComponent {
  inputValue: string = '';

  constructor(
    public dialogRef: MatDialogRef<CriateElementConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      title: string;
      message: string;
      confirmText: string;
      cancelText: string;
    }
  ) {}

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onConfirm(): void {
    this.dialogRef.close(this.inputValue);
  }
}
