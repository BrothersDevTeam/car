import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
} from '@angular/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { PaginationComponent } from '@components/pagination/pagination.component';

import { PaginationResponse } from '@interfaces/pagination';
import type { GetVehicle } from '@interfaces/vehicle';

@Component({
  selector: 'app-vehicle-table',
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    PaginationComponent,
  ],
  templateUrl: './vehicle-table.component.html',
  styleUrl: './vehicle-table.component.scss',
})
export class VehicleTableComponent implements OnInit, OnChanges {
  @Input() vehiclePaginatedList!: PaginationResponse<GetVehicle>;
  @Input() searchValue?: string;
  @Output() selectedVehicle = new EventEmitter<GetVehicle>();
  @Output() pageEvent = new EventEmitter<PageEvent>();

  dataSource = new MatTableDataSource<GetVehicle>();

  displayedColumns: string[] = [
    'status',
    'licensePlate',
    'brand',
    'model',
    'year',
    'color',
    'imported',
  ];
  pageSizeOptions = [1000, 100, 50, 20];
  filteredData: GetVehicle[] = [];

  ngOnInit(): void {
    if (this.vehiclePaginatedList?.content) {
      this.dataSource.data = this.vehiclePaginatedList.content;
    }
  }

  ngOnChanges() {
    this.filteringData();
  }

  filteringData() {
    if (this.searchValue?.length) {
      this.filteredData = this.vehiclePaginatedList.content.filter(
        (element) => {
          const searchableString = [
            element.licensePlate,
            element.modelDto.brandDto.description,
            element.modelDto.description,
          ]
            .filter((value) => value)
            .join(' ')
            .trim()
            .toLowerCase();

          return searchableString.includes(
            this.searchValue!.trim().toLowerCase()
          );
        }
      );
      this.dataSource.data = this.filteredData;
    } else {
      this.dataSource.data = this.vehiclePaginatedList.content;
    }
  }

  onRowClick(row: GetVehicle) {
    this.selectedVehicle.emit(row);
  }

  handlePageEvent(event: PageEvent) {
    this.pageEvent.emit(event);
  }
}
