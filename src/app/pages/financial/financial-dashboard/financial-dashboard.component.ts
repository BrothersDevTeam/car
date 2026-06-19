import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { ContentHeaderComponent } from '@components/content-header/content-header.component';
import { FinancialService } from '@services/financial.service';
import { AuthService } from '@services/auth/auth.service';
import { StoreContextService } from '@services/store-context.service';
import { Authorizations } from '../../../enums/authorizations';
import { FinancialSummary, FinancialTransaction } from '@interfaces/financial';
import { ManualTransactionDialogComponent } from './manual-transaction-dialog.component';

@Component({
  selector: 'app-financial-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatDialogModule,
    MatTooltipModule,
    ContentHeaderComponent,
  ],
  templateUrl: './financial-dashboard.component.html',
  styleUrl: './financial-dashboard.component.scss',
})
export class FinancialDashboardComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private financialService = inject(FinancialService);
  private authService = inject(AuthService);
  private storeContextService = inject(StoreContextService);
  private toastr = inject(ToastrService);
  private dialog = inject(MatDialog);

  private subscriptions: Subscription[] = [];

  // Permissões
  hasCreatePermission = false;
  hasEditPermission = false;

  // Dados
  summary: FinancialSummary | null = null;
  transactions: FinancialTransaction[] = [];
  
  // Tabela e Paginação
  displayedColumns: string[] = [
    'dueDate',
    'paymentDate',
    'description',
    'origin',
    'type',
    'amount',
    'status',
    'actions',
  ];
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;

  // Estados de Loading
  loadingSummary = true;
  loadingTransactions = true;

  // Filtros
  filterForm!: FormGroup;
  selectedStoreId: string | null = null;

  ngOnInit(): void {
    this.hasCreatePermission = this.authService.hasAuthority(Authorizations.CREATE_FINANCIAL_STORE);
    this.hasEditPermission = this.authService.hasAuthority(Authorizations.EDIT_FINANCIAL_STORE);

    this.filterForm = this.fb.group({
      type: [''],
      status: [''],
      description: [''],
    });

    // Escuta mudança global de loja
    this.subscriptions.push(
      this.storeContextService.currentStoreId$.subscribe((storeId) => {
        this.selectedStoreId = storeId;
        this.pageIndex = 0; // reseta paginação
        this.loadSummary();
        this.loadTransactions();
      })
    );

    // Escuta filtros
    this.subscriptions.push(
      this.filterForm.valueChanges.subscribe(() => {
        this.pageIndex = 0;
        this.loadTransactions();
      })
    );
  }

  loadSummary(): void {
    this.loadingSummary = true;
    this.financialService.getSummary(this.selectedStoreId || undefined).subscribe({
      next: (data) => {
        this.summary = data;
        this.loadingSummary = false;
      },
      error: (err) => {
        console.error('Error loading financial summary', err);
        this.toastr.error('Erro ao carregar o resumo financeiro.', 'Erro');
        this.loadingSummary = false;
      },
    });
  }

  loadTransactions(): void {
    this.loadingTransactions = true;
    const filters = {
      ...this.filterForm.value,
      storeId: this.selectedStoreId || undefined,
    };

    this.financialService.getTransactions(this.pageIndex, this.pageSize, filters).subscribe({
      next: (response) => {
        this.transactions = response.content;
        this.totalElements = response.page.totalElements;
        this.loadingTransactions = false;
      },
      error: (err) => {
        console.error('Error loading financial transactions', err);
        this.toastr.error('Erro ao carregar as transações financeiras.', 'Erro');
        this.loadingTransactions = false;
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadTransactions();
  }

  liquidar(transaction: FinancialTransaction): void {
    if (!this.hasEditPermission) {
      this.toastr.warning('Você não tem permissão para liquidar pagamentos.', 'Acesso Negado');
      return;
    }

    this.financialService.markAsPaid(transaction.financialTransactionId).subscribe({
      next: () => {
        this.toastr.success('Pagamento liquidado com sucesso!', 'Sucesso');
        this.loadSummary();
        this.loadTransactions();
      },
      error: (err) => {
        console.error('Error marking transaction as paid', err);
        this.toastr.error('Erro ao liquidar pagamento.', 'Erro');
      },
    });
  }

  openManualTransactionModal(): void {
    if (!this.storeContextService.validateStoreSelection()) {
      return;
    }
    const storeId = this.storeContextService.currentStoreId!;
    const dialogRef = this.dialog.open(ManualTransactionDialogComponent, {
      width: '450px',
      data: { storeId },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.financialService.createTransaction(result).subscribe({
          next: () => {
            this.toastr.success('Lançamento manual criado com sucesso!', 'Sucesso');
            this.loadSummary();
            this.loadTransactions();
          },
          error: (err) => {
            console.error('Error creating transaction', err);
            this.toastr.error('Erro ao criar lançamento manual.', 'Erro');
          },
        });
      }
    });
  }

  getOriginLabel(origin: string): string {
    switch (origin) {
      case 'MANUAL': return 'Manual';
      case 'VEHICLE_SALE': return 'Venda de Veículo';
      case 'VEHICLE_PURCHASE': return 'Compra de Veículo';
      default: return origin;
    }
  }

  getOriginIcon(origin: string): string {
    switch (origin) {
      case 'MANUAL': return 'edit_note';
      case 'VEHICLE_SALE': return 'shopping_cart';
      case 'VEHICLE_PURCHASE': return 'local_shipping';
      default: return 'help';
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
