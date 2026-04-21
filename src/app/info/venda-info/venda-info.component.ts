import { Component, Input, OnInit, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { VendaService } from '@services/venda.service';
import { NfeService } from '@services/nfe.service';
import { VendaResponseDto } from '@interfaces/venda';
import { Nfe } from '@interfaces/nfe';
import { catchError, forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-venda-info',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  providers: [DatePipe, CurrencyPipe],
  templateUrl: './venda-info.component.html',
  styleUrl: './venda-info.component.scss',
})
export class VendaInfoComponent implements OnInit {
  @Input() vendaId!: string;
  @Output() close = new EventEmitter<void>();
  @Output() edit = new EventEmitter<string>();

  private vendaService = inject(VendaService);
  private nfeService = inject(NfeService);
  private datePipe = inject(DatePipe);
  private currencyPipe = inject(CurrencyPipe);

  venda: VendaResponseDto | null = null;
  nfe: Nfe | null = null;
  loading = true;
  error = false;

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
        if (venda.nfeId) {
          this.loadNfeDetails(venda.nfeId);
        } else {
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
        return 'status-success';
      case 'CANCELADA':
      case 'CANCELADO':
        return 'status-danger';
      case 'TRANSFERENCIA':
      case 'PROCESSANDO':
        return 'status-warning';
      default:
        return 'status-neutral';
    }
  }

  getStatusLabel(status: string | undefined): string {
    if (!status) return '—';
    switch (status.toUpperCase()) {
      case 'ATIVA': return 'Ativa';
      case 'CANCELADA': return 'Cancelada';
      case 'TRANSFERENCIA': return 'Transferência';
      case 'PROCESSANDO_AUTORIZACAO': return 'Processando';
      case 'AUTORIZADO': return 'Autorizada';
      case 'ERRO_AUTORIZACAO': return 'Erro na SEFAZ';
      case 'RASCUNHO': return 'Em Digitação';
      default: return status;
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
    if (this.venda) {
      this.edit.emit(this.venda.vendaId);
    }
  }

  onClose(): void {
    this.close.emit();
  }
}
