import { ToastrService } from 'ngx-toastr';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';

import { NfeSummary, VehicleForm } from '@interfaces/vehicle';
import { VehicleService } from '@services/vehicle.service';
import { PersonService } from '@services/person.service';
import { FinancialService } from '@services/financial.service';
import { NfeService } from '@services/nfe.service';
import { FinancialTransaction } from '@interfaces/financial';
import { TransactionPaymentDialogComponent } from '../../pages/financial/financial-dashboard/transaction-payment-dialog.component';
import { Person } from '@interfaces/person';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FipeService } from '@services/fipe.service';
import { FuelType, FuelTypeLabels } from '../../enums/fuelType';

@Component({
  selector: 'app-vehicle-info',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatTabsModule,
    MatDialogModule,
    MatTooltipModule,
  ],
  templateUrl: './vehicle-info.component.html',
  styleUrl: './vehicle-info.component.scss',
})
export class VehicleInfoComponent implements OnChanges {
  readonly dialog = inject(MatDialog);
  private toastrService = inject(ToastrService);
  private vehicleService = inject(VehicleService);
  private personService = inject(PersonService);
  private financialService = inject(FinancialService);
  private nfeService = inject(NfeService);
  private fipeService = inject(FipeService);
  private router = inject(Router);

  isRefreshingFipe = signal(false);
  isDownloadingDanfe = signal<string | null>(null);
  isDownloadingXml = signal<string | null>(null);

  @Input() vehicle!: VehicleForm;
  proprietario: Person | null = null;
  fornecedor: Person | null = null;
  comprador: Person | null = null;
  financialTransactions: FinancialTransaction[] = [];

  @Output() editEvent = new EventEmitter<VehicleForm>();
  @Output() formSubmitted = new EventEmitter<void>();

  getFuelTypeLabel(fuel?: FuelType | string | null): string {
    if (!fuel) return '-';
    return FuelTypeLabels[fuel as FuelType] || fuel;
  }

  private getFipeVehicleType(vehicleType?: string): string {
    const typeMap: Record<string, string> = {
      MOTOCICLETA: 'motos',
      MOTO: 'motos',
      CAMINHAO: 'caminhoes',
      CAMINHONETE: 'caminhoes',
    };
    return typeMap[vehicleType || ''] || 'carros';
  }

  refreshFipeValue() {
    if (!this.vehicle || !this.vehicle.brand || !this.vehicle.model) {
      this.toastrService.warning('Informações de marca ou modelo incompletas para consultar a FIPE.', 'Tabela FIPE');
      return;
    }

    const fipeType = this.getFipeVehicleType(this.vehicle.vehicleType);
    const targetBrand = this.vehicle.brand.trim().toLowerCase();
    const targetModel = this.vehicle.model.trim().toLowerCase();
    const targetYear = (this.vehicle.modelYear || this.vehicle.vehicleYear || '').toString();

    this.isRefreshingFipe.set(true);

    this.fipeService.getMarcas(fipeType).subscribe({
      next: (marcas) => {
        const foundBrand = marcas.find(
          (b) =>
            b.nome.toLowerCase() === targetBrand ||
            targetBrand.includes(b.nome.toLowerCase()) ||
            b.nome.toLowerCase().includes(targetBrand),
        );

        if (!foundBrand) {
          this.isRefreshingFipe.set(false);
          this.toastrService.error('Marca não encontrada na Tabela FIPE.', 'Erro FIPE');
          return;
        }

        this.fipeService.getModelos(fipeType, foundBrand.codigo).subscribe({
          next: (modelosRes) => {
            const foundModel = modelosRes.modelos.find(
              (m) =>
                m.nome.toLowerCase() === targetModel ||
                targetModel.includes(m.nome.toLowerCase()) ||
                m.nome.toLowerCase().includes(targetModel),
            );

            if (!foundModel) {
              this.isRefreshingFipe.set(false);
              this.toastrService.error('Modelo não encontrado na Tabela FIPE.', 'Erro FIPE');
              return;
            }

            this.fipeService.getAnos(fipeType, foundBrand.codigo, foundModel.codigo).subscribe({
              next: (anos) => {
                const foundYear = anos.find((a) => a.nome.includes(targetYear) || a.codigo.startsWith(targetYear));
                const yearId = foundYear ? foundYear.codigo : anos.length > 0 ? anos[0].codigo : null;

                if (!yearId) {
                  this.isRefreshingFipe.set(false);
                  this.toastrService.warning('Ano/versão não encontrado na Tabela FIPE.', 'Tabela FIPE');
                  return;
                }

                this.fipeService.getVehicleDetails(fipeType, foundBrand.codigo, foundModel.codigo, yearId).subscribe({
                  next: (details) => {
                    this.isRefreshingFipe.set(false);
                    const previousValue = (this.vehicle.fipeValue || '').trim();
                    const newValue = (details.Valor || '').trim();

                    if (previousValue === newValue && previousValue !== '') {
                      this.toastrService.info(`O valor da Tabela FIPE permanece o mesmo (${newValue}).`, 'Sem alterações');
                      return;
                    }

                    this.vehicle.fipeValue = details.Valor;
                    this.toastrService.success(`Tabela FIPE atualizada: ${details.Valor}`, 'Sucesso');

                    if (this.vehicle.vehicleId) {
                      this.vehicleService.update(this.vehicle as any).subscribe({
                        next: () => {
                          // Salvo com sucesso no banco de dados sem fechar o modal
                        },
                        error: (err) => {
                          console.error('Erro ao salvar FIPE no veículo:', err);
                        },
                      });
                    }
                  },
                  error: () => {
                    this.isRefreshingFipe.set(false);
                    this.toastrService.error('Erro ao consultar detalhes na FIPE.', 'Erro');
                  },
                });
              },
              error: () => {
                this.isRefreshingFipe.set(false);
                this.toastrService.error('Erro ao consultar anos na FIPE.', 'Erro');
              },
            });
          },
          error: () => {
            this.isRefreshingFipe.set(false);
            this.toastrService.error('Erro ao consultar modelos na FIPE.', 'Erro');
          },
        });
      },
      error: () => {
        this.isRefreshingFipe.set(false);
        this.toastrService.error('Erro ao consultar marcas na FIPE.', 'Erro');
      },
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vehicle'] && this.vehicle) {
      const ownerId = this.vehicle.owner;
      const supplierId = this.vehicle.supplierId || this.vehicle.purchaseHistory?.[0]?.supplierId;
      const buyerId = this.vehicle.salesHistory?.[0]?.buyerId;

      this.loadFinancialTransactions();

      // Carrega Comprador
      if (buyerId) {
        this.personService.getById(buyerId).subscribe({
          next: (person) => (this.comprador = person),
          error: (error) => {
            console.error('Erro ao carregar comprador:', error);
            this.comprador = null;
          },
        });
      } else {
        this.comprador = null;
      }

      // Se proprietário e fornecedor forem a mesma pessoa, fazemos apenas uma chamada
      if (ownerId && supplierId && ownerId === supplierId) {
        this.personService.getById(ownerId).subscribe({
          next: (person) => {
            this.proprietario = person;
            this.fornecedor = person;
          },
          error: (error) => {
            console.error('Erro ao carregar pessoa (proprietário/fornecedor):', error);
            this.proprietario = null;
            this.fornecedor = null;
          },
        });
      } else {
        // Caso sejam diferentes, carrega individualmente (se existirem)
        if (ownerId) {
          this.personService.getById(ownerId).subscribe({
            next: (person) => (this.proprietario = person),
            error: (error) => {
              console.error('Erro ao carregar proprietário:', error);
              this.proprietario = null;
            },
          });
        } else {
          this.proprietario = null;
        }

        if (supplierId) {
          this.personService.getById(supplierId).subscribe({
            next: (person) => (this.fornecedor = person),
            error: (error) => {
              console.error('Erro ao carregar fornecedor:', error);
              this.fornecedor = null;
            },
          });
        } else {
          this.fornecedor = null;
        }
      }
    }
  }

  loadFinancialTransactions(): void {
    const purchase = this.vehicle.purchaseHistory?.[0];
    if (!purchase || !purchase.compraId) {
      this.financialTransactions = [];
      return;
    }
    this.financialService.getTransactions(0, 50, { referenceId: purchase.compraId }).subscribe({
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

  getTransactionStatusClass(status: string | undefined): string {
    if (!status) return '';
    switch (status.toUpperCase()) {
      case 'PAID':
      case 'PAGO':
        return 'status-success';
      case 'CANCELLED':
      case 'CANCELADO':
        return 'status-danger';
      case 'PENDING':
      case 'PENDENTE':
      case 'PARTIALLY_PAID':
        return 'status-warning';
      default:
        return 'status-neutral';
    }
  }

  getTransactionStatusLabel(status: string | undefined): string {
    if (!status) return '—';
    switch (status.toUpperCase()) {
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

  get valorCompraEfetivo(): number {
    if (this.vehicle.valorCompra && parseFloat(this.vehicle.valorCompra) > 0) {
      return parseFloat(this.vehicle.valorCompra);
    }
    return this.vehicle.purchaseHistory?.[0]?.valorCompra || 0;
  }

  get valorVendaEfetivo(): number {
    // Se está vendido, prioriza o valor da venda finalizada
    if (this.vehicle.status === 'VENDIDO' && this.vehicle.salesHistory?.[0]?.valorFinal) {
      return this.vehicle.salesHistory[0].valorFinal;
    }
    return this.vehicle.valorVenda ? parseFloat(this.vehicle.valorVenda) : 0;
  }

  get dataEntradaEfetiva(): string | undefined {
    return this.vehicle.entryDate || this.vehicle.purchaseHistory?.[0]?.dataCompra;
  }

  get isVendaEfetiva(): boolean {
    return this.vehicle.status === 'VENDIDO' && !!this.vehicle.salesHistory?.[0]?.valorFinal;
  }

  get isCompraEfetiva(): boolean {
    return (
      !!this.vehicle.purchaseHistory?.[0]?.valorCompra &&
      (!this.vehicle.valorCompra || parseFloat(this.vehicle.valorCompra) === 0)
    );
  }

  get historyTimeline(): any[] {
    const timeline: any[] = [];

    // Adiciona compras
    if (this.vehicle.purchaseHistory) {
      this.vehicle.purchaseHistory.forEach((compra) => {
        timeline.push({
          date: compra.dataCompra || this.vehicle.dataCompra,
          title: 'Entrada no Estoque (Compra)',
          description: `Veículo adquirido de ${compra.supplierName || this.vehicle.supplierName || 'Fornecedor'}`,
          value: compra.valorCompra || this.vehicle.valorCompra,
          type: 'COMPRA',
          icon: 'input',
          personId: compra.supplierId || this.vehicle.supplierId,
          compraId: compra.compraId,
        });
      });
    }

    // Adiciona vendas
    if (this.vehicle.salesHistory) {
      this.vehicle.salesHistory.forEach((v) => {
        timeline.push({
          date: v.dataVenda,
          title: 'Saída do Estoque (Venda)',
          description: `Veículo vendido para ${v.buyerName || 'Cliente'}`,
          value: v.valorFinal,
          type: 'VENDA',
          icon: 'output',
          personId: v.buyerId,
          vendaId: v.vendaId,
        });
      });
    }

    // Ordena por data (mais recente primeiro)
    return timeline.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
  }

  get isVendido(): boolean {
    const s = this.vehicle?.status?.toUpperCase() || '';
    return (
      s === 'VENDIDO' ||
      !!this.vehicle?.exitDate ||
      (this.vehicle?.salesHistory?.length ?? 0) > 0
    );
  }

  get statusLabel(): string {
    if (this.isVendido) {
      return 'Vendido';
    }
    const s = this.vehicle?.status?.toUpperCase() || '';
    if (s === 'RESERVADO') {
      return 'Reservado';
    }
    return 'Em Estoque';
  }

  get statusClass(): string {
    if (this.isVendido) {
      return 'chip-vendido';
    }
    const s = this.vehicle?.status?.toUpperCase() || '';
    if (s === 'RESERVADO') {
      return 'chip-reservado';
    }
    return 'chip-disponivel';
  }

  onEdit() {
    this.editEvent.emit(this.vehicle);
  }

  onDelete() {
    this.openDialog();
  }

  openDialog() {
    const dialogRef: MatDialogRef<ConfirmDialogComponent> = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirmar exclusão',
        message: `Deseja realmente excluir o veículo <strong>${this.vehicle.plate}</strong>?`,
        confirmText: 'Sim, excluir',
        cancelText: 'Cancelar',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.deleteConfirmed();
      }
    });
  }

  deleteConfirmed() {
    if (this.vehicle.vehicleId) {
      this.vehicleService.delete(this.vehicle.vehicleId).subscribe({
        next: (response) => {
          console.log('Exclusão bem-sucedida', response);
          this.toastrService.success('Exclusão bem-sucedida');
          this.formSubmitted.emit();
        },
        error: (error) => {
          console.error('Erro ao excluir veículo', error);
          this.toastrService.error('Erro ao excluir veículo');
        },
      });
    }
  }

  get compraAtiva(): any {
    return this.vehicle?.purchaseHistory?.[0];
  }

  get vendaAtiva(): any {
    return this.vehicle?.salesHistory?.[0];
  }

  navigateToPerson(personId?: string) {
    if (!personId) return;
    this.router.navigate(['/person'], { queryParams: { editId: personId } });
  }

  navigateToNfe(nfeId?: string) {
    if (!nfeId) return;
    this.router.navigate(['/nfe'], { queryParams: { nfeId } });
  }

  navigateToCompra(compraId?: string) {
    if (this.vehicle?.plate) {
      this.router.navigate(['/compras'], { queryParams: { search: this.vehicle.plate } });
    } else {
      this.router.navigate(['/compras']);
    }
  }

  navigateToVenda(vendaId?: string) {
    if (this.vehicle?.plate) {
      this.router.navigate(['/vendas'], { queryParams: { search: this.vehicle.plate } });
    } else {
      this.router.navigate(['/vendas']);
    }
  }

  registrarCompra() {
    if (this.vehicle?.vehicleId) {
      this.router.navigate(['/compras/nova'], { queryParams: { vehicleId: this.vehicle.vehicleId } });
    } else {
      this.router.navigate(['/compras/nova']);
    }
  }

  registrarVenda() {
    if (this.vehicle?.vehicleId) {
      this.router.navigate(['/vendas/nova'], { queryParams: { vehicleId: this.vehicle.vehicleId } });
    } else {
      this.router.navigate(['/vendas/nova']);
    }
  }

  get nfeEntrada(): NfeSummary | undefined {
    return this.vehicle?.nfeHistory?.find((n) => n.nfeTipoDocumento === '0');
  }

  get nfeSaida(): NfeSummary | undefined {
    return this.vehicle?.nfeHistory?.find((n) => n.nfeTipoDocumento === '1');
  }

  getNfeStatusLabel(status?: string): string {
    if (!status) return 'Rascunho';
    switch (status.toLowerCase()) {
      case 'autorizado':
        return 'Autorizada';
      case 'processando':
        return 'Processando';
      case 'cancelado':
        return 'Cancelada';
      case 'erro':
        return 'Erro';
      default:
        return status;
    }
  }

  getNfeStatusClass(status?: string): string {
    if (!status) return 'status-neutral';
    switch (status.toLowerCase()) {
      case 'autorizado':
        return 'status-success';
      case 'cancelado':
      case 'erro':
        return 'status-danger';
      case 'processando':
        return 'status-warning';
      default:
        return 'status-neutral';
    }
  }

  downloadNfeDanfe(nfe: NfeSummary) {
    if (!nfe || !nfe.nfeId) return;
    if (nfe.nfeStatus?.toLowerCase() !== 'autorizado') {
      this.toastrService.info(
        'O DANFE (PDF) só está disponível para download após a autorização da NFe.',
        'NFe não autorizada',
      );
      return;
    }

    this.isDownloadingDanfe.set(nfe.nfeId);
    const filename = `${nfe.nfeChave || nfe.nfeId}-danfe.pdf`;

    this.nfeService.downloadDanfe(nfe.nfeId).subscribe({
      next: (blob) => {
        this.isDownloadingDanfe.set(null);
        this.nfeService.downloadFileFromBlob(blob, filename);
        this.toastrService.success('Download do DANFE concluído com sucesso.', 'Sucesso');
      },
      error: (err) => {
        this.isDownloadingDanfe.set(null);
        console.error('Erro ao baixar DANFE:', err);
        this.toastrService.error('Não foi possível realizar o download do DANFE (PDF).', 'Erro no Download');
      },
    });
  }

  downloadNfeXml(nfe: NfeSummary) {
    if (!nfe || !nfe.nfeId) return;
    if (nfe.nfeStatus?.toLowerCase() !== 'autorizado') {
      this.toastrService.info(
        'O XML só está disponível para download após a autorização da NFe.',
        'NFe não autorizada',
      );
      return;
    }

    this.isDownloadingXml.set(nfe.nfeId);
    const filename = `${nfe.nfeChave || nfe.nfeId}-nfe.xml`;

    this.nfeService.downloadXml(nfe.nfeId).subscribe({
      next: (blob) => {
        this.isDownloadingXml.set(null);
        this.nfeService.downloadFileFromBlob(blob, filename);
        this.toastrService.success('Download do XML concluído com sucesso.', 'Sucesso');
      },
      error: (err) => {
        this.isDownloadingXml.set(null);
        console.error('Erro ao baixar XML:', err);
        this.toastrService.error('Não foi possível realizar o download do XML.', 'Erro no Download');
      },
    });
  }
}
