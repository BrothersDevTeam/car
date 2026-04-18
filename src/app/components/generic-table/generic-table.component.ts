import { MatIconModule } from '@angular/material/icon';
import { PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

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

  @Output() rowClick = new EventEmitter<T>();
  @Output() pageEvent = new EventEmitter<PageEvent>();
  @Output() editClick = new EventEmitter<T>();
  @Output() deleteClick = new EventEmitter<T>();
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
    return this.columns.map((col) => col.key);
  }

  onRowClick(row: T) {
    this.rowClick.emit(row);
  }

  handlePageEvent(event: PageEvent) {
    this.pageEvent.emit(event);
  }

  getNestedValue(obj: any, key: string): any {
    return key
      .split('.')
      .reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), obj);
  }

  formatValue(column: ColumnConfig<T>, row: T): string {
    const value = this.getNestedValue(row, column.key);
    const columnValue = column.format
      ? column.format(value, row)
      : value?.toString() || '';
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
    const selectableRows = this.tableDataSource.data.filter((row) =>
      this.shouldShowCheckbox(row)
    );
    if (selectableRows.length === 0) return false;
    return selectableRows.every((row) => this.isSelected(row));
  }

  isSomeSelected(): boolean {
    return (
      this.tableDataSource.data.some((row) => this.isSelected(row)) &&
      !this.isAllSelected()
    );
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

  shouldShowEditIcon(row: T): boolean {
    const editColumn = this.columns.find((col) => col.key === 'edit');
    return editColumn?.showEditIcon ? editColumn.showEditIcon(row) : true;
  }

  shouldShowDeleteIcon(row: T): boolean {
    const deleteColumn = this.columns.find((col) => col.key === 'delete');
    return deleteColumn?.showDeleteIcon
      ? deleteColumn.showDeleteIcon(row)
      : true;
  }

  shouldShowCheckbox(row: T): boolean {
    const selectColumn = this.columns.find((col) => col.key === 'select');
    return selectColumn?.showCheckbox ? selectColumn.showCheckbox(row) : true;
  }
}
