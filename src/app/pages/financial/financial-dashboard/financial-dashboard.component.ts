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
import { MatMenuModule } from '@angular/material/menu';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { ContentHeaderComponent } from '@components/content-header/content-header.component';
import { FinancialService } from '@services/financial.service';
import { AuthService } from '@services/auth/auth.service';
import { StoreContextService } from '@services/store-context.service';
import { CostCenterService } from '@services/cost-center.service';
import { Authorizations } from '../../../enums/authorizations';
import { FinancialSummary, FinancialTransaction } from '@interfaces/financial';
import { ManualTransactionDialogComponent } from './manual-transaction-dialog.component';
import { CostCentersManagementDialogComponent } from './cost-centers-management-dialog.component';
import { RecurringTransactionsManagementDialogComponent } from './recurring-transactions-management-dialog.component';
import { TransactionPaymentDialogComponent } from './transaction-payment-dialog.component';
import { TransactionPaymentsHistoryDialogComponent } from './transaction-payments-history-dialog.component';
import { StoreSettingsDialogComponent } from './store-settings-dialog.component';
import { CashRegistersManagementDialogComponent } from './cash-registers-management-dialog.component';

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
    MatMenuModule,
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
  private costCenterService = inject(CostCenterService);
  private toastr = inject(ToastrService);
  private dialog = inject(MatDialog);

  private subscriptions: Subscription[] = [];

  // Permissões
  hasCreatePermission = false;
  hasEditPermission = false;

  // Dados
  summary: FinancialSummary | null = null;
  transactions: FinancialTransaction[] = [];
  costCenters: { id: string; name: string }[] = [];

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
      costCenterId: [''],
    });

    // Escuta mudança global de loja
    this.subscriptions.push(
      this.storeContextService.currentStoreId$.subscribe((storeId) => {
        this.selectedStoreId = storeId;
        this.pageIndex = 0; // reseta paginação
        this.loadCostCenters();
        this.loadSummary();
        this.loadTransactions();
      }),
    );

    // Escuta filtros
    this.subscriptions.push(
      this.filterForm.valueChanges.subscribe(() => {
        this.pageIndex = 0;
        this.loadTransactions();
      }),
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

  loadCostCenters(): void {
    if (!this.selectedStoreId) {
      this.costCenters = [];
      return;
    }
    this.costCenterService.getAllCostCenters(this.selectedStoreId).subscribe({
      next: (response) => {
        this.costCenters = [{ id: '', name: 'Todos' }, ...this.formatCostCentersForSelect(response.content)];
      },
      error: (err) => {
        console.error('Error loading cost centers', err);
      },
    });
  }

  private formatCostCentersForSelect(list: any[]): { id: string; name: string }[] {
    const roots = list.filter((cc) => !cc.parentId);
    const result: { id: string; name: string }[] = [];

    const traverse = (node: any, depth: number) => {
      const prefix = '— '.repeat(depth);
      const typeLabel = node.type === 'REVENUE' ? ' (Receita)' : ' (Despesa)';
      result.push({
        id: node.costCenterId,
        name: prefix + node.name + typeLabel,
      });
      const children = list.filter((cc) => cc.parentId === node.costCenterId);
      children.forEach((child) => traverse(child, depth + 1));
    };

    roots.forEach((root) => traverse(root, 0));

    // Órfãos se houver
    list.forEach((node) => {
      if (!result.some((r) => r.id === node.costCenterId)) {
        result.push({
          id: node.costCenterId,
          name: node.name + (node.type === 'REVENUE' ? ' (Receita)' : ' (Despesa)'),
        });
      }
    });

    return result;
  }

  loadTransactions(): void {
    this.loadingTransactions = true;
    const rawFilters = this.filterForm.value;
    const filters = {
      type: rawFilters.type,
      status: rawFilters.status,
      description: rawFilters.description,
      costCenterId: rawFilters.costCenterId || undefined,
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

  openPaymentModal(transaction: FinancialTransaction): void {
    if (!this.hasEditPermission) {
      this.toastr.warning('Você não tem permissão para registrar pagamentos.', 'Acesso Negado');
      return;
    }

    const dialogRef = this.dialog.open(TransactionPaymentDialogComponent, {
      width: '500px',
      data: { transaction },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadSummary();
        this.loadTransactions();
      }
    });
  }

  openPaymentsHistoryModal(transaction: FinancialTransaction): void {
    this.dialog.open(TransactionPaymentsHistoryDialogComponent, {
      width: '700px',
      data: { transaction },
    });
  }

  openStoreSettingsModal(): void {
    if (!this.storeContextService.validateStoreSelection()) {
      return;
    }
    const storeId = this.storeContextService.currentStoreId!;
    this.dialog.open(StoreSettingsDialogComponent, {
      width: '450px',
      data: { storeId },
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

  openEditTransactionModal(transaction: FinancialTransaction): void {
    if (!this.storeContextService.validateStoreSelection()) {
      return;
    }
    const storeId = this.storeContextService.currentStoreId!;
    const dialogRef = this.dialog.open(ManualTransactionDialogComponent, {
      width: '450px',
      data: { storeId, transaction },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.financialService.updateTransaction(transaction.financialTransactionId, result).subscribe({
          next: () => {
            this.toastr.success('Lançamento atualizado com sucesso!', 'Sucesso');
            this.loadSummary();
            this.loadTransactions();
          },
          error: (err) => {
            console.error('Error updating transaction', err);
            this.toastr.error('Erro ao atualizar lançamento.', 'Erro');
          },
        });
      }
    });
  }

  cancelarLancamento(transaction: FinancialTransaction): void {
    if (!confirm(`Deseja realmente cancelar o lançamento "${transaction.description}"?`)) {
      return;
    }
    this.financialService.cancelTransaction(transaction.financialTransactionId).subscribe({
      next: () => {
        this.toastr.success('Lançamento cancelado com sucesso!', 'Sucesso');
        this.loadSummary();
        this.loadTransactions();
      },
      error: (err) => {
        console.error('Error cancelling transaction', err);
        this.toastr.error('Erro ao cancelar lançamento.', 'Erro');
      },
    });
  }

  reativarLancamento(transaction: FinancialTransaction): void {
    if (!this.hasEditPermission) {
      this.toastr.warning('Você não tem permissão para reativar lançamentos.', 'Acesso Negado');
      return;
    }
    if (!confirm(`Deseja realmente reativar o lançamento "${transaction.description}"?`)) {
      return;
    }
    this.financialService.reactivateTransaction(transaction.financialTransactionId).subscribe({
      next: () => {
        this.toastr.success('Lançamento reativado com sucesso!', 'Sucesso');
        this.loadSummary();
        this.loadTransactions();
      },
      error: (err) => {
        console.error('Error reactivating transaction', err);
        this.toastr.error('Erro ao reativar lançamento.', 'Erro');
      },
    });
  }

  openCostCentersManagementModal(): void {
    if (!this.storeContextService.validateStoreSelection()) {
      return;
    }
    const storeId = this.storeContextService.currentStoreId!;
    const dialogRef = this.dialog.open(CostCentersManagementDialogComponent, {
      width: '90%',
      maxWidth: '850px',
      height: '80%',
      maxHeight: '90vh',
      data: { storeId },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadCostCenters();
      this.loadTransactions();
    });
  }

  openRecurringTransactionsManagementModal(): void {
    if (!this.storeContextService.validateStoreSelection()) {
      return;
    }
    const storeId = this.storeContextService.currentStoreId!;
    const dialogRef = this.dialog.open(RecurringTransactionsManagementDialogComponent, {
      width: '800px',
      data: { storeId },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadCostCenters();
      this.loadSummary();
      this.loadTransactions();
    });
  }

  openCashRegistersManagementModal(): void {
    if (!this.storeContextService.validateStoreSelection()) {
      return;
    }
    const storeId = this.storeContextService.currentStoreId!;
    const dialogRef = this.dialog.open(CashRegistersManagementDialogComponent, {
      width: '90%',
      maxWidth: '850px',
      height: '80%',
      maxHeight: '90vh',
      data: { storeId },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadSummary();
      this.loadTransactions();
    });
  }

  getOriginLabel(origin: string): string {
    switch (origin) {
      case 'MANUAL':
        return 'Manual';
      case 'VEHICLE_SALE':
        return 'Venda de Veículo';
      case 'VEHICLE_PURCHASE':
        return 'Compra de Veículo';
      case 'RECURRING':
        return 'Recorrente';
      default:
        return origin;
    }
  }

  getOriginIcon(origin: string): string {
    switch (origin) {
      case 'MANUAL':
        return 'edit_note';
      case 'VEHICLE_SALE':
        return 'shopping_cart';
      case 'VEHICLE_PURCHASE':
        return 'local_shipping';
      case 'RECURRING':
        return 'autorenew';
      default:
        return 'help';
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
