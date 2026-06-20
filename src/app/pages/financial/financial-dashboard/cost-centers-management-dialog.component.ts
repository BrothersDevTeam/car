import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormGroupDirective, ReactiveFormsModule, Validators } from '@angular/forms';
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
      <!-- Botão para abrir o Formulário de Cadastro -->
      @if (!showForm) {
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="showForm = true" class="new-cc-btn">
            <mat-icon>add</mat-icon>
            <span>Novo Centro de Custo</span>
          </button>
        </div>
      }

      <!-- Formulário de Inserção/Edição (Retrátil) -->
      @if (showForm) {
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="cost-center-form">
          <h3
            style="margin-top: 0; margin-bottom: 12px; font-weight: 500; font-size: 15px; color: rgba(0, 0, 0, 0.6); display: flex; align-items: center; gap: 6px;"
          >
            <mat-icon style="font-size: 20px; width: 20px; height: 20px; color: #1976d2;">
              {{ activeTab === 'EXPENSE' ? 'trending_down' : 'trending_up' }}
            </mat-icon>
            <span>
              {{ editingId ? 'Editar Centro de ' : 'Novo Centro de ' }}
              <strong>{{ activeTab === 'EXPENSE' ? 'Despesa' : 'Receita' }}</strong>
            </span>
          </h3>

          <div class="form-row">
            <mat-form-field appearance="outline" class="form-field-name" style="flex: 1;">
              <mat-label>Nome do Centro</mat-label>
              <input
                matInput
                formControlName="name"
                [errorStateMatcher]="matcher"
                placeholder="Ex: CEMIG, Copasa, Combustível..."
              />
              <mat-error *ngIf="form.get('name')?.hasError('required')">O nome é obrigatório</mat-error>
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
              <span>{{ editingId ? 'Salvar' : 'Adicionar ' + (activeTab === 'EXPENSE' ? 'Despesa' : 'Receita') }}</span>
            </button>

            <button mat-button type="button" (click)="cancelEdit()" class="action-btn">Cancelar</button>
          </div>
        </form>
      }

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
        <table mat-table [dataSource]="dataSource" class="w-100">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Nome</th>
            <td mat-cell *matCellDef="let cc" class="font-weight-500">
              <span
                [style.padding-left.px]="cc.indent * 24"
                style="display: inline-flex; align-items: center; gap: 4px;"
              >
                <!-- Setinha de Expandir/Recolher -->
                <span
                  style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px;"
                >
                  <button
                    type="button"
                    mat-icon-button
                    *ngIf="cc.hasChildren"
                    (click)="toggleNode(cc.costCenterId, $event)"
                    style="width: 20px; height: 20px; line-height: 20px; padding: 0; display: flex; align-items: center; justify-content: center;"
                  >
                    <mat-icon style="font-size: 18px; width: 18px; height: 18px; color: rgba(0,0,0,0.54);">
                      {{ cc.isCollapsed ? 'keyboard_arrow_right' : 'keyboard_arrow_down' }}
                    </mat-icon>
                  </button>
                </span>

                <!-- Conector Visual da Árvore -->
                <span class="tree-connector" *ngIf="cc.indent > 0">
                  {{ '— '.repeat(cc.indent - 1) + '└─' }}
                </span>

                <!-- Ícone de Pasta -->
                <mat-icon [class.folder-icon-root]="cc.indent === 0" [class.folder-icon-child]="cc.indent > 0">
                  {{ cc.indent > 0 ? 'folder' : 'folder_open' }}
                </mat-icon>

                <!-- Nome -->
                <span [class.root-node]="cc.indent === 0" [class.child-node]="cc.indent > 0">
                  {{ cc.name }}
                </span>
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
              <button
                type="button"
                mat-icon-button
                [matMenuTriggerFor]="menu"
                [matMenuTriggerData]="{ cc: cc }"
                aria-label="Ações"
              >
                <mat-icon>more_vert</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>

        <!-- Menu Template Único para Ações da Tabela -->
        <mat-menu #menu="matMenu">
          <ng-template matMenuContent let-cc="cc">
            <button mat-menu-item (click)="startEdit(cc)" class="custom-menu-item">
              <mat-icon class="menu-action-icon">edit</mat-icon>
              <span class="menu-action-label">Editar</span>
            </button>
            <button mat-menu-item (click)="deleteCostCenter(cc)" class="custom-menu-item menu-action-warn">
              <mat-icon class="menu-action-icon">delete</mat-icon>
              <span class="menu-action-label">Excluir</span>
            </button>
          </ng-template>
        </mat-menu>

        <div *ngIf="dataSource.length === 0" class="empty-state">
          <p>Nenhum Centro de Custo cadastrado nesta categoria.</p>
        </div>
      </div>
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
        margin-bottom: 12px;
      }
      .dialog-content {
        display: flex;
        flex-direction: column;
        flex: 1;
        gap: 16px;
        width: 100%;
        box-sizing: border-box;
        padding-top: 8px !important;
        max-height: none !important;
        overflow: hidden;
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
        flex: 1;
        overflow-y: auto;
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 4px;
        min-height: 150px;
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
      .header-actions {
        display: flex;
        justify-content: flex-start;
        margin-bottom: 4px;
      }
      .new-cc-btn {
        height: 40px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      @media (max-width: 600px) {
        .form-row {
          flex-direction: column;
          gap: 0;
        }
        .form-field-name,
        .form-field-type,
        .form-field-parent,
        .form-field-desc {
          width: 100%;
          flex: none;
        }
        .tabs-container {
          flex-direction: column;
          gap: 8px;
          border-bottom: none;
        }
        .tab-btn {
          border-radius: 4px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          width: 100%;
          justify-content: flex-start;
        }
        .tab-btn.active-tab {
          border-bottom: 1px solid #1976d2;
          background: rgba(25, 118, 210, 0.08);
        }
      }
      .root-node {
        font-weight: 600;
        color: rgba(0, 0, 0, 0.87);
      }
      .child-node {
        font-weight: 400;
        color: rgba(0, 0, 0, 0.65);
        font-size: 0.95em;
      }
      .folder-icon-root {
        color: #ffa000 !important;
        font-size: 20px;
        width: 20px;
        height: 20px;
        margin: 0 !important;
      }
      .folder-icon-child {
        color: #ffca28 !important;
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin: 0 !important;
      }
      .tree-connector {
        color: rgba(0, 0, 0, 0.25);
        font-family: monospace;
        margin-right: 4px;
        font-weight: bold;
        letter-spacing: -1px;
      }
      .font-weight-500 {
        font-weight: 500;
      }
    `,
  ],
})
export class CostCentersManagementDialogComponent implements OnInit {
  @ViewChild(FormGroupDirective) formDirective!: FormGroupDirective;
  form!: FormGroup;
  costCenters: ICostCenter[] = [];
  editingId: string | null = null;
  activeTab: 'EXPENSE' | 'REVENUE' = 'EXPENSE';
  displayedColumns: string[] = ['name', 'description', 'actions'];
  readonly matcher = new CustomErrorStateMatcher();
  dataSource: (ICostCenter & { displayName: string; indent: number; hasChildren?: boolean; isCollapsed?: boolean })[] =
    [];
  collapsedNodes = new Set<string>();
  showForm = false;

  constructor(
    private fb: FormBuilder,
    private costCenterService: CostCenterService,
    private toastr: ToastrService,
    @Inject(MAT_DIALOG_DATA) public data: { storeId: string },
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
      storeId: [this.data.storeId, [Validators.required]],
    });
  }

  loadCostCenters(): void {
    this.costCenterService.getAllCostCenters(this.data.storeId).subscribe({
      next: (response) => {
        this.costCenters = response.content;
        this.updateDataSource();
      },
      error: (err) => console.error('Error loading cost centers', err),
    });
  }

  setActiveTab(tab: 'EXPENSE' | 'REVENUE'): void {
    this.activeTab = tab;
    // Se não estiver editando, sincroniza o tipo do form com a aba ativa
    if (!this.editingId) {
      this.form.get('type')?.setValue(tab);
      this.form.get('parentId')?.setValue(null);
    }
    this.updateDataSource();
  }

  onTypeChange(): void {
    // Ao mudar o tipo do formulário, reseta o pai para evitar incompatibilidade
    this.form.get('parentId')?.setValue(null);
  }

  updateDataSource(): void {
    this.dataSource = this.getFlattenedTree(this.activeTab);
  }

  toggleNode(ccId: string, event: Event): void {
    event.stopPropagation();
    if (this.collapsedNodes.has(ccId)) {
      this.collapsedNodes.delete(ccId);
    } else {
      this.collapsedNodes.add(ccId);
    }
    this.updateDataSource();
  }

  getFlattenedTree(
    type: 'EXPENSE' | 'REVENUE',
  ): (ICostCenter & { displayName: string; indent: number; hasChildren?: boolean; isCollapsed?: boolean })[] {
    const list = this.costCenters.filter((cc) => cc.type === type);
    const roots = list.filter((cc) => !cc.parentId);
    const result: (ICostCenter & {
      displayName: string;
      indent: number;
      hasChildren?: boolean;
      isCollapsed?: boolean;
    })[] = [];

    const traverse = (node: ICostCenter, depth: number, isParentCollapsed: boolean) => {
      const hasChildren = list.some((cc) => cc.parentId === node.costCenterId);
      const isCollapsed = this.collapsedNodes.has(node.costCenterId);

      if (!isParentCollapsed) {
        result.push({
          ...node,
          displayName: node.name,
          indent: depth,
          hasChildren,
          isCollapsed,
        });
      }

      const children = list.filter((cc) => cc.parentId === node.costCenterId);
      const nextParentCollapsed = isParentCollapsed || isCollapsed;
      children.forEach((child) => traverse(child, depth + 1, nextParentCollapsed));
    };

    roots.forEach((root) => traverse(root, 0, false));

    // Órfãos (segurança)
    list.forEach((node) => {
      const isOrphan = node.parentId && !list.some((cc) => cc.costCenterId === node.parentId);
      if (isOrphan && !result.some((r) => r.costCenterId === node.costCenterId)) {
        result.push({
          ...node,
          displayName: node.name,
          indent: 0,
          hasChildren: list.some((cc) => cc.parentId === node.costCenterId),
          isCollapsed: this.collapsedNodes.has(node.costCenterId),
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
      this.costCenters.forEach((cc) => {
        if (cc.parentId === id) {
          collectDescendants(cc.costCenterId);
        }
      });
    };
    collectDescendants(this.editingId);
    return allOfCurrentType.filter((cc) => !excludedIds.has(cc.costCenterId));
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
        },
      });
    } else {
      this.costCenterService.createCostCenter(payload).subscribe({
        next: () => {
          this.toastr.success('Centro de Custo criado com sucesso!', 'Sucesso');
          this.formDirective.resetForm({
            type: this.activeTab,
            storeId: this.data.storeId,
            parentId: null,
          });
          this.loadCostCenters();
        },
        error: (err) => {
          console.error(err);
          const msg = err.error?.errorMessage || 'Erro ao criar Centro de Custo.';
          this.toastr.error(msg, 'Erro');
        },
      });
    }
  }

  startEdit(cc: ICostCenter): void {
    this.showForm = true;
    this.editingId = cc.costCenterId;
    this.form.patchValue({
      name: cc.name,
      description: cc.description,
      type: cc.type,
      parentId: cc.parentId || null,
      storeId: cc.storeId,
    });
    this.activeTab = cc.type;
  }

  cancelEdit(): void {
    this.editingId = null;
    this.showForm = false;
    this.formDirective.resetForm({
      type: this.activeTab,
      storeId: this.data.storeId,
      parentId: null,
    });
  }

  deleteCostCenter(cc: ICostCenter): void {
    // Verifica se possui filhos
    const hasChildren = this.costCenters.some((child) => child.parentId === cc.costCenterId);
    if (hasChildren) {
      this.toastr.warning(
        'Não é possível excluir um Centro de Custo que possui subcategorias filhas. Exclua as filhas primeiro.',
        'Aviso',
      );
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
          this.toastr.error(
            'Erro ao excluir Centro de Custo. Certifique-se de que não está associado a nenhuma transação.',
            'Erro',
          );
        },
      });
    }
  }
}
