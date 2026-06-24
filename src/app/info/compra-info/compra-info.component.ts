import { Component, Input, OnInit, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CompraService } from '@services/compra.service';
import { NfeService } from '@services/nfe.service';
import { FinancialService } from '@services/financial.service';
import { Compra, CompraPagamento } from '@interfaces/compra';
import { Nfe } from '@interfaces/nfe';
import { FinancialTransaction } from '@interfaces/financial';
import { TransactionPaymentDialogComponent } from '../../pages/financial/financial-dashboard/transaction-payment-dialog.component';

@Component({
  selector: 'app-compra-info',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatTooltipModule,
    MatDialogModule
  ],
  providers: [DatePipe, CurrencyPipe],
  templateUrl: './compra-info.component.html',
  styleUrl: './compra-info.component.scss',
})
export class CompraInfoComponent implements OnInit {
  @Input() compraId!: string;
  @Output() close = new EventEmitter<void>();
  @Output() edit = new EventEmitter<string>();

  private compraService = inject(CompraService);
  private nfeService = inject(NfeService);
  private financialService = inject(FinancialService);
  private dialog = inject(MatDialog);
  private datePipe = inject(DatePipe);
  private currencyPipe = inject(CurrencyPipe);

  compra: Compra | null = null;
  nfe: Nfe | null = null;
  financialTransactions: FinancialTransaction[] = [];
  loading = true;
  error = false;

  ngOnInit(): void {
    if (this.compraId) {
      this.loadCompraDetails();
    }
  }

  loadCompraDetails(): void {
    this.loading = true;
    this.compraService.getCompraById(this.compraId).subscribe({
      next: (compra: Compra) => {
        this.compra = compra;
        this.loadFinancialTransactions();
        if (compra.nfeId) {
          this.loadNfeDetails(compra.nfeId);
        } else {
          this.loading = false;
        }
      },
      error: (err: any) => {
        console.error('Erro ao carregar compra:', err);
        this.error = true;
        this.loading = false;
      },
    });
  }

  loadNfeDetails(nfeId: string): void {
    this.nfeService.getById(nfeId).subscribe({
      next: (nfe: Nfe) => {
        this.nfe = nfe;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar NFe:', err);
        this.loading = false;
      },
    });
  }

  loadFinancialTransactions(): void {
    if (!this.compraId) return;
    this.financialService.getTransactions(0, 50, { referenceId: this.compraId }).subscribe({
      next: (res) => {
        this.financialTransactions = res.content;
      },
      error: (err) => {
        console.error('Erro ao carregar lançamentos financeiros da compra', err);
      }
    });
  }

  openPaymentModal(transaction: FinancialTransaction): void {
    const dialogRef = this.dialog.open(TransactionPaymentDialogComponent, {
      width: '95%',
      maxWidth: '850px',
      data: { transaction },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadFinancialTransactions();
      }
    });
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return '—';
    return this.datePipe.transform(date, 'dd/MM/yyyy') || '—';
  }

  formatCurrency(value: number | undefined): string {
    if (value === undefined) return '—';
    return this.currencyPipe.transform(value, 'BRL', 'symbol', '1.2-2') || '—';
  }

  getStatusClass(status: string | undefined): string {
    if (!status) return '';
    switch (status.toUpperCase()) {
      case 'ATIVA':
      case 'AUTORIZADO':
      case 'PAID':
      case 'PAGO':
        return 'status-success';
      case 'CANCELADA':
      case 'CANCELADO':
      case 'CANCELLED':
        return 'status-danger';
      case 'PROCESSANDO':
      case 'PENDING':
      case 'PENDENTE':
      case 'PARTIALLY_PAID':
        return 'status-warning';
      default:
        return 'status-neutral';
    }
  }

  getStatusLabel(status: string | undefined): string {
    if (!status) return '—';
    switch (status.toUpperCase()) {
      case 'ATIVA':
        return 'Ativa';
      case 'CANCELADA':
        return 'Cancelada';
      case 'PROCESSANDO_AUTORIZACAO':
        return 'Processando';
      case 'AUTORIZADO':
        return 'Autorizada';
      case 'ERRO_AUTORIZACAO':
        return 'Erro na SEFAZ';
      case 'RASCUNHO':
        return 'Em Digitação';
      case 'PENDING':
        return 'Pendente';
      case 'PAID':
        return 'Pago';
      case 'PARTIALLY_PAID':
        return 'Parcialmente Pago';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return status;
    }
  }

  openDanfe(): void {
    if (this.nfe?.nfeDanfeUrl) {
      window.open(this.nfe.nfeDanfeUrl, '_blank');
    }
  }

  openXml(): void {
    if (this.nfe?.nfeXmlUrl) {
      window.open(this.nfe.nfeXmlUrl, '_blank');
    }
  }

  onEdit(): void {
    if (this.compra) {
      this.edit.emit(this.compra.compraId);
    }
  }

  onClose(): void {
    this.close.emit();
  }

  getPagamentoStatus(pag: CompraPagamento): string {
    if (!this.financialTransactions || this.financialTransactions.length === 0) {
      return 'PENDING';
    }

    const formatLocalDate = (dateStr: string | Date | undefined): string => {
      if (!dateStr) return '';
      if (dateStr instanceof Date) {
        return dateStr.toISOString().substring(0, 10);
      }
      return dateStr.substring(0, 10);
    };

    const pagDueDate = formatLocalDate(pag.vencimento);
    
    const match = this.financialTransactions.find(tx => {
      const txDueDate = formatLocalDate(tx.dueDate);
      const isSameDate = txDueDate === pagDueDate;
      const isSameAmount = Math.abs(tx.amount - pag.valor) < 0.01;
      
      const expectedTxType = pag.tipo === 'D' ? 'EXPENSE' : 'INCOME';
      const isSameType = tx.type === expectedTxType;

      return isSameDate && isSameAmount && isSameType;
    });

    return match ? match.status : 'PENDING';
  }
}
