import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FinancialService } from '@services/financial.service';
import { FinancialTransaction } from '@interfaces/financial';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-transaction-payment-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon color="primary">payments</mat-icon>
      <span>Registrar Pagamento</span>
    </h2>

    <form [formGroup]="paymentForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-content">
        <div class="transaction-info">
          <p>
            <strong>Descrição:</strong>
            {{ data.transaction.description }}
          </p>
          <p>
            <strong>Valor Lançamento:</strong>
            {{ data.transaction.amount | currency: 'BRL' }}
          </p>
          @if (data.transaction.totalPaid > 0) {
            <p>
              <strong>Total Pago Anteriormente:</strong>
              {{ data.transaction.totalPaid | currency: 'BRL' }}
            </p>
          }
          <p>
            <strong>Saldo Devedor Atual:</strong>
            <span class="text-danger">{{ data.transaction.balanceDue | currency: 'BRL' }}</span>
          </p>
          @if (daysOverdue > 0) {
            <div class="overdue-warning">
              <mat-icon>warning</mat-icon>
              <span>Atraso de {{ daysOverdue }} dias. Juros/Multa sugeridos foram calculados.</span>
            </div>
          }
        </div>

        <div class="form-grid">
          <!-- Valor a Pagar -->
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Valor do Pagamento (R$)</mat-label>
            <input matInput type="number" step="0.01" formControlName="amountPaid" placeholder="0.00" />
            @if (paymentForm.get('amountPaid')?.hasError('required')) {
              <mat-error>Valor é obrigatório</mat-error>
            }
            @if (paymentForm.get('amountPaid')?.hasError('min')) {
              <mat-error>Valor deve ser maior que zero</mat-error>
            }
            @if (paymentForm.get('amountPaid')?.hasError('max')) {
              <mat-error>Valor não pode exceder o saldo devedor + encargos</mat-error>
            }
          </mat-form-field>

          <!-- Forma de Pagamento -->
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Forma de Pagamento</mat-label>
            <mat-select formControlName="paymentMethod">
              @for (method of paymentMethods; track method.value) {
                <mat-option [value]="method.value">{{ method.label }}</mat-option>
              }
            </mat-select>
            @if (paymentForm.get('paymentMethod')?.hasError('required')) {
              <mat-error>Forma de pagamento é obrigatória</mat-error>
            }
          </mat-form-field>

          <!-- Multa -->
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Multa (R$)</mat-label>
            <input matInput type="number" step="0.01" formControlName="penaltyAmount" placeholder="0.00" />
          </mat-form-field>

          <!-- Juros -->
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Juros (R$)</mat-label>
            <input matInput type="number" step="0.01" formControlName="interestAmount" placeholder="0.00" />
          </mat-form-field>

          <!-- Desconto -->
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Desconto (R$)</mat-label>
            <input matInput type="number" step="0.01" formControlName="discountAmount" placeholder="0.00" />
          </mat-form-field>

          <!-- Data do Pagamento -->
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Data do Pagamento</mat-label>
            <input matInput type="datetime-local" formControlName="paymentDate" />
            @if (paymentForm.get('paymentDate')?.hasError('required')) {
              <mat-error>Data é obrigatória</mat-error>
            }
          </mat-form-field>
        </div>

        <div class="payment-summary">
          <p>
            <strong>Total Cobrado (Com acréscimos/descontos):</strong>
            {{ totalPaymentWithCharges | currency: 'BRL' }}
          </p>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="paymentForm.invalid || submitting">
          @if (submitting) {
            <span>Processando...</span>
          } @else {
            <span>Confirmar Pagamento</span>
          }
        </button>
      </mat-dialog-actions>
    </form>
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
      }
      .transaction-info {
        background: #f5f5f5;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 0.9rem;
        p {
          margin: 4px 0;
        }
      }
      .overdue-warning {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 8px;
        color: #e65100;
        background: #fff3e0;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 0.8rem;
        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }
      }
      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .payment-summary {
        background: rgba(25, 118, 210, 0.05);
        border-left: 4px solid #1976d2;
        padding: 12px 16px;
        border-radius: 4px;
        margin-top: 8px;
        p {
          margin: 0;
          font-size: 1rem;
        }
      }
      .dialog-actions {
        padding: 16px 24px;
      }
      .w-100 {
        width: 100%;
      }
    `,
  ],
})
export class TransactionPaymentDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private financialService = inject(FinancialService);
  private toastr = inject(ToastrService);
  private dialogRef = inject(MatDialogRef<TransactionPaymentDialogComponent>);
  data = inject<{ transaction: FinancialTransaction }>(MAT_DIALOG_DATA);

  paymentForm!: FormGroup;
  submitting = false;
  daysOverdue = 0;

  paymentMethods = [
    { value: 'PIX', label: 'Pix' },
    { value: 'CASH', label: 'Dinheiro' },
    { value: 'CREDIT_CARD', label: 'Cartão de Crédito' },
    { value: 'DEBIT_CARD', label: 'Cartão de Débito' },
    { value: 'BANK_TRANSFER', label: 'Transferência Bancária' },
  ];

  ngOnInit(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDateParts = this.data.transaction.dueDate.split('-');
    const dueDate = new Date(parseInt(dueDateParts[0]), parseInt(dueDateParts[1]) - 1, parseInt(dueDateParts[2]));
    dueDate.setHours(0, 0, 0, 0);

    if (today > dueDate) {
      const diffTime = Math.abs(today.getTime() - dueDate.getTime());
      this.daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    this.paymentForm = this.fb.group({
      amountPaid: [this.data.transaction.balanceDue, [Validators.required, Validators.min(0.01)]],
      paymentMethod: ['PIX', Validators.required],
      penaltyAmount: [0, [Validators.min(0)]],
      interestAmount: [0, [Validators.min(0)]],
      discountAmount: [0, [Validators.min(0)]],
      paymentDate: [this.getLocalDateTimeString(), Validators.required],
    });

    // Carregar configurações da loja para calcular juros sugeridos
    this.financialService.getStoreSettings(this.data.transaction.storeId).subscribe({
      next: (settings) => {
        if (this.daysOverdue > 0) {
          const balance = this.data.transaction.balanceDue;
          const penalty = (balance * settings.penaltyPercentage) / 100;

          // Juros diários = (monthlyInterestPercentage / 30) / 100
          const dailyRate = settings.interestPercentageMonthly / 30 / 100;
          const interest = balance * dailyRate * this.daysOverdue;

          this.paymentForm.patchValue({
            penaltyAmount: parseFloat(penalty.toFixed(2)),
            interestAmount: parseFloat(interest.toFixed(2)),
          });
        }
      },
      error: (err) => {
        console.warn('Could not load store settings for interest calculations. Using default values.', err);
      },
    });

    // Atualiza validadores dinamicamente se multas/juros forem alterados
    this.paymentForm.valueChanges.subscribe(() => {
      this.updateValidators();
    });
  }

  get totalPaymentWithCharges(): number {
    const amount = this.paymentForm?.get('amountPaid')?.value || 0;
    const penalty = this.paymentForm?.get('penaltyAmount')?.value || 0;
    const interest = this.paymentForm?.get('interestAmount')?.value || 0;
    const discount = this.paymentForm?.get('discountAmount')?.value || 0;
    return Math.max(0, amount + penalty + interest - discount);
  }

  private updateValidators(): void {
    const amountPaidControl = this.paymentForm.get('amountPaid');
    const penalty = this.paymentForm.get('penaltyAmount')?.value || 0;
    const interest = this.paymentForm.get('interestAmount')?.value || 0;
    const discount = this.paymentForm.get('discountAmount')?.value || 0;

    // O valor pago não pode exceder o saldo devedor mais acréscimos menos descontos
    const maxAllowed = this.data.transaction.balanceDue;
    if (amountPaidControl) {
      amountPaidControl.setValidators([Validators.required, Validators.min(0.01), Validators.max(maxAllowed)]);
    }
  }

  private getLocalDateTimeString(): string {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(Date.now() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
  }

  onSubmit(): void {
    if (this.paymentForm.invalid) return;

    this.submitting = true;
    const formVal = this.paymentForm.value;

    const request = {
      amountPaid: formVal.amountPaid,
      discountAmount: formVal.discountAmount,
      interestAmount: formVal.interestAmount,
      penaltyAmount: formVal.penaltyAmount,
      paymentDate: new Date(formVal.paymentDate).toISOString(),
      paymentMethod: formVal.paymentMethod,
    };

    this.financialService.payTransaction(this.data.transaction.financialTransactionId, request).subscribe({
      next: (updatedTx) => {
        this.toastr.success('Pagamento registrado com sucesso!', 'Sucesso');
        this.dialogRef.close(updatedTx);
      },
      error: (err) => {
        console.error('Error paying transaction', err);
        this.toastr.error('Erro ao registrar o pagamento.', 'Erro');
        this.submitting = false;
      },
    });
  }
}
