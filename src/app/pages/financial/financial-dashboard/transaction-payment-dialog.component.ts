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
import { CurrencyInputComponent } from '@components/currency-input/currency-input.component';
import { CashRegisterService } from '@services/cash-register.service';
import { ICashRegister, ICashRegisterSession } from '@interfaces/cash-register';

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
    CurrencyInputComponent,
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
          <app-currency-input
            formControlName="amountPaid"
            label="Valor do Pagamento"
            [required]="true"
            [error]="!!(paymentForm.get('amountPaid')?.touched && paymentForm.get('amountPaid')?.invalid)"
            [errorMessage]="getAmountPaidErrorMessage()"
            class="w-100"
          ></app-currency-input>

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

          <!-- Caixa Destino -->
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Caixa Destino/Origem</mat-label>
            <mat-select formControlName="cashRegisterId">
              <mat-option value="">Selecione um Caixa</mat-option>
              @for (item of allRegisters; track item.register.cashRegisterId) {
                <mat-option [value]="item.register.cashRegisterId">
                  {{ item.register.name }} {{ item.session ? '(ABERTO)' : '(FECHADO)' }}
                </mat-option>
              }
            </mat-select>
            @if (paymentForm.get('cashRegisterId')?.hasError('required')) {
              <mat-error>Caixa é obrigatório</mat-error>
            }
            @if (loadingRegisters) {
              <mat-hint>Carregando caixas...</mat-hint>
            }
          </mat-form-field>

          <!-- Multa -->
          <app-currency-input
            formControlName="penaltyAmount"
            label="Multa"
            [error]="!!(paymentForm.get('penaltyAmount')?.touched && paymentForm.get('penaltyAmount')?.invalid)"
            errorMessage="A multa não pode ser negativa"
            class="w-100"
          ></app-currency-input>

          <!-- Juros -->
          <app-currency-input
            formControlName="interestAmount"
            label="Juros"
            [error]="!!(paymentForm.get('interestAmount')?.touched && paymentForm.get('interestAmount')?.invalid)"
            errorMessage="Os juros não podem ser negativos"
            class="w-100"
          ></app-currency-input>

          <!-- Desconto -->
          <app-currency-input
            formControlName="discountAmount"
            label="Desconto"
            [error]="!!(paymentForm.get('discountAmount')?.touched && paymentForm.get('discountAmount')?.invalid)"
            errorMessage="O desconto não pode ser negativo"
            class="w-100"
          ></app-currency-input>

          <!-- Data do Pagamento -->
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Data do Pagamento</mat-label>
            <input matInput type="datetime-local" formControlName="paymentDate" />
            @if (paymentForm.get('paymentDate')?.hasError('required')) {
              <mat-error>Data é obrigatória</mat-error>
            }
          </mat-form-field>

          <!-- Saldo Inicial para Abertura (se o caixa estiver fechado) -->
          @if (isRegisterClosed()) {
            <div class="w-100 opening-warning" style="grid-column: 1 / -1;">
              <mat-icon>info_outline</mat-icon>
              <span>Este caixa está fechado. Informe o Saldo Inicial para abri-lo e prosseguir com o pagamento.</span>
            </div>
            <app-currency-input
              formControlName="initialBalance"
              label="Saldo Inicial de Abertura (R$)"
              [required]="true"
              [error]="!!(paymentForm.get('initialBalance')?.touched && paymentForm.get('initialBalance')?.invalid)"
              errorMessage="Saldo inicial de abertura é obrigatório para caixas fechados"
              class="w-100"
              style="grid-column: 1 / -1;"
            ></app-currency-input>
          }
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
      .opening-warning {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #c62828;
        background: #ffebee;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 0.85rem;
        margin-bottom: 8px;
        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
      .form-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;

        @media (max-width: 800px) {
          grid-template-columns: 1fr 1fr;
        }

        @media (max-width: 600px) {
          grid-template-columns: 1fr;
        }
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
  private cashRegisterService = inject(CashRegisterService);
  private toastr = inject(ToastrService);
  private dialogRef = inject(MatDialogRef<TransactionPaymentDialogComponent>);
  data = inject<{ transaction: FinancialTransaction }>(MAT_DIALOG_DATA);

  paymentForm!: FormGroup;
  submitting = false;
  daysOverdue = 0;
  allRegisters: { register: ICashRegister; session: ICashRegisterSession | null }[] = [];
  loadingRegisters = false;

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
      cashRegisterId: ['', Validators.required],
      initialBalance: [0],
    });

    this.loadRegisters();

    // Monitorar mudança de caixa para atualizar validação do Saldo Inicial
    this.paymentForm.get('cashRegisterId')?.valueChanges.subscribe(() => {
      const initialBalanceControl = this.paymentForm.get('initialBalance');
      if (this.isRegisterClosed()) {
        initialBalanceControl?.setValidators([Validators.required, Validators.min(0)]);
      } else {
        initialBalanceControl?.clearValidators();
      }
      initialBalanceControl?.updateValueAndValidity();
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

  getAmountPaidErrorMessage(): string {
    const control = this.paymentForm?.get('amountPaid');
    if (control?.hasError('required')) return 'Valor é obrigatório';
    if (control?.hasError('min')) return 'Valor deve ser maior que zero';
    if (control?.hasError('max')) return 'Valor não pode exceder o saldo devedor';
    return 'Campo inválido';
  }

  private getLocalDateTimeString(): string {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(Date.now() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
  }

  loadRegisters(): void {
    const storeId = this.data.transaction.storeId;
    this.loadingRegisters = true;
    this.cashRegisterService.getCashRegisters(storeId).subscribe({
      next: (list) => {
        const promises = list.map((reg) => {
          return new Promise<void>((resolve) => {
            this.cashRegisterService.getCurrentSession(reg.cashRegisterId).subscribe({
              next: (session) => {
                this.allRegisters.push({
                  register: reg,
                  session: session && session.status === 'OPEN' ? session : null,
                });
                resolve();
              },
              error: () => {
                this.allRegisters.push({ register: reg, session: null });
                resolve();
              },
            });
          });
        });

        Promise.all(promises).then(() => {
          this.loadingRegisters = false;
          // Seleciona o primeiro caixa aberto se houver, senão o primeiro da lista
          const firstOpen = this.allRegisters.find((r) => r.session !== null);
          if (firstOpen) {
            this.paymentForm.get('cashRegisterId')?.setValue(firstOpen.register.cashRegisterId);
          } else if (this.allRegisters.length > 0) {
            this.paymentForm.get('cashRegisterId')?.setValue(this.allRegisters[0].register.cashRegisterId);
          }
        });
      },
      error: (err) => {
        console.error('Erro ao carregar caixas ativos', err);
        this.loadingRegisters = false;
      },
    });
  }

  isRegisterClosed(): boolean {
    const selectedId = this.paymentForm.get('cashRegisterId')?.value;
    if (!selectedId) return false;
    const reg = this.allRegisters.find((r) => r.register.cashRegisterId === selectedId);
    return reg ? reg.session === null : false;
  }

  onSubmit(): void {
    if (this.paymentForm.invalid) return;

    this.submitting = true;
    const formVal = this.paymentForm.value;
    const cashRegisterId = formVal.cashRegisterId;

    if (this.isRegisterClosed()) {
      const openRequest = {
        cashRegisterId: cashRegisterId,
        initialBalance: formVal.initialBalance || 0,
      };
      this.cashRegisterService.openSession(openRequest).subscribe({
        next: (session) => {
          this.toastr.success('Caixa aberto com sucesso! Processando o pagamento...', 'Sucesso');
          // Atualiza status local do caixa
          const reg = this.allRegisters.find((r) => r.register.cashRegisterId === cashRegisterId);
          if (reg) {
            reg.session = session;
          }
          this.executePayment(formVal);
        },
        error: (err) => {
          console.error('Erro ao abrir caixa', err);
          this.toastr.error('Erro ao abrir o caixa para realizar o pagamento.', 'Erro');
          this.submitting = false;
        },
      });
    } else {
      this.executePayment(formVal);
    }
  }

  private executePayment(formVal: any): void {
    const request = {
      amountPaid: formVal.amountPaid,
      discountAmount: formVal.discountAmount,
      interestAmount: formVal.interestAmount,
      penaltyAmount: formVal.penaltyAmount,
      paymentDate: new Date(formVal.paymentDate).toISOString(),
      paymentMethod: formVal.paymentMethod,
      cashRegisterId: formVal.cashRegisterId || null,
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
