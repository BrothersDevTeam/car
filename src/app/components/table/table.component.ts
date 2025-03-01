import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { Sort, MatSortModule } from '@angular/material/sort';

import { Person } from '@interfaces/entity';
import { PaginationResponse } from '@interfaces/pagination';

@Component({
  selector: 'app-table',
  imports: [MatTableModule, MatPaginatorModule, MatSortModule],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss',
})
export class TableComponent implements OnInit {
  @Input() personPaginatedList!: PaginationResponse<Person>;

  @Output() selectedPerson = new EventEmitter<Person>();
  @Output() pageEvent = new EventEmitter<PageEvent>();

  displayedColumns: string[] = ['fullName', 'active', 'cpf', 'cnpj'];
  pageSizeOptions = [1000, 100, 50];
  sortedData!: Person[];

  ngOnInit(): void {
    if (this.personPaginatedList?.content) {
      this.sortedData = this.personPaginatedList.content;
    }
  }

  sortData(sort: Sort) {
    const data = this.personPaginatedList.content.slice();
    if (!sort.active || sort.direction === '') {
      this.sortedData = data;
      return;
    }

    this.sortedData = data.sort((a, b) => {
      const isAsc = sort.direction === 'asc';
      switch (sort.active) {
        case 'fullName':
          return compare(a.person.fullName, b.person.fullName, isAsc);
        case 'active':
          return compare(
            a.person.active ? 1 : 0,
            b.person.active ? 1 : 0,
            isAsc
          );
        default:
          return 0;
      }
    });

    function compare(a: number | string, b: number | string, isAsc: boolean) {
      return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
    }
  }

  onRowClick(row: Person) {
    this.selectedPerson.emit(row);
  }

  handlePageEvent(event: PageEvent) {
    this.pageEvent.emit(event);
  }
}
