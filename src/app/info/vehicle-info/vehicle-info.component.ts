import { ToastrService } from 'ngx-toastr';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';

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

  proprietario: Person | null = null;

  @Input() vehicle!: VehicleForm;
  @Output() editEvent = new EventEmitter<VehicleForm>();
  @Output() formSubmitted = new EventEmitter<void>();

  constructor(
    private toastrService: ToastrService,
    private vehicleService: VehicleService,
    private personService: PersonService
  ) {}
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vehicle']) {
      // Se vendido, tentamos carregar os detalhes do comprador da venda
      if (
        this.vehicle?.status === 'VENDIDO' &&
        this.vehicle.salesHistory?.[0]?.buyerName
      ) {
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
    if (
      this.vehicle.status === 'VENDIDO' &&
      this.vehicle.salesHistory?.[0]?.valorFinal
    ) {
      return this.vehicle.salesHistory[0].valorFinal;
    }
    return this.vehicle.valorVenda ? parseFloat(this.vehicle.valorVenda) : 0;
  }

  get dataEntradaEfetiva(): string | undefined {
    return (
      this.vehicle.entryDate || this.vehicle.purchaseHistory?.[0]?.dataCompra
    );
  }

  get isVendaEfetiva(): boolean {
    return (
      this.vehicle.status === 'VENDIDO' &&
      !!this.vehicle.salesHistory?.[0]?.valorFinal
    );
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
      this.vehicle.purchaseHistory.forEach((c) => {
        timeline.push({
          date: c.dataCompra,
          description: `Comprado de ${c.supplierName || 'Fornecedor'}`,
          value: c.valorCompra,
          type: 'COMPRA',
          icon: 'input',
        });
      });
    }

    // Adiciona vendas
    if (this.vehicle.salesHistory) {
      this.vehicle.salesHistory.forEach((v) => {
        timeline.push({
          date: v.dataVenda,
          description: `Vendido para ${v.buyerName || 'Cliente'}`,
          value: v.valorFinal,
          type: 'VENDA',
          icon: 'output',
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

  onEdit() {
    this.editEvent.emit(this.vehicle);
  }

  onDelete() {
    this.openDialog();
  }

  openDialog() {
    const dialogRef: MatDialogRef<ConfirmDialogComponent> = this.dialog.open(
      ConfirmDialogComponent,
      {
        data: {
          title: 'Confirmar exclusão',
          message: `Deseja realmente excluir o veículo <strong>${this.vehicle.plate}</strong>?`,
          confirmText: 'Sim, excluir',
          cancelText: 'Cancelar',
        },
      }
    );

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
    } else {
      console.error('ID nao encontrado para exclusao');
      this.toastrService.error('ID nao encontrado para exclusao');
    }
  }
}
