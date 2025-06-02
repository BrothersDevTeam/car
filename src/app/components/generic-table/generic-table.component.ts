import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { PageEvent } from '@angular/material/paginator';
import { CommonModule } from '@angular/common';

import { PaginationComponent } from '@components/pagination/pagination.component';

import { PaginationResponse } from '@interfaces/pagination';
import { ColumnConfig } from '@interfaces/genericTable';

@Component({
  selector: 'app-generic-table',
  imports: [MatTableModule, PaginationComponent, CommonModule],
  templateUrl: './generic-table.component.html',
  styleUrl: './generic-table.component.scss',
})
export class GenericTableComponent<T> implements OnInit {
  @Input() columns: ColumnConfig<T>[] = [];
  @Input() genericPaginatedList: PaginationResponse<T> | null = null;
  @Input() totalElements: number = 0;
  @Input() pageSizeOptions: number[] = [5, 10, 25, 100];

  @Output() rowClick = new EventEmitter<T>();
  @Output() pageEvent = new EventEmitter<PageEvent>();

  tableDataSource = new MatTableDataSource<T>();

  ngAfterViewInit() {}

  ngOnInit(): void {
    if (this.genericPaginatedList?.content) {
      this.tableDataSource.data = this.genericPaginatedList.content;
    }
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
}
