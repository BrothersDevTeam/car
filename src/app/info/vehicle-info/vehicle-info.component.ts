import { ToastrService } from 'ngx-toastr';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';

import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';

import { VehicleForm } from '@interfaces/vehicle';
import { VehicleService } from '@services/vehicle.service';
import { PersonService } from '@services/person.service';
import { Person } from '@interfaces/person';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';

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
  ],
  templateUrl: './vehicle-info.component.html',
  styleUrl: './vehicle-info.component.scss',
})
export class VehicleInfoComponent implements OnChanges {
  readonly dialog = inject(MatDialog);

  @Input() vehicle!: VehicleForm;
  proprietario: Person | null = null;
  fornecedor: Person | null = null;

  @Output() editEvent = new EventEmitter<VehicleForm>();
  @Output() formSubmitted = new EventEmitter<void>();

  constructor(
    private toastrService: ToastrService,
    private vehicleService: VehicleService,
    private personService: PersonService,
    private router: Router,
  ) {}
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vehicle']) {
      // Se vendido, tentamos carregar os detalhes do comprador da venda
      if (this.vehicle?.status === 'VENDIDO' && this.vehicle.salesHistory?.[0]?.buyerName) {
        // Opcional: Poderíamos buscar o Person completo do comprador aqui se necessário
        // Por enquanto vamos usar os dados do histórico para exibição rápida
      }

      if (this.vehicle?.owner) {
        // Busca o proprietário quando o veículo mudar
        this.personService.getById(this.vehicle.owner).subscribe({
          next: (person) => {
            this.proprietario = person;
          },
          error: (error) => {
            console.error('Erro ao carregar proprietário:', error);
            this.proprietario = null;
          },
        });
      } else {
        this.proprietario = null;
      }

      if (this.vehicle?.supplierId) {
        // Busca o fornecedor quando o veículo mudar
        this.personService.getById(this.vehicle.supplierId).subscribe({
          next: (person) => {
            this.fornecedor = person;
          },
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
        });
      });
    }

    // Adiciona vendas
    if (this.vehicle.salesHistory) {
      this.vehicle.salesHistory.forEach((v) => {
        timeline.push({
          date: v.dataVenda,
          title: 'Venda Realizada',
          description: `Veículo vendido para ${v.buyerName}`,
          value: v.valorFinal,
          type: 'VENDA',
          icon: 'shopping_cart_checkout',
          personId: v.buyerId,
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

  get statusLabel(): string {
    const s = this.vehicle?.status?.toUpperCase() || '';
    // Se estiver vazio, assumimos que está em estoque por padrão
    if (!s || s.includes('DISPONIVEL') || s.includes('DISPONÍVEL')) {
      return 'Em Estoque';
    }
    if (s === 'VENDIDO') {
      return 'Vendido';
    }
    if (s === 'RESERVADO') {
      return 'Reservado';
    }
    return s;
  }

  get statusClass(): string {
    const s = this.vehicle?.status?.toUpperCase() || '';
    if (!s || s.includes('DISPONIVEL') || s.includes('DISPONÍVEL')) {
      return 'chip-disponivel';
    }
    if (s === 'VENDIDO') {
      return 'chip-vendido';
    }
    if (s === 'RESERVADO') {
      return 'chip-reservado';
    }
    return '';
  }

  get isVendido(): boolean {
    return this.vehicle?.status?.toUpperCase() === 'VENDIDO';
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

  navigateToPerson(personId?: string) {
    if (!personId) return;
    this.router.navigate(['/person'], { queryParams: { editId: personId } });
  }
}
