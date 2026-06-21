import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { CustomSelectComponent } from '@components/custom-select/custom-select.component';
import { CostCenterService } from '@services/cost-center.service';
import { ICostCenter } from '@interfaces/cost-center';
import { CurrencyInputComponent } from '@components/currency-input/currency-input.component';

@Component({
  selector: 'app-manual-transaction-dialog',
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
    CustomSelectComponent,
    CurrencyInputComponent,
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon>{{ data.transaction ? 'edit' : 'add_chart' }}</mat-icon>
      <span>{{ data.transaction ? 'Editar Lançamento' : 'Novo Lançamento Manual' }}</span>
    </h2>

    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-content">
        <div class="form-row">
          <mat-form-field appearance="outline" class="flex-grow">
            <mat-label>Tipo de Lançamento</mat-label>
            <mat-select formControlName="type">
              <mat-option value="INCOME">Receita / Entrada</mat-option>
              <mat-option value="EXPENSE">Despesa / Saída</mat-option>
            </mat-select>
            <mat-error *ngIf="form.get('type')?.hasError('required')">O tipo é obrigatório</mat-error>
          </mat-form-field>
        </div>

        <div class="form-row">
          <app-currency-input
            formControlName="amount"
            label="Valor"
            [required]="true"
            [error]="!!(form.get('amount')?.touched && form.get('amount')?.invalid)"
            errorMessage="O valor deve ser maior que zero"
            class="flex-grow"
          ></app-currency-input>

          @if (!data.transaction) {
            <mat-form-field appearance="outline" class="flex-grow">
              <mat-label>Parcelas</mat-label>
              <input matInput type="number" formControlName="installments" placeholder="1" min="1" step="1" />
              <mat-error *ngIf="form.get('installments')?.hasError('min')">Mínimo de 1 parcela</mat-error>
            </mat-form-field>
          }
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline" class="flex-grow">
            <mat-label>Data de Vencimento</mat-label>
            <input matInput type="date" formControlName="dueDate" />
            <mat-error *ngIf="form.get('dueDate')?.hasError('required')">A data de vencimento é obrigatória</mat-error>
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

        <div class="form-row">
          <mat-form-field appearance="outline" class="flex-grow">
            <mat-label>Descrição</mat-label>
            <textarea
              matInput
              formControlName="description"
              placeholder="Ex: Conta de luz, Retirada de sócio, etc."
              rows="3"
            ></textarea>
            <mat-error *ngIf="form.get('description')?.hasError('required')">A descrição é obrigatória</mat-error>
          </mat-form-field>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid">Salvar</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [
    `
      .dialog-title {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--mat-sys-primary, #1976d2);
        font-weight: 600;
        margin-bottom: 16px;
      }
      .dialog-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-width: 320px;
        max-width: 500px;
        padding-top: 8px !important;
      }
      .form-row {
        display: flex;
        gap: 12px;
        width: 100%;
        flex-wrap: wrap;
      }
      .flex-grow {
        flex: 1;
        min-width: 150px;
      }
      .dialog-actions {
        padding: 16px 24px;
        gap: 8px;
      }
      ::ng-deep app-custom-select {
        width: 100%;
      }
    `,
  ],
})
export class ManualTransactionDialogComponent implements OnInit {
  form!: FormGroup;
  costCenters: { id: string; name: string }[] = [];

  constructor(
    private fb: FormBuilder,
    private costCenterService: CostCenterService,
    public dialogRef: MatDialogRef<ManualTransactionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { storeId: string; transaction?: any },
  ) {}

  ngOnInit(): void {
    const today = new Date().toISOString().substring(0, 10);
    const isEdit = !!this.data.transaction;

    const initialAmount = isEdit ? this.data.transaction.amount : null;
    const initialType = isEdit ? this.data.transaction.type : 'EXPENSE';
    const initialDueDate =
      isEdit && typeof this.data.transaction.dueDate === 'string'
        ? this.data.transaction.dueDate.substring(0, 10)
        : today;
    const initialDescription = isEdit ? this.data.transaction.description : '';
    const initialCostCenterId =
      isEdit && this.data.transaction.costCenter ? this.data.transaction.costCenter.costCenterId : '';
    const initialCostCenterName =
      isEdit && this.data.transaction.costCenter ? this.data.transaction.costCenter.name : '';

    this.form = this.fb.group({
      amount: [initialAmount, [Validators.required, Validators.min(0.01)]],
      type: [{ value: initialType, disabled: isEdit }, [Validators.required]],
      dueDate: [initialDueDate, [Validators.required]],
      description: [initialDescription, [Validators.required]],
      installments: [1, isEdit ? [] : [Validators.min(1)]],
      storeId: [this.data.storeId],
      costCenter: this.fb.group({
        id: [initialCostCenterId],
        name: [initialCostCenterName],
      }),
    });

    this.form.get('type')?.valueChanges.subscribe(() => {
      this.loadCostCenters();
    });

    this.loadCostCenters();
  }

  loadCostCenters(): void {
    const type = this.form.get('type')?.value;
    const costCenterType = type === 'INCOME' ? 'REVENUE' : 'EXPENSE';
    this.costCenterService.getAllCostCenters(this.data.storeId, costCenterType).subscribe({
      next: (response) => {
        this.costCenters = this.formatCostCenterHierarchy(response.content);
      },
      error: (err) => {
        console.error('Error loading cost centers', err);
      },
    });
  }

  private formatCostCenterHierarchy(costCenters: ICostCenter[]): { id: string; name: string }[] {
    const ccMap = new Map<string, ICostCenter>();
    costCenters.forEach((cc) => ccMap.set(cc.costCenterId, cc));

    const getHierarchyName = (cc: ICostCenter): string => {
      const parts: string[] = [];
      let current: ICostCenter | undefined = cc;
      while (current) {
        parts.unshift(current.name);
        current = current.parentId ? ccMap.get(current.parentId) : undefined;
      }
      return parts.join(' / ');
    };

    return costCenters.map((cc) => ({
      id: cc.costCenterId,
      name: getHierarchyName(cc),
    }));
  }

  onSubmit(): void {
    if (this.form.valid) {
      const rawValue = this.form.getRawValue();
      const payload = {
        ...rawValue,
        costCenterId: rawValue.costCenter?.id || null,
      };
      delete payload.costCenter;
      this.dialogRef.close(payload);
    }
  }
}
