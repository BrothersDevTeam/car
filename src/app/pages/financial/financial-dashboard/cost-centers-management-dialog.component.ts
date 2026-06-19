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
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { ToastrService } from 'ngx-toastr';
import { CostCenterService } from '@services/cost-center.service';
import { ICostCenter } from '@interfaces/cost-center';
import { ErrorStateMatcher } from '@angular/material/core';

class CustomErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: any | null, form: any | null): boolean {
    return !!(control && control.invalid && (control.dirty || (form && form.submitted)));
  }
}

@Component({
  selector: 'app-cost-centers-management-dialog',
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
    MatIconModule,
    MatTableModule,
    MatMenuModule,
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon>business</mat-icon>
      <span>Gerenciar Centros de Custo</span>
    </h2>

    <mat-dialog-content class="dialog-content">
      <!-- Formulário de Inserção/Edição -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="cost-center-form">
        <mat-form-field appearance="outline" class="flex-grow">
          <mat-label>Nome do Centro de Custo</mat-label>
          <input matInput formControlName="name" [errorStateMatcher]="matcher" placeholder="Ex: Administrativo, Oficina..." />
          <mat-error *ngIf="form.get('name')?.hasError('required') && (form.get('name')?.dirty || form.get('name')?.touched)">O nome é obrigatório</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="flex-grow">
          <mat-label>Descrição (Opcional)</mat-label>
          <input matInput formControlName="description" placeholder="Detalhes..." />
        </mat-form-field>

        <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid" class="action-btn">
          <mat-icon>{{ editingId ? 'save' : 'add' }}</mat-icon>
          <span>{{ editingId ? 'Salvar' : 'Adicionar' }}</span>
        </button>

        <button mat-button type="button" *ngIf="editingId" (click)="cancelEdit()" class="action-btn">
          Cancelar
        </button>
      </form>

      <!-- Lista / Tabela -->
      <div class="table-wrapper">
        <table mat-table [dataSource]="costCenters" class="w-100">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Nome</th>
            <td mat-cell *matCellDef="let cc" class="font-weight-500">{{ cc.name }}</td>
          </ng-container>

          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef>Descrição</th>
            <td mat-cell *matCellDef="let cc">{{ cc.description || '-' }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef style="width: 80px;">Ações</th>
            <td mat-cell *matCellDef="let cc">
              <button type="button" mat-icon-button [matMenuTriggerFor]="menu" (click)="$event.stopPropagation()" aria-label="Ações">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #menu="matMenu">
                <button
                  mat-menu-item
                  (click)="startEdit(cc)"
                  class="custom-menu-item"
                >
                  <mat-icon class="menu-action-icon">edit</mat-icon>
                  <span class="menu-action-label">Editar</span>
                </button>
                <button
                  mat-menu-item
                  (click)="deleteCostCenter(cc)"
                  class="custom-menu-item menu-action-warn"
                >
                  <mat-icon class="menu-action-icon">delete</mat-icon>
                  <span class="menu-action-label">Excluir</span>
                </button>
              </mat-menu>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <div *ngIf="costCenters.length === 0" class="empty-state">
          <p>Nenhum Centro de Custo cadastrado nesta loja.</p>
        </div>
      </div>
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
      margin-bottom: 16px;
    }
    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 500px;
      max-width: 700px;
      padding-top: 8px !important;
    }
    .cost-center-form {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      width: 100%;
      flex-wrap: wrap;
      background: rgba(0, 0, 0, 0.02);
      padding: 12px;
      border-radius: 8px;
      border: 1px solid rgba(0, 0, 0, 0.05);
    }
    .flex-grow {
      flex: 1;
      min-width: 180px;
    }
    .action-btn {
      height: 48px;
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
    }
    .table-wrapper {
      max-height: 250px;
      overflow-y: auto;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 4px;
    }
    .w-100 {
      width: 100%;
    }
    .empty-state {
      text-align: center;
      padding: 24px;
      color: rgba(0, 0, 0, 0.5);
    }
    .dialog-actions {
      padding: 16px 24px;
    }
  `]
})
export class CostCentersManagementDialogComponent implements OnInit {
  form!: FormGroup;
  costCenters: ICostCenter[] = [];
  editingId: string | null = null;
  displayedColumns: string[] = ['name', 'description', 'actions'];
  readonly matcher = new CustomErrorStateMatcher();

  constructor(
    private fb: FormBuilder,
    private costCenterService: CostCenterService,
    private toastr: ToastrService,
    @Inject(MAT_DIALOG_DATA) public data: { storeId: string }
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadCostCenters();
  }

  initForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required]],
      description: [''],
      storeId: [this.data.storeId, [Validators.required]]
    });
  }

  loadCostCenters(): void {
    this.costCenterService.getAllCostCenters(this.data.storeId).subscribe({
      next: (response) => {
        this.costCenters = response.content;
      },
      error: (err) => console.error('Error loading cost centers', err)
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const payload = this.form.value;

    if (this.editingId) {
      this.costCenterService.updateCostCenter(this.editingId, payload).subscribe({
        next: () => {
          this.toastr.success('Centro de Custo atualizado com sucesso!', 'Sucesso');
          this.cancelEdit();
          this.loadCostCenters();
        },
        error: (err) => {
          console.error(err);
          const msg = err.error?.errorMessage || 'Erro ao atualizar Centro de Custo.';
          this.toastr.error(msg, 'Erro');
        }
      });
    } else {
      this.costCenterService.createCostCenter(payload).subscribe({
        next: () => {
          this.toastr.success('Centro de Custo criado com sucesso!', 'Sucesso');
          this.form.get('name')?.reset();
          this.form.get('description')?.reset();
          this.loadCostCenters();
        },
        error: (err) => {
          console.error(err);
          const msg = err.error?.errorMessage || 'Erro ao criar Centro de Custo.';
          this.toastr.error(msg, 'Erro');
        }
      });
    }
  }

  startEdit(cc: ICostCenter): void {
    this.editingId = cc.costCenterId;
    this.form.patchValue({
      name: cc.name,
      description: cc.description,
      storeId: cc.storeId
    });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form.get('name')?.reset();
    this.form.get('description')?.reset();
    this.form.get('storeId')?.setValue(this.data.storeId);
  }

  deleteCostCenter(cc: ICostCenter): void {
    if (confirm(`Deseja realmente excluir o centro de custo "${cc.name}"?`)) {
      this.costCenterService.deleteCostCenter(cc.costCenterId).subscribe({
        next: () => {
          this.toastr.success('Centro de Custo excluído com sucesso!', 'Sucesso');
          this.loadCostCenters();
          if (this.editingId === cc.costCenterId) {
            this.cancelEdit();
          }
        },
        error: (err) => {
          console.error(err);
          this.toastr.error('Erro ao excluir Centro de Custo. Certifique-se de que não está associado a nenhuma transação.', 'Erro');
        }
      });
    }
  }
}
