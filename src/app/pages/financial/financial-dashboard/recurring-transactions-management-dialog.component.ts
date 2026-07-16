import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { ToastrService } from 'ngx-toastr';
import { RecurringTransactionService } from '@services/recurring-transaction.service';
import { FinancialCategoryService } from '@services/financial-category.service';
import { IRecurringTransaction } from '@interfaces/recurring-transaction';
import { CustomSelectComponent } from '@components/custom-select/custom-select.component';
import { IFinancialCategory } from '@interfaces/financial-category';
import { CurrencyInputComponent } from '@components/currency-input/currency-input.component';

@Component({
  selector: 'app-recurring-transactions-management-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    MatMenuModule,
    CustomSelectComponent,
    CurrencyInputComponent,
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon>autorenew</mat-icon>
      <span>Lançamentos Recorrentes</span>
    </h2>

    <mat-dialog-content class="dialog-content">
      <!-- MODO LISTA -->
      <ng-container *ngIf="viewMode === 'list'">
        <div class="list-header">
          <div class="header-left-section">
            <span class="subtitle">Despesas ou receitas recorrentes geradas mensalmente</span>
            <div class="filter-row">
              <mat-form-field appearance="outline" class="filter-field search-field">
                <mat-label>Buscar por descrição...</mat-label>
                <input
                  matInput
                  [value]="filterDescription"
                  (input)="onDescriptionInput($event)"
                  placeholder="Ex: Telnet, telefone..."
                />
                <mat-icon matSuffix>search</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" class="filter-field status-field">
                <mat-label>Status</mat-label>
                <mat-select [(value)]="filterStatus" (selectionChange)="onFilterChange()">
                  <mat-option value="">Todos</mat-option>
                  <mat-option value="ACTIVE">Ativos</mat-option>
                  <mat-option value="INACTIVE">Inativos</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="filter-field financial-category-field">
                <mat-label>Categoria Financeira</mat-label>
                <mat-select [(value)]="filterFinancialCategoryId" (selectionChange)="onFilterChange()">
                  <mat-option value="">Todos</mat-option>
                  @for (cc of financialCategories; track cc.id) {
                    <mat-option [value]="cc.id">{{ cc.name }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
          </div>
          <button mat-raised-button color="primary" (click)="startCreate()" class="btn-create">
            <mat-icon>add</mat-icon>
            Nova Recorrência
          </button>
        </div>

        <div class="table-wrapper">
          <table mat-table [dataSource]="recurringTransactions" class="w-100">
            <!-- Descrição -->
            <ng-container matColumnDef="description">
              <th mat-header-cell *matHeaderCellDef>Descrição</th>
              <td mat-cell *matCellDef="let r" class="font-weight-500">
                {{ r.description }}
                <div *ngIf="r.financialCategory" class="cc-tag">
                  <mat-icon>label</mat-icon>
                  {{ r.financialCategory.name }}
                </div>
              </td>
            </ng-container>

            <!-- Valor -->
            <ng-container matColumnDef="amount">
              <th mat-header-cell *matHeaderCellDef>Valor</th>
              <td
                mat-cell
                *matCellDef="let r"
                [class.income]="r.type === 'INCOME'"
                [class.expense]="r.type === 'EXPENSE'"
                class="font-weight-600"
              >
                {{ r.amount | currency: 'BRL' : 'symbol' : '1.2-2' }}
              </td>
            </ng-container>

            <!-- Vencimento -->
            <ng-container matColumnDef="dueDay">
              <th mat-header-cell *matHeaderCellDef>Dia Venc.</th>
              <td mat-cell *matCellDef="let r">Dia {{ r.dueDay }}</td>
            </ng-container>

            <!-- Status -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let r">
                <span
                  class="status-badge"
                  [class.active]="r.status === 'ACTIVE'"
                  [class.inactive]="r.status === 'INACTIVE'"
                >
                  {{ r.status === 'ACTIVE' ? 'Ativo' : 'Inativo' }}
                </span>
              </td>
            </ng-container>

            <!-- Ações -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef style="width: 80px;">Ações</th>
              <td mat-cell *matCellDef="let r">
                <button
                  type="button"
                  mat-icon-button
                  [matMenuTriggerFor]="menu"
                  (click)="$event.stopPropagation()"
                  aria-label="Ações"
                >
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item (click)="startEdit(r)" class="custom-menu-item">
                    <mat-icon class="menu-action-icon">edit</mat-icon>
                    <span class="menu-action-label">Editar</span>
                  </button>
                  <button mat-menu-item (click)="deleteRecurring(r)" class="custom-menu-item menu-action-warn">
                    <mat-icon class="menu-action-icon">delete</mat-icon>
                    <span class="menu-action-label">Excluir</span>
                  </button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>

          <div *ngIf="recurringTransactions.length === 0" class="empty-state">
            <p>Nenhum lançamento recorrente cadastrado nesta loja.</p>
          </div>
        </div>
      </ng-container>

      <!-- MODO FORMULÁRIO -->
      <ng-container *ngIf="viewMode === 'form'">
        <div class="form-header">
          <button mat-button type="button" (click)="setViewMode('list')">
            <mat-icon>arrow_back</mat-icon>
            Voltar para a Lista
          </button>
          <h3>{{ editingId ? 'Editar Recorrência' : 'Cadastrar Nova Recorrência' }}</h3>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="recurring-form">
          <div class="form-row">
            <mat-form-field appearance="outline" class="flex-grow">
              <mat-label>Descrição</mat-label>
              <input matInput formControlName="description" placeholder="Ex: Assinatura de software, Aluguel..." />
              <mat-error *ngIf="form.get('description')?.hasError('required')">A descrição é obrigatória</mat-error>
            </mat-form-field>
          </div>

          <div class="form-row">
            <mat-form-field appearance="outline" class="flex-grow">
              <mat-label>Tipo de Recorrência</mat-label>
              <mat-select formControlName="type">
                <mat-option value="EXPENSE">Despesa / Saída</mat-option>
                <mat-option value="INCOME">Receita / Entrada</mat-option>
              </mat-select>
              <mat-error *ngIf="form.get('type')?.hasError('required')">O tipo é obrigatório</mat-error>
            </mat-form-field>

            <app-currency-input
              formControlName="amount"
              label="Valor"
              [required]="true"
              [error]="!!(form.get('amount')?.touched && form.get('amount')?.invalid)"
              errorMessage="O valor deve ser maior que zero"
              class="flex-grow"
            ></app-currency-input>
          </div>

          <div class="form-row">
            <mat-form-field appearance="outline" class="flex-grow">
              <mat-label>Dia de Vencimento</mat-label>
              <input matInput type="number" formControlName="dueDay" placeholder="Ex: 10" min="1" max="31" step="1" />
              <mat-error *ngIf="form.get('dueDay')?.hasError('required')">O dia é obrigatório</mat-error>
              <mat-error *ngIf="form.get('dueDay')?.hasError('min') || form.get('dueDay')?.hasError('max')">
                Dia inválido (1 a 31)
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="flex-grow">
              <mat-label>Data de Início</mat-label>
              <input matInput type="date" formControlName="startDate" />
              <mat-error *ngIf="form.get('startDate')?.hasError('required')">A data de início é obrigatória</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="flex-grow">
              <mat-label>Data de Término (Opcional)</mat-label>
              <input matInput type="date" formControlName="endDate" />
            </mat-form-field>
          </div>

          <div class="form-row" style="margin-bottom: 8px;">
            <app-custom-select
              listType="financial_category"
              label="Categoria Financeira"
              [options]="formFinancialCategories"
              [control]="$any(form.get('financialCategory'))"
              placeholder="Selecione a categoria financeira"
              class="flex-grow"
            ></app-custom-select>
          </div>

          <div class="form-actions-row">
            <button mat-button type="button" (click)="setViewMode('list')">Cancelar</button>
            <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid">
              <mat-icon>save</mat-icon>
              Salvar
            </button>
          </div>
        </form>
      </ng-container>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-raised-button mat-dialog-close color="accent">Fechar</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dialog-title {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--mat-sys-primary, #1976d2);
        font-weight: 600;
        margin-bottom: 8px;
      }
      .dialog-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-width: 600px;
        max-width: 800px;
        padding-top: 8px !important;
      }
      .list-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-bottom: 16px;
        gap: 16px;
        flex-wrap: wrap;
      }
      .header-left-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex-grow: 1;

        .subtitle {
          font-size: 0.85rem;
          color: rgba(0, 0, 0, 0.6);
        }
      }
      .filter-row {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        align-items: center;
      }
      .filter-field {
        margin: 0;

        ::ng-deep .mat-mdc-text-field-wrapper {
          height: 48px !important;
        }
        ::ng-deep .mat-mdc-form-field-flex {
          height: 48px !important;
          align-items: center !important;
        }
        ::ng-deep .mat-mdc-form-field-infix {
          padding-top: 10px !important;
          padding-bottom: 10px !important;
          min-height: 48px !important;
        }
        ::ng-deep .mat-mdc-form-field-subscript-wrapper {
          display: none !important;
        }
      }
      .search-field {
        width: 280px;
      }
      .status-field {
        width: 120px;
      }
      .financial-category-field {
        width: 160px;
      }
      .btn-create {
        height: 48px;
        align-self: flex-end;
      }
      .form-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 12px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        padding-bottom: 8px;

        h3 {
          margin: 0;
          font-weight: 600;
        }
      }
      .recurring-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: rgba(0, 0, 0, 0.01);
        padding: 16px;
        border-radius: 8px;
        border: 1px solid rgba(0, 0, 0, 0.04);
      }
      .form-row {
        display: flex;
        gap: 12px;
        width: 100%;
        flex-wrap: wrap;
      }
      .form-actions-row {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 8px;
      }
      .flex-grow {
        flex: 1;
        min-width: 180px;
      }
      .table-wrapper {
        max-height: 350px;
        overflow-y: auto;
        overflow-x: auto;
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 4px;
      }
      .status-badge {
        font-size: 0.72rem;
        padding: 3px 8px;
        border-radius: 12px;
        font-weight: 600;
        display: inline-block;
      }
      .status-badge.active {
        background-color: rgba(46, 125, 50, 0.1);
        color: #2e7d32;
      }
      .status-badge.inactive {
        background-color: rgba(0, 0, 0, 0.06);
        color: rgba(0, 0, 0, 0.54);
      }
      .w-100 {
        width: 100%;
      }
      .cc-tag {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        font-size: 0.75rem;
        background: rgba(25, 118, 210, 0.08);
        color: #1976d2;
        padding: 1px 6px;
        border-radius: 4px;
        margin-top: 4px;
        font-weight: 500;
        max-width: fit-content;

        mat-icon {
          font-size: 11px;
          width: 11px;
          height: 11px;
          margin: 0;
        }
      }
      .font-weight-500 {
        font-weight: 500;
      }
      .font-weight-600 {
        font-weight: 600;
      }
      .income {
        color: #2e7d32;
      }
      .expense {
        color: #c62828;
      }
      .empty-state {
        text-align: center;
        padding: 32px;
        color: rgba(0, 0, 0, 0.5);
      }
      .dialog-actions {
        padding: 12px 24px;
      }
      ::ng-deep app-custom-select {
        width: 100%;
      }
      @media (max-width: 768px) {
        .dialog-content {
          min-width: unset !important;
          width: 100% !important;
        }
        .list-header {
          flex-direction: column;
          align-items: stretch !important;
          gap: 12px;
        }
        .filter-row {
          flex-direction: column;
          align-items: stretch !important;
          gap: 8px;
        }
        .search-field,
        .status-field,
        .financial-category-field {
          width: 100% !important;
        }
        .btn-create {
          width: 100%;
          align-self: auto !important;
          margin-top: 8px;
        }
      }
    `,
  ],
})
export class RecurringTransactionsManagementDialogComponent implements OnInit {
  form!: FormGroup;
  recurringTransactions: IRecurringTransaction[] = [];
  financialCategories: { id: string; name: string }[] = [];
  formFinancialCategories: { id: string; name: string }[] = [];
  editingId: string | null = null;
  viewMode: 'list' | 'form' = 'list';
  filterStatus = '';
  filterDescription = '';
  filterFinancialCategoryId = '';
  displayedColumns: string[] = ['description', 'amount', 'dueDay', 'status', 'actions'];

  constructor(
    private fb: FormBuilder,
    private recurringService: RecurringTransactionService,
    private financialCategoryService: FinancialCategoryService,
    private toastr: ToastrService,
    @Inject(MAT_DIALOG_DATA) public data: { storeId: string },
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadRecurringTransactions();
    this.loadFinancialCategories();
  }

  initForm(): void {
    const today = new Date().toISOString().substring(0, 10);
    this.form = this.fb.group({
      description: ['', [Validators.required]],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      type: ['EXPENSE', [Validators.required]],
      dueDay: [10, [Validators.required, Validators.min(1), Validators.max(31)]],
      startDate: [today, [Validators.required]],
      endDate: [null],
      storeId: [this.data.storeId, [Validators.required]],
      financialCategory: this.fb.group({
        id: [''],
        name: [''],
      }),
    });

    this.form.get('type')?.valueChanges.subscribe(() => {
      this.loadFinancialCategoriesForForm();
    });
  }

  setViewMode(mode: 'list' | 'form'): void {
    this.viewMode = mode;
    if (mode === 'list') {
      this.editingId = null;
      this.initForm();
    } else if (mode === 'form') {
      this.loadFinancialCategoriesForForm();
    }
  }

  loadRecurringTransactions(): void {
    const filters: { storeId: string; status?: string; description?: string; financialCategoryId?: string } = {
      storeId: this.data.storeId,
    };
    if (this.filterStatus) {
      filters.status = this.filterStatus;
    }
    if (this.filterDescription?.trim()) {
      filters.description = this.filterDescription.trim();
    }
    if (this.filterFinancialCategoryId) {
      filters.financialCategoryId = this.filterFinancialCategoryId;
    }
    this.recurringService.getRecurringTransactions(0, 100, filters).subscribe({
      next: (response) => {
        this.recurringTransactions = response.content;
      },
      error: (err) => console.error('Error loading recurring transactions', err),
    });
  }

  onFilterChange(): void {
    this.loadRecurringTransactions();
  }

  onDescriptionInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.filterDescription = value;
    this.onFilterChange();
  }

  loadFinancialCategories(): void {
    this.financialCategoryService.getAllFinancialCategories(this.data.storeId).subscribe({
      next: (response) => {
        this.financialCategories = this.formatFinancialCategoryHierarchy(response.content);
      },
      error: (err) => console.error('Error loading financial categories', err),
    });
  }

  loadFinancialCategoriesForForm(): void {
    const type = this.form.get('type')?.value;
    const financialCategoryType = type === 'INCOME' ? 'REVENUE' : 'EXPENSE';
    this.financialCategoryService.getAllFinancialCategories(this.data.storeId, financialCategoryType).subscribe({
      next: (response) => {
        this.formFinancialCategories = this.formatFinancialCategoryHierarchy(response.content);
      },
      error: (err) => console.error('Error loading financial categories for form', err),
    });
  }

  private formatFinancialCategoryHierarchy(financialCategories: IFinancialCategory[]): { id: string; name: string }[] {
    const ccMap = new Map<string, IFinancialCategory>();
    financialCategories.forEach((cc) => ccMap.set(cc.financialCategoryId, cc));

    const getHierarchyName = (cc: IFinancialCategory): string => {
      const parts: string[] = [];
      let current: IFinancialCategory | undefined = cc;
      while (current) {
        parts.unshift(current.name);
        current = current.parentId ? ccMap.get(current.parentId) : undefined;
      }
      return parts.join(' / ');
    };

    return financialCategories.map((cc) => ({
      id: cc.financialCategoryId,
      name: getHierarchyName(cc),
    }));
  }

  startCreate(): void {
    this.setViewMode('form');
  }

  startEdit(item: IRecurringTransaction): void {
    this.editingId = item.recurringTransactionId;
    this.setViewMode('form');
    this.form.patchValue({
      description: item.description,
      amount: item.amount,
      type: item.type,
      dueDay: item.dueDay,
      startDate: item.startDate,
      endDate: item.endDate,
      storeId: item.storeId,
      financialCategory: {
        id: item.financialCategory?.financialCategoryId || '',
        name: item.financialCategory?.name || '',
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const rawValue = this.form.value;
    const payload = {
      ...rawValue,
      financialCategoryId: rawValue.financialCategory?.id || null,
    };
    delete payload.financialCategory;

    if (this.editingId) {
      this.recurringService.update(this.editingId, payload).subscribe({
        next: () => {
          this.toastr.success('Recorrência atualizada com sucesso!', 'Sucesso');
          this.setViewMode('list');
          this.loadRecurringTransactions();
        },
        error: (err) => {
          console.error(err);
          this.toastr.error('Erro ao atualizar recorrência.', 'Erro');
        },
      });
    } else {
      this.recurringService.create(payload).subscribe({
        next: () => {
          this.toastr.success('Recorrência criada com sucesso!', 'Sucesso');
          this.setViewMode('list');
          this.loadRecurringTransactions();
        },
        error: (err) => {
          console.error(err);
          this.toastr.error('Erro ao criar recorrência.', 'Erro');
        },
      });
    }
  }

  deleteRecurring(item: IRecurringTransaction): void {
    if (
      confirm(
        `Deseja realmente excluir a recorrência "${item.description}"? Isso removerá permanentemente a regra e todas as parcelas pendentes ou canceladas associadas. Transações já pagas serão preservadas e impedirão a exclusão.`,
      )
    ) {
      this.recurringService.delete(item.recurringTransactionId).subscribe({
        next: () => {
          this.toastr.success('Recorrência excluída com sucesso!', 'Sucesso');
          this.loadRecurringTransactions();
        },
        error: (err) => {
          console.error(err);
          const errMsg = err?.error?.errorMessage || 'Erro ao excluir recorrência.';
          this.toastr.error(errMsg, 'Erro');
        },
      });
    }
  }
}
