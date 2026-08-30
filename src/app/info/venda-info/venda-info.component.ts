import { Component, Input, OnInit, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ToastrService } from 'ngx-toastr';
import { VendaService } from '@services/venda.service';
import { NfeService } from '@services/nfe.service';
import { FinancialService } from '@services/financial.service';
import { StoreContextService } from '@services/store-context.service';
import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';
import { extractErrorMessage } from '@utils/error-utils';
import { VendaResponseDto, PagamentoResponse } from '@interfaces/venda';
import { Nfe } from '@interfaces/nfe';
import { FinancialTransaction } from '@interfaces/financial';
import { TransactionPaymentDialogComponent } from '../../pages/financial/financial-dashboard/transaction-payment-dialog.component';

@Component({
  selector: 'app-venda-info',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  providers: [DatePipe, CurrencyPipe],
  templateUrl: './venda-info.component.html',
  styleUrl: './venda-info.component.scss',
})
export class VendaInfoComponent implements OnInit {
  @Input() vendaId!: string;
  @Output() close = new EventEmitter<void>();
  @Output() edit = new EventEmitter<string>();
  @Output() nfeGenerated = new EventEmitter<void>();

  private vendaService = inject(VendaService);
  private nfeService = inject(NfeService);
  private financialService = inject(FinancialService);
  private storeContextService = inject(StoreContextService);
  private toastrService = inject(ToastrService);
  private dialog = inject(MatDialog);
  private datePipe = inject(DatePipe);
  private currencyPipe = inject(CurrencyPipe);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  venda: VendaResponseDto | null = null;
  nfe: Nfe | null = null;
  financialTransactions: FinancialTransaction[] = [];
  loading = true;
  error = false;
  generatingNfe = false;
  isDownloadingDanfe = false;
  isDownloadingXml = false;

  ngOnInit(): void {
    if (this.vendaId) {
      this.loadVendaDetails();
    }
  }

  loadVendaDetails(): void {
    this.loading = true;
    this.vendaService.getVendaById(this.vendaId).subscribe({
      next: (venda: VendaResponseDto) => {
        this.venda = venda;
        this.loadFinancialTransactions();
        if (venda.nfeId) {
          this.loadNfeDetails(venda.nfeId);
        } else {
          this.nfe = null;
          this.loading = false;
        }
      },
      error: (err: any) => {
        console.error('Erro ao carregar venda:', err);
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
    if (!this.vendaId) return;
    this.financialService.getTransactions(0, 50, { referenceId: this.vendaId }).subscribe({
      next: (res) => {
        this.financialTransactions = res.content;
      },
      error: (err) => {
        console.error('Erro ao carregar lançamentos financeiros da venda', err);
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

  formatDate(date: string | undefined): string {
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
      case 'TRANSFERENCIA':
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
      case 'TRANSFERENCIA':
        return 'Transferência';
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
    if (!this.venda?.vendaId) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Gerar NFe de Venda',
        message: `Deseja gerar a <strong style="color: var(--primary-color)">NFe de Venda (Saída)</strong> para a venda <strong>#${this.venda.numero || ''}</strong>? <br><br> <small style="color: var(--text-secondary)">Os dados do comprador e do veículo serão importados automaticamente.</small>`,
        confirmText: 'Sim, Gerar',
        cancelText: 'Não',
        icon: 'output',
        type: 'primary',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.generatingNfe = true;
        this.vendaService.gerarNfe(this.venda!.vendaId, this.venda!.storeId).subscribe({
          next: () => {
            this.toastrService.success('Rascunho da NFe de Saída gerado com sucesso! A emissão foi disparada.');
            this.generatingNfe = false;
            this.loadVendaDetails();
            this.nfeGenerated.emit();
          },
          error: (err) => {
            this.generatingNfe = false;
            const errorMessage = extractErrorMessage(err, 'Erro ao gerar NFe de Venda');
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
    if (this.venda) {
      this.edit.emit(this.venda.vendaId);
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

  getPagamentoStatus(pag: PagamentoResponse): string {
    if (!this.financialTransactions || this.financialTransactions.length === 0) {
      return 'PENDING';
    }

    const formatLocalDate = (dateStr: string | undefined): string => {
      if (!dateStr) return '';
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

  isTradeTransaction(tx: FinancialTransaction): boolean {
    return tx.description ? tx.description.startsWith('[TROCA]') : false;
  }

  confirmTradePayment(pag: PagamentoResponse): void {
    const formattedAmount = this.formatCurrency(pag.valor);
    const confirmacao = confirm(
      `Confirma o recebimento físico do veículo de troca?\n` +
        `Os lançamentos financeiros gerados por ele (Entrada e Saída no valor de ${formattedAmount}) serão liquidados simultaneamente.`,
    );

    if (confirmacao) {
      this.loading = true;
      this.vendaService.confirmarTroca(this.vendaId, pag.vendaPagamentoId).subscribe({
        next: (vendaUpdated) => {
          this.venda = vendaUpdated;
          this.snackBar.open('Troca confirmada e lançamentos liquidados com sucesso!', 'Fechar', {
            duration: 5000,
            panelClass: ['snackbar-success'],
          });
          this.loadFinancialTransactions();
          this.loading = false;
        },
        error: (err) => {
          console.error('Erro ao confirmar troca:', err);
          this.snackBar.open('Erro ao confirmar troca. Tente novamente.', 'Fechar', {
            duration: 5000,
            panelClass: ['snackbar-error'],
          });
          this.loading = false;
        },
      });
    }
  }
}
