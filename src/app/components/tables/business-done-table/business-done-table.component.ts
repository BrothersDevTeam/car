import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { PersonService } from '@services/person.service';
import { BusinessHistory } from '@interfaces/person';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-business-done-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatButtonModule,
    RouterModule,
  ],
  templateUrl: './business-done-table.component.html',
  styleUrl: './business-done-table.component.scss',
})
export class BusinessDoneTableComponent implements OnInit {
  @Input({ required: true }) personId!: string;

  private personService = inject(PersonService);

  history = signal<BusinessHistory | null>(null);
  loading = signal<boolean>(true);
  error = signal<boolean>(false);

  displayedColumns: string[] = ['type', 'date', 'vehicle', 'value', 'status', 'actions'];

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.loading.set(true);
    this.error.set(false);

    this.personService.getBusinessHistory(this.personId).subscribe({
      next: (data) => {
        this.history.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erro ao carregar histórico de negócios:', err);
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  getTransactionTypeLabel(type: string): string {
    return type === 'COMPRA' ? 'Aquisição' : 'Venda';
  }

  getTransactionTypeClass(type: string): string {
    return type === 'COMPRA' ? 'type-purchase' : 'type-sale';
  }

  getStatusClass(status: string): string {
    const s = status?.toUpperCase();
    if (s === 'CONCLUIDA' || s === 'FINALIZADA') return 'status-success';
    if (s === 'CANCELADA') return 'status-error';
    if (s === 'PENDENTE' || s === 'ABERTA') return 'status-warning';
    return 'status-default';
  }

  getStatusLabel(status: string): string {
    const s = status?.toUpperCase();
    if (s === 'CONCLUIDA') return 'Concluída';
    if (s === 'FINALIZADA') return 'Finalizada';
    if (s === 'CANCELADA') return 'Cancelada';
    if (s === 'PENDENTE') return 'Pendente';
    if (s === 'ABERTA') return 'Aberta';
    return status;
  }
}
