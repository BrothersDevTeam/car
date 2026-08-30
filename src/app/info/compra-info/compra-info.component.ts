import { Component, Input, OnInit, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { CompraService } from '@services/compra.service';
import { NfeService } from '@services/nfe.service';
import { FinancialService } from '@services/financial.service';
import { StoreContextService } from '@services/store-context.service';
import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';
import { extractErrorMessage } from '@utils/error-utils';
import { Compra, CompraPagamento } from '@interfaces/compra';
import { Nfe } from '@interfaces/nfe';
import { FinancialTransaction } from '@interfaces/financial';
import { TransactionPaymentDialogComponent } from '../../pages/financial/financial-dashboard/transaction-payment-dialog.component';

@Component({
  selector: 'app-compra-info',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatDividerModule, MatTooltipModule, MatDialogModule],
  providers: [DatePipe, CurrencyPipe],
  templateUrl: './compra-info.component.html',
  styleUrl: './compra-info.component.scss',
})
export class CompraInfoComponent implements OnInit {
  @Input() compraId!: string;
  @Output() close = new EventEmitter<void>();
  @Output() edit = new EventEmitter<string>();
  @Output() nfeGenerated = new EventEmitter<void>();

  private compraService = inject(CompraService);
  private nfeService = inject(NfeService);
  private financialService = inject(FinancialService);
  private storeContextService = inject(StoreContextService);
  private toastrService = inject(ToastrService);
  private dialog = inject(MatDialog);
  private datePipe = inject(DatePipe);
  private currencyPipe = inject(CurrencyPipe);
  private router = inject(Router);

  compra: Compra | null = null;
  nfe: Nfe | null = null;
  financialTransactions: FinancialTransaction[] = [];
  loading = true;
  error = false;
  generatingNfe = false;
  isDownloadingDanfe = false;
  isDownloadingXml = false;

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
          this.nfe = null;
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
      },
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

  emitirNfe(): void {
    if (!this.storeContextService.validateStoreSelection()) return;
    if (!this.compra?.compraId) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Gerar NFe de Compra',
        message: `Deseja gerar a <strong style="color: var(--primary-color)">NFe de Compra (Entrada)</strong> para a compra do veículo <strong>${this.compra.vehiclePlate || ''}</strong>? <br><br> <small style="color: var(--text-secondary)">Os dados do fornecedor e do veículo serão importados automaticamente.</small>`,
        confirmText: 'Sim, Gerar',
        cancelText: 'Não',
        icon: 'receipt_long',
        type: 'primary',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.generatingNfe = true;
        this.compraService.gerarRascunhoNfe(this.compra!.compraId!).subscribe({
          next: () => {
            this.toastrService.success('Rascunho da NFe de Entrada gerado com sucesso!');
            this.generatingNfe = false;
            this.loadCompraDetails();
            this.nfeGenerated.emit();
          },
          error: (err) => {
            this.generatingNfe = false;
            const errorMessage = extractErrorMessage(err, 'Erro ao gerar NFe de Compra');
            this.toastrService.error(errorMessage);
          },
        });
      }
    });
  }

  openDanfe(): void {
    if (!this.nfe?.nfeId) return;
    const filename = `${this.nfe.nfeChave || this.nfe.nfeId}-danfe.pdf`;
    this.isDownloadingDanfe = true;
    this.toastrService.info('Iniciando download do DANFE...', 'Download DANFE');

    this.nfeService.downloadDanfe(this.nfe.nfeId).subscribe({
      next: (blob) => {
        this.nfeService.downloadFileFromBlob(blob, filename);
        this.isDownloadingDanfe = false;
        this.toastrService.success('Download do DANFE concluído com sucesso.', 'Sucesso');
      },
      error: (err) => {
        console.error('Erro ao baixar DANFE:', err);
        this.isDownloadingDanfe = false;
        if (this.nfe?.nfeDanfeUrl) {
          window.open(this.nfe.nfeDanfeUrl, '_blank');
        } else {
          this.toastrService.error('Não foi possível realizar o download do DANFE (PDF).', 'Erro no Download');
        }
      },
    });
  }

  openXml(): void {
    if (!this.nfe?.nfeId) return;
    const filename = `${this.nfe.nfeChave || this.nfe.nfeId}-nfe.xml`;
    this.isDownloadingXml = true;
    this.toastrService.info('Iniciando download do XML...', 'Download XML');

    this.nfeService.downloadXml(this.nfe.nfeId).subscribe({
      next: (blob) => {
        this.nfeService.downloadFileFromBlob(blob, filename);
        this.isDownloadingXml = false;
        this.toastrService.success('Download do XML concluído com sucesso.', 'Sucesso');
      },
      error: (err) => {
        console.error('Erro ao baixar XML:', err);
        this.isDownloadingXml = false;
        if (this.nfe?.nfeXmlUrl) {
          window.open(this.nfe.nfeXmlUrl, '_blank');
        } else {
          this.toastrService.error('Não foi possível realizar o download do XML.', 'Erro no Download');
        }
      },
    });
  }

  onEdit(): void {
    if (this.compra) {
      this.edit.emit(this.compra.compraId);
    }
  }

  onClose(): void {
    this.close.emit();
  }

  navigateToNfe(nfeId?: string): void {
    if (!nfeId) return;
    this.router.navigate(['/nfe'], { queryParams: { nfeId } });
  }

  navigateToPerson(personId?: string): void {
    if (!personId) return;
    this.router.navigate(['/person'], { queryParams: { editId: personId } });
  }

  navigateToVehicle(vehicleId?: string): void {
    if (!vehicleId) return;
    this.router.navigate(['/vehicle'], { queryParams: { editId: vehicleId } });
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

    const match = this.financialTransactions.find((tx) => {
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
