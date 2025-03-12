import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';

import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';

import { Person } from '@interfaces/entity';
import { PaginationResponse } from '@interfaces/pagination';
import { PaginationComponent } from '../../pagination/pagination.component';

@Component({
  selector: 'app-table',
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    PaginationComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss',
})
export class TableComponent implements OnInit, OnChanges {
  @Input() personPaginatedList!: PaginationResponse<Person>;
  @Input() searchValue?: string;
  @Output() selectedPerson = new EventEmitter<Person>();
  @Output() pageEvent = new EventEmitter<PageEvent>();

  dataSource = new MatTableDataSource<Person>();

  displayedColumns: string[] = ['fullName', 'active', 'cpf', 'cnpj'];
  pageSizeOptions = [1000, 100, 50, 20];
  filteredData: Person[] = [];

  @ViewChild(MatSort) sort!: MatSort;

  ngAfterViewInit() {}

  ngOnInit(): void {
    if (this.personPaginatedList?.content) {
      this.dataSource.data = this.personPaginatedList.content;
    }
  }

  ngOnChanges() {
    this.filteringData();
  }

  filteringData() {
    if (this.searchValue?.length) {
      this.filteredData = this.personPaginatedList.content.filter((element) => {
        if (element.person.fullName || element.person.legalName) {
          return (element.person.fullName || element.person.legalName)
            .trim()
            .toLowerCase()
            .includes(this.searchValue!.trim().toLowerCase());
        } else return false;
      });
      this.dataSource.data = this.filteredData;
    } else {
      this.dataSource.data = this.personPaginatedList.content;
    }
  }

  onRowClick(row: Person) {
    this.selectedPerson.emit(row);
  }

  handlePageEvent(event: PageEvent) {
    this.pageEvent.emit(event);
  }
}
