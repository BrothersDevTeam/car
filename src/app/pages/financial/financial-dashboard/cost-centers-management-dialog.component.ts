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
    MatSelectModule,
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
        <div class="form-row">
          <mat-form-field appearance="outline" class="form-field-name">
            <mat-label>Nome do Centro</mat-label>
            <input matInput formControlName="name" [errorStateMatcher]="matcher" placeholder="Ex: CEMIG, Copasa, Combustível..." />
            <mat-error *ngIf="form.get('name')?.hasError('required')">O nome é obrigatório</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="form-field-type">
            <mat-label>Tipo</mat-label>
            <mat-select formControlName="type" (selectionChange)="onTypeChange()">
              <mat-option value="EXPENSE">Despesa</mat-option>
              <mat-option value="REVENUE">Receita</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline" class="form-field-parent">
            <mat-label>Centro Pai (Opcional)</mat-label>
            <mat-select formControlName="parentId">
              <mat-option [value]="null">Nenhum (Categoria Raiz)</mat-option>
              @for (parentCC of getAvailableParents(); track parentCC.costCenterId) {
                <mat-option [value]="parentCC.costCenterId">
                  {{ '— '.repeat(parentCC.indent) + parentCC.name }}
                </mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="form-field-desc">
            <mat-label>Descrição (Opcional)</mat-label>
            <input matInput formControlName="description" placeholder="Detalhes..." />
          </mat-form-field>
        </div>

        <div class="form-actions-row">
          <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid" class="action-btn">
            <mat-icon>{{ editingId ? 'save' : 'add' }}</mat-icon>
            <span>{{ editingId ? 'Salvar' : 'Adicionar' }}</span>
          </button>

          <button mat-button type="button" *ngIf="editingId" (click)="cancelEdit()" class="action-btn">
            Cancelar
          </button>
        </div>
      </form>

      <!-- Segmento para trocar visualização Despesas / Receitas -->
      <div class="tabs-container">
        <button 
          mat-button 
          [class.active-tab]="activeTab === 'EXPENSE'" 
          (click)="setActiveTab('EXPENSE')"
          class="tab-btn"
        >
          <mat-icon>trending_down</mat-icon>
          <span>Centros de Despesas</span>
        </button>
        <button 
          mat-button 
          [class.active-tab]="activeTab === 'REVENUE'" 
          (click)="setActiveTab('REVENUE')"
          class="tab-btn"
        >
          <mat-icon>trending_up</mat-icon>
          <span>Centros de Receitas</span>
        </button>
      </div>

      <!-- Lista / Tabela em Árvore -->
      <div class="table-wrapper">
        <table mat-table [dataSource]="getFlattenedTree(activeTab)" class="w-100">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Nome</th>
            <td mat-cell *matCellDef="let cc" class="font-weight-500">
              <span [style.padding-left.px]="cc.indent * 20" style="display: inline-flex; align-items: center; gap: 8px;">
                <mat-icon style="font-size: 18px; width: 18px; height: 18px; color: #ffca28; margin: 0;">
                  {{ cc.indent > 0 ? 'folder' : 'folder_open' }}
                </mat-icon>
                <span>{{ cc.name }}</span>
              </span>
            </td>
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

        <div *ngIf="getFlattenedTree(activeTab).length === 0" class="empty-state">
          <p>Nenhum Centro de Custo cadastrado nesta categoria.</p>
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
      margin-bottom: 12px;
    }
    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 600px;
      max-width: 800px;
      padding-top: 8px !important;
    }
    .cost-center-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: rgba(0, 0, 0, 0.02);
      padding: 16px;
      border-radius: 8px;
      border: 1px solid rgba(0, 0, 0, 0.05);
    }
    .form-row {
      display: flex;
      gap: 12px;
      width: 100%;
    }
    .form-field-name {
      flex: 3;
    }
    .form-field-type {
      flex: 1;
    }
    .form-field-parent {
      flex: 2;
    }
    .form-field-desc {
      flex: 2;
    }
    .form-actions-row {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .action-btn {
      height: 40px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .tabs-container {
      display: flex;
      border-bottom: 2px solid rgba(0, 0, 0, 0.08);
      gap: 16px;
      margin-top: 8px;
    }
    .tab-btn {
      border-radius: 4px 4px 0 0;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 6px;
      color: rgba(0, 0, 0, 0.6);
      
      &.active-tab {
        color: #1976d2;
        border-bottom: 3px solid #1976d2;
        background: rgba(25, 118, 210, 0.04);
        font-weight: 600;
      }
    }
    .table-wrapper {
      max-height: 300px;
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
    .font-weight-500 {
      font-weight: 500;
    }
  `]
})
export class CostCentersManagementDialogComponent implements OnInit {
  form!: FormGroup;
  costCenters: ICostCenter[] = [];
  editingId: string | null = null;
  activeTab: 'EXPENSE' | 'REVENUE' = 'EXPENSE';
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
      type: ['EXPENSE', [Validators.required]],
      parentId: [null],
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

  setActiveTab(tab: 'EXPENSE' | 'REVENUE'): void {
    this.activeTab = tab;
    // Se não estiver editando, sincroniza o tipo do form com a aba ativa
    if (!this.editingId) {
      this.form.get('type')?.setValue(tab);
      this.form.get('parentId')?.setValue(null);
    }
  }

  onTypeChange(): void {
    // Ao mudar o tipo do formulário, reseta o pai para evitar incompatibilidade
    this.form.get('parentId')?.setValue(null);
  }

  getFlattenedTree(type: 'EXPENSE' | 'REVENUE'): (ICostCenter & { displayName: string; indent: number })[] {
    const list = this.costCenters.filter(cc => cc.type === type);
    const roots = list.filter(cc => !cc.parentId);
    const result: (ICostCenter & { displayName: string; indent: number })[] = [];

    const traverse = (node: ICostCenter, depth: number) => {
      result.push({
        ...node,
        displayName: node.name,
        indent: depth
      });
      const children = list.filter(cc => cc.parentId === node.costCenterId);
      children.forEach(child => traverse(child, depth + 1));
    };

    roots.forEach(root => traverse(root, 0));

    // Órfãos (segurança)
    list.forEach(node => {
      if (!result.some(r => r.costCenterId === node.costCenterId)) {
        result.push({
          ...node,
          displayName: node.name,
          indent: 0
        });
      }
    });

    return result;
  }

  getAvailableParents() {
    const currentType = this.form.get('type')?.value;
    const allOfCurrentType = this.getFlattenedTree(currentType);
    if (!this.editingId) {
      return allOfCurrentType;
    }

    // Exclui o próprio elemento e todos os seus descendentes recursivamente
    const excludedIds = new Set<string>();
    const collectDescendants = (id: string) => {
      excludedIds.add(id);
      this.costCenters.forEach(cc => {
        if (cc.parentId === id) {
          collectDescendants(cc.costCenterId);
        }
      });
    };
    collectDescendants(this.editingId);
    return allOfCurrentType.filter(cc => !excludedIds.has(cc.costCenterId));
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
          this.form.get('parentId')?.setValue(null);
          this.form.get('type')?.setValue(this.activeTab);
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
      type: cc.type,
      parentId: cc.parentId || null,
      storeId: cc.storeId
    });
    this.activeTab = cc.type;
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form.get('name')?.reset();
    this.form.get('description')?.reset();
    this.form.get('parentId')?.setValue(null);
    this.form.get('type')?.setValue(this.activeTab);
    this.form.get('storeId')?.setValue(this.data.storeId);
  }

  deleteCostCenter(cc: ICostCenter): void {
    // Verifica se possui filhos
    const hasChildren = this.costCenters.some(child => child.parentId === cc.costCenterId);
    if (hasChildren) {
      this.toastr.warning('Não é possível excluir um Centro de Custo que possui subcategorias filhas. Exclua as filhas primeiro.', 'Aviso');
      return;
    }

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
