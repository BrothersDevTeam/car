import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FinancialService } from '@services/financial.service';
import { FinancialTransaction, FinancialTransactionPayment } from '@interfaces/financial';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-transaction-payments-history-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatTableModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon color="primary">history</mat-icon>
      <span>Histórico de Pagamentos</span>
    </h2>

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
        <p>
          <strong>Total Pago:</strong>
          <span class="text-success">{{ data.transaction.totalPaid | currency: 'BRL' }}</span>
        </p>
        <p>
          <strong>Saldo Devedor:</strong>
          <span class="text-danger">{{ data.transaction.balanceDue | currency: 'BRL' }}</span>
        </p>
      </div>

      @if (loading) {
        <div class="loader-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <div class="table-container">
          <table mat-table [dataSource]="payments" class="mat-elevation-z0 w-100">
            <!-- Data -->
            <ng-container matColumnDef="paymentDate">
              <th mat-header-cell *matHeaderCellDef>Data Pagamento</th>
              <td mat-cell *matCellDef="let p">{{ p.paymentDate | date: 'dd/MM/yyyy HH:mm' }}</td>
            </ng-container>

            <!-- Valor -->
            <ng-container matColumnDef="amountPaid">
              <th mat-header-cell *matHeaderCellDef>Valor Pago</th>
              <td mat-cell *matCellDef="let p" class="font-weight-600 text-success">
                {{ p.amountPaid | currency: 'BRL' }}
              </td>
            </ng-container>

            <!-- Encargos -->
            <ng-container matColumnDef="charges">
              <th mat-header-cell *matHeaderCellDef>Multa / Juros</th>
              <td mat-cell *matCellDef="let p" class="text-muted">
                +{{ p.penaltyAmount | currency: 'BRL' }} / +{{ p.interestAmount | currency: 'BRL' }}
              </td>
            </ng-container>

            <!-- Desconto -->
            <ng-container matColumnDef="discountAmount">
              <th mat-header-cell *matHeaderCellDef>Desconto</th>
              <td mat-cell *matCellDef="let p" class="text-info">-{{ p.discountAmount | currency: 'BRL' }}</td>
            </ng-container>

            <!-- Método -->
            <ng-container matColumnDef="paymentMethod">
              <th mat-header-cell *matHeaderCellDef>Forma</th>
              <td mat-cell *matCellDef="let p">
                <span class="method-badge">{{ getMethodLabel(p.paymentMethod) }}</span>
              </td>
            </ng-container>

            <!-- Usuário -->
            <ng-container matColumnDef="createdBy">
              <th mat-header-cell *matHeaderCellDef>Registrado Por</th>
              <td mat-cell *matCellDef="let p" class="text-muted" style="font-size: 0.8rem;">
                {{ p.createdBy }}
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>

          @if (payments.length === 0) {
            <div class="empty-state">
              <mat-icon>info_outline</mat-icon>
              <p>Nenhum pagamento registrado para esta transação.</p>
            </div>
          }
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" mat-dialog-close>Fechar</button>
    </mat-dialog-actions>
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
        min-width: 600px;
      }
      .transaction-info {
        background: #f5f5f5;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 0.9rem;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        p {
          margin: 0;
        }
      }
      .loader-container {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 32px;
      }
      .table-container {
        max-height: 300px;
        overflow-y: auto;
      }
      .w-100 {
        width: 100%;
      }
      .method-badge {
        background: #e0e0e0;
        color: #333;
        font-size: 0.75rem;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 500;
      }
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 32px;
        color: #666;
        p {
          margin: 8px 0 0;
        }
      }
      .font-weight-600 {
        font-weight: 600;
      }
      .text-success {
        color: #2e7d32;
      }
      .text-danger {
        color: #c62828;
      }
    `,
  ],
})
export class TransactionPaymentsHistoryDialogComponent implements OnInit {
  private financialService = inject(FinancialService);
  private toastr = inject(ToastrService);
  data = inject<{ transaction: FinancialTransaction }>(MAT_DIALOG_DATA);

  payments: FinancialTransactionPayment[] = [];
  loading = true;

  displayedColumns: string[] = ['paymentDate', 'amountPaid', 'charges', 'discountAmount', 'paymentMethod', 'createdBy'];

  ngOnInit(): void {
    this.loadPayments();
  }

  loadPayments(): void {
    this.loading = true;
    this.financialService.getPayments(this.data.transaction.financialTransactionId).subscribe({
      next: (list) => {
        this.payments = list;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading transaction payments', err);
        this.toastr.error('Erro ao carregar histórico de pagamentos.', 'Erro');
        this.loading = false;
      },
    });
  }

  getMethodLabel(method: string): string {
    switch (method) {
      case 'PIX':
        return 'Pix';
      case 'CASH':
        return 'Dinheiro';
      case 'CREDIT_CARD':
        return 'Cartão de Crédito';
      case 'DEBIT_CARD':
        return 'Cartão de Débito';
      case 'BANK_TRANSFER':
        return 'TED/DOC';
      default:
        return method;
    }
  }
}
