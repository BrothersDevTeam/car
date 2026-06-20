import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FinancialService } from '@services/financial.service';
import { StoreSettings } from '@interfaces/financial';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-store-settings-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon color="primary">settings</mat-icon>
      <span>Configurações de Juros e Multas</span>
    </h2>

    @if (loading) {
      <div class="loader-container">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else {
      <form [formGroup]="settingsForm" (ngSubmit)="onSubmit()">
        <mat-dialog-content class="dialog-content">
          <p class="description-text">
            Defina as taxas padrão aplicadas automaticamente no cálculo de atrasos para esta loja.
          </p>

          <div class="form-grid">
            <!-- Porcentagem de Multa -->
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Multa por Atraso (%)</mat-label>
              <input matInput type="number" step="0.01" formControlName="penaltyPercentage" placeholder="2.00" />
              @if (settingsForm.get('penaltyPercentage')?.hasError('required')) {
                <mat-error>Multa é obrigatória</mat-error>
              }
              @if (settingsForm.get('penaltyPercentage')?.hasError('min')) {
                <mat-error>Multa não pode ser menor que zero</mat-error>
              }
            </mat-form-field>

            <!-- Porcentagem de Juros Mensais -->
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Juros de Mora Mensal (%)</mat-label>
              <input
                matInput
                type="number"
                step="0.01"
                formControlName="interestPercentageMonthly"
                placeholder="1.00"
              />
              @if (settingsForm.get('interestPercentageMonthly')?.hasError('required')) {
                <mat-error>Juros mensais são obrigatórios</mat-error>
              }
              @if (settingsForm.get('interestPercentageMonthly')?.hasError('min')) {
                <mat-error>Juros não podem ser menores que zero</mat-error>
              }
            </mat-form-field>
          </div>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
          <button mat-button type="button" mat-dialog-close>Cancelar</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="settingsForm.invalid || submitting">
            @if (submitting) {
              <span>Salvando...</span>
            } @else {
              <span>Salvar Configurações</span>
            }
          </button>
        </mat-dialog-actions>
      </form>
    }
  `,
  styles: [
    `
      .dialog-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
      }
      .dialog-content {
        padding-top: 8px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-width: 400px;
      }
      .description-text {
        color: #666;
        font-size: 0.9rem;
        margin-bottom: 8px;
      }
      .form-grid {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .loader-container {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 48px;
      }
      .w-100 {
        width: 100%;
      }
    `,
  ],
})
export class StoreSettingsDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private financialService = inject(FinancialService);
  private toastr = inject(ToastrService);
  private dialogRef = inject(MatDialogRef<StoreSettingsDialogComponent>);
  data = inject<{ storeId: string }>(MAT_DIALOG_DATA);

  settingsForm!: FormGroup;
  loading = true;
  submitting = false;

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.loading = true;
    this.financialService.getStoreSettings(this.data.storeId).subscribe({
      next: (settings) => {
        this.settingsForm = this.fb.group({
          penaltyPercentage: [settings.penaltyPercentage, [Validators.required, Validators.min(0)]],
          interestPercentageMonthly: [settings.interestPercentageMonthly, [Validators.required, Validators.min(0)]],
        });
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading store settings', err);
        // Se der 404 ou erro, podemos inicializar com valores padrão (2% multa, 1% juros)
        this.settingsForm = this.fb.group({
          penaltyPercentage: [2.0, [Validators.required, Validators.min(0)]],
          interestPercentageMonthly: [1.0, [Validators.required, Validators.min(0)]],
        });
        this.loading = false;
      },
    });
  }

  onSubmit(): void {
    if (this.settingsForm.invalid) return;

    this.submitting = true;
    const settings: StoreSettings = {
      storeId: this.data.storeId,
      penaltyPercentage: this.settingsForm.value.penaltyPercentage,
      interestPercentageMonthly: this.settingsForm.value.interestPercentageMonthly,
    };

    this.financialService.updateStoreSettings(this.data.storeId, settings).subscribe({
      next: () => {
        this.toastr.success('Configurações salvas com sucesso!', 'Sucesso');
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('Error updating store settings', err);
        this.toastr.error('Erro ao salvar as configurações.', 'Erro');
        this.submitting = false;
      },
    });
  }
}
