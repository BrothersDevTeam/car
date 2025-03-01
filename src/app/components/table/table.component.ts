import { Component, EventEmitter, Input, Output } from '@angular/core';

import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';

import { Person } from '@interfaces/entity';
import { PaginationResponse } from '@interfaces/pagination';

@Component({
  selector: 'app-table',
  imports: [MatTableModule, MatPaginatorModule],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss',
})
export class TableComponent {
  @Input() personPaginatedList!: PaginationResponse<Person>;

  @Output() selectedPerson = new EventEmitter<Person>();
  @Output() pageEvent = new EventEmitter<PageEvent>();

  displayedColumns: string[] = ['fullName', 'active', 'cpf', 'cnpj'];
  pageSizeOptions = [1000, 100, 50];

  onRowClick(row: Person) {
    this.selectedPerson.emit(row);
  }

  handlePageEvent(event: PageEvent) {
    this.pageEvent.emit(event);
  }
}
