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
          if (
            element.licensePlate ||
            element.brand.description ||
            element.model.description
          ) {
            return (
              element.licensePlate ||
              element.brand.description ||
              element.model.description
            )
              .trim()
              .toLowerCase()
              .includes(this.searchValue!.trim().toLowerCase());
          } else return false;
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
