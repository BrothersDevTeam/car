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
import { ToastrService } from 'ngx-toastr';
import { RecurringTransactionService } from '@services/recurring-transaction.service';
import { CostCenterService } from '@services/cost-center.service';
import { IRecurringTransaction } from '@interfaces/recurring-transaction';
import { CustomSelectComponent } from '@components/custom-select/custom-select.component';

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
    CustomSelectComponent,
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
          <span class="subtitle">Despesas ou receitas recorrentes geradas mensalmente</span>
          <button mat-raised-button color="primary" (click)="startCreate()">
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
                <div *ngIf="r.costCenter" class="cc-tag">
                  <mat-icon>label</mat-icon>
                  {{ r.costCenter.name }}
                </div>
              </td>
            </ng-container>

            <!-- Valor -->
            <ng-container matColumnDef="amount">
              <th mat-header-cell *matHeaderCellDef>Valor</th>
              <td mat-cell *matCellDef="let r" [class.income]="r.type === 'INCOME'" [class.expense]="r.type === 'EXPENSE'" class="font-weight-600">
                {{ r.amount | currency:'BRL':'symbol':'1.2-2' }}
              </td>
            </ng-container>

            <!-- Vencimento -->
            <ng-container matColumnDef="dueDay">
              <th mat-header-cell *matHeaderCellDef>Dia Venc.</th>
              <td mat-cell *matCellDef="let r">Dia {{ r.dueDay }}</td>
            </ng-container>

            <!-- Próxima Geração -->
            <ng-container matColumnDef="nextGenerationDate">
              <th mat-header-cell *matHeaderCellDef>Próx. Geração</th>
              <td mat-cell *matCellDef="let r">{{ r.nextGenerationDate | date:'dd/MM/yyyy':'UTC' }}</td>
            </ng-container>

            <!-- Ações -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef style="width: 100px;">Ações</th>
              <td mat-cell *matCellDef="let r">
                <button mat-icon-button color="primary" (click)="startEdit(r)" matTooltip="Editar">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="deleteRecurring(r)" matTooltip="Excluir">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
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

            <mat-form-field appearance="outline" class="flex-grow">
              <mat-label>Valor (R$)</mat-label>
              <input matInput type="number" formControlName="amount" placeholder="0,00" step="0.01" min="0.01" />
              <mat-error *ngIf="form.get('amount')?.hasError('required')">O valor é obrigatório</mat-error>
              <mat-error *ngIf="form.get('amount')?.hasError('min')">O valor deve ser maior que zero</mat-error>
            </mat-form-field>
          </div>

          <div class="form-row">
            <mat-form-field appearance="outline" class="flex-grow">
              <mat-label>Dia de Vencimento</mat-label>
              <input matInput type="number" formControlName="dueDay" placeholder="Ex: 10" min="1" max="31" step="1" />
              <mat-error *ngIf="form.get('dueDay')?.hasError('required')">O dia é obrigatório</mat-error>
              <mat-error *ngIf="form.get('dueDay')?.hasError('min') || form.get('dueDay')?.hasError('max')">Dia inválido (1 a 31)</mat-error>
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
              listType="cost_center"
              label="Centro de Custo"
              [options]="costCenters"
              [control]="$any(form.get('costCenter'))"
              placeholder="Selecione o centro de custo"
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
  styles: [`
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
      align-items: center;
      margin-bottom: 12px;
      gap: 12px;
      flex-wrap: wrap;

      .subtitle {
        font-size: 0.85rem;
        color: rgba(0, 0, 0, 0.6);
      }
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
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 4px;
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
  `]
})
export class RecurringTransactionsManagementDialogComponent implements OnInit {
  form!: FormGroup;
  recurringTransactions: IRecurringTransaction[] = [];
  costCenters: { id: string; name: string }[] = [];
  editingId: string | null = null;
  viewMode: 'list' | 'form' = 'list';
  displayedColumns: string[] = ['description', 'amount', 'dueDay', 'nextGenerationDate', 'actions'];

  constructor(
    private fb: FormBuilder,
    private recurringService: RecurringTransactionService,
    private costCenterService: CostCenterService,
    private toastr: ToastrService,
    @Inject(MAT_DIALOG_DATA) public data: { storeId: string }
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadRecurringTransactions();
    this.loadCostCenters();
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
      costCenter: this.fb.group({
        id: [''],
        name: ['']
      })
    });
  }

  setViewMode(mode: 'list' | 'form'): void {
    this.viewMode = mode;
    if (mode === 'list') {
      this.editingId = null;
      this.initForm();
    }
  }

  loadRecurringTransactions(): void {
    this.recurringService.getRecurringTransactions(0, 100, { storeId: this.data.storeId }).subscribe({
      next: (response) => {
        this.recurringTransactions = response.content;
      },
      error: (err) => console.error('Error loading recurring transactions', err)
    });
  }

  loadCostCenters(): void {
    this.costCenterService.getAllCostCenters(this.data.storeId).subscribe({
      next: (response) => {
        this.costCenters = response.content.map(cc => ({
          id: cc.costCenterId,
          name: cc.name
        }));
      },
      error: (err) => console.error('Error loading cost centers', err)
    });
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
      costCenter: {
        id: item.costCenter?.costCenterId || '',
        name: item.costCenter?.name || ''
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const rawValue = this.form.value;
    const payload = {
      ...rawValue,
      costCenterId: rawValue.costCenter?.id || null
    };
    delete payload.costCenter;

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
        }
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
        }
      });
    }
  }

  deleteRecurring(item: IRecurringTransaction): void {
    if (confirm(`Deseja realmente excluir a recorrência "${item.description}"? (Isso não apagará as parcelas já geradas)`)) {
      this.recurringService.delete(item.recurringTransactionId).subscribe({
        next: () => {
          this.toastr.success('Recorrência excluída com sucesso!', 'Sucesso');
          this.loadRecurringTransactions();
        },
        error: (err) => {
          console.error(err);
          this.toastr.error('Erro ao excluir recorrência.', 'Erro');
        }
      });
    }
  }
}
