import { MatIconModule } from '@angular/material/icon';
import { PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, signal, SimpleChanges } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';

import { PaginationComponent } from '@components/pagination/pagination.component';

import type { ColumnConfig } from '@interfaces/genericTable';
import type { PaginationResponse } from '@interfaces/pagination';

@Component({
  selector: 'app-generic-table',
  imports: [
    MatTableModule,
    PaginationComponent,
    MatCheckboxModule,
    MatIconModule,
    MatButtonModule,
    NgClass,
    NgIf,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
  ],
  templateUrl: './generic-table.component.html',
  styleUrl: './generic-table.component.scss',
})
export class GenericTableComponent<T> implements OnInit, OnChanges {
  @Input() columns: ColumnConfig<T>[] = [];
  @Input() genericPaginatedList: PaginationResponse<T> | null = null;
  @Input() totalElements: number = 0;
  @Input() pageSizeOptions: number[] = [5, 10, 25, 100];
  @Input() loading: boolean = false;
  tooltipDirection = signal<'down' | 'up'>('down');

  @Output() rowClick = new EventEmitter<T>();
  @Output() pageEvent = new EventEmitter<PageEvent>();
  @Output() editClick = new EventEmitter<T>();
  @Output() deleteClick = new EventEmitter<T>();
  @Output() nfeClick = new EventEmitter<T>();
  @Output() selectionChange = new EventEmitter<T[]>();

  tableDataSource = new MatTableDataSource<T>();
  selectedRows: Set<T> = new Set<T>();

  ngOnInit(): void {
    if (this.genericPaginatedList?.content) {
      this.tableDataSource.data = this.genericPaginatedList.content;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['genericPaginatedList'] && this.genericPaginatedList?.content) {
      this.tableDataSource.data = this.genericPaginatedList.content;
    }
  }

  get hasSelectColumn(): boolean {
    return this.columns.some((col) => col.key === 'select');
  }

  get displayedColumns(): string[] {
    return this.columns.filter((col) => !col.hidden || !col.hidden()).map((col) => col.key);
  }

  onRowClick(row: T) {
    this.rowClick.emit(row);
  }

  handlePageEvent(event: PageEvent) {
    this.pageEvent.emit(event);
  }

  getNestedValue(obj: any, key: string): any {
    return key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), obj);
  }

  formatValue(column: ColumnConfig<T>, row: T): string {
    const value = this.getNestedValue(row, column.key);
    const columnValue = column.format ? column.format(value, row) : value?.toString() || '';
    return columnValue;
  }

  // Lógica para checkboxes
  isSelected(row: T): boolean {
    return this.selectedRows.has(row);
  }

  toggleRow(row: T): void {
    if (this.isSelected(row)) {
      this.selectedRows.delete(row);
    } else {
      this.selectedRows.add(row);
    }
    this.selectionChange.emit(Array.from(this.selectedRows));
  }

  isAllSelected(): boolean {
    const selectableRows = this.tableDataSource.data.filter((row) => this.shouldShowCheckbox(row));
    if (selectableRows.length === 0) return false;
    return selectableRows.every((row) => this.isSelected(row));
  }

  isSomeSelected(): boolean {
    return this.tableDataSource.data.some((row) => this.isSelected(row)) && !this.isAllSelected();
  }

  toggleAllRows(): void {
    if (this.isAllSelected()) {
      this.selectedRows.clear();
    } else {
      this.tableDataSource.data.forEach((row) => {
        if (this.shouldShowCheckbox(row)) {
          this.selectedRows.add(row);
        }
      });
    }
    this.selectionChange.emit(Array.from(this.selectedRows));
  }

  onEditClick(row: T): void {
    this.editClick.emit(row);
  }

  onDeleteClick(row: T): void {
    this.deleteClick.emit(row);
  }

  onNfeClick(row: T): void {
    this.nfeClick.emit(row);
  }

  shouldShowEditIcon(row: T): boolean {
    const editColumn = this.columns.find((col) => col.key === 'edit');
    return editColumn?.showEditIcon ? editColumn.showEditIcon(row) : true;
  }

  shouldShowDeleteIcon(row: T): boolean {
    const deleteColumn = this.columns.find((col) => col.key === 'delete');
    return deleteColumn?.showDeleteIcon ? deleteColumn.showDeleteIcon(row) : true;
  }

  shouldShowNfeIcon(row: T): boolean {
    const nfeColumn = this.columns.find((col) => col.key === 'nfe');
    return nfeColumn?.showNfeIcon ? nfeColumn.showNfeIcon(row) : true;
  }

  shouldShowCheckbox(row: T): boolean {
    const selectColumn = this.columns.find((col) => col.key === 'select');
    return selectColumn?.showCheckbox ? selectColumn.showCheckbox(row) : true;
  }

  getAlertMessage(column: ColumnConfig<T>, row: T): string | null {
    return column.alertConfig?.getMessage(row) ?? null;
  }

  getAlertTitle(column: ColumnConfig<T>, row: T): string {
    if (!column.alertConfig?.title) {
      return 'Pendências para Autorização SEFAZ';
    }
    return typeof column.alertConfig.title === 'function'
      ? column.alertConfig.title(row)
      : column.alertConfig.title;
  }

  getActionLabel(action: any, row: T): string {
    if (!action) return '';
    return typeof action.label === 'function' ? action.label(row) : action.label || '';
  }

  getActionIcon(action: any, row: T): string {
    if (!action) return '';
    return typeof action.icon === 'function' ? action.icon(row) : action.icon || '';
  }

  getActionColor(action: any, row: T): string {
    if (!action) return 'primary';
    return typeof action.color === 'function' ? action.color(row) : action.color || 'primary';
  }

  getActionCssClass(action: any, row: T): string {
    if (!action) return '';
    return typeof action.cssClass === 'function' ? action.cssClass(row) : action.cssClass || '';
  }

  hasVisibleActions(column: ColumnConfig<T>, row: T): boolean {
    if (!column.actions || column.actions.length === 0) return false;
    return column.actions.some((a) => !a.hidden || !a.hidden(row));
  }

  hasVisibleMenuActions(column: ColumnConfig<T>, row: T): boolean {
    if (!column.menuActions || column.menuActions.length === 0) return false;
    return column.menuActions.some((a) => !a.hidden || !a.hidden(row));
  }

  updateTooltipDirection(event: MouseEvent) {
    const y = event.clientY;
    const windowHeight = window.innerHeight;
    // Se estiver abaixo de 60% da tela, abre para cima
    this.tooltipDirection.set(y > windowHeight * 0.6 ? 'up' : 'down');
  }

  parseErrorGroups(rawMessage: string | null | undefined): { category: string; items: string[] }[] {
    if (!rawMessage) return [];
    const parts = rawMessage
      .split(';')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const groupMap = new Map<string, string[]>();

    for (const part of parts) {
      const colonIndex = part.indexOf(':');
      let category = '';
      let item = part;

      if (colonIndex > 0) {
        category = part.substring(0, colonIndex).trim();
        item = part.substring(colonIndex + 1).trim();
      }

      if (!groupMap.has(category)) {
        groupMap.set(category, []);
      }
      groupMap.get(category)!.push(item);
    }

    return Array.from(groupMap.entries()).map(([category, items]) => ({
      category,
      items,
    }));
  }

  getTotalErrors(rawMessage: string | null | undefined): number {
    if (!rawMessage) return 0;
    return rawMessage
      .split(';')
      .map((p) => p.trim())
      .filter((p) => p.length > 0).length;
  }

  getCategoryIcon(category: string): string {
    const cat = category.toLowerCase();
    if (cat.includes('veículo') || cat.includes('veiculo')) return 'directions_car';
    if (cat.includes('emitente') || cat.includes('loja')) return 'storefront';
    if (cat.includes('destinatário') || cat.includes('destinatario') || cat.includes('cliente')) return 'person';
    if (cat.includes('item') || cat.includes('produto')) return 'inventory_2';
    if (cat.includes('pagamento')) return 'payments';
    if (cat.includes('transporte') || cat.includes('frete')) return 'local_shipping';
    return 'label';
  }
}
