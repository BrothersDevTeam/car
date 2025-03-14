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

import { PaginationResponse } from '@interfaces/pagination';
import { Vehicle } from '@interfaces/vehicle';

import { PaginationComponent } from '@components/pagination/pagination.component';

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
  @Input() vehiclePaginatedList!: PaginationResponse<Vehicle>;
  @Input() searchValue?: string;
  @Output() selectedVehicle = new EventEmitter<Vehicle>();
  @Output() pageEvent = new EventEmitter<PageEvent>();

  dataSource = new MatTableDataSource<Vehicle>();

  displayedColumns: string[] = [
    'licensePlate',
    'brand',
    'model',
    'year',
    'color',
    'imported',
  ];
  pageSizeOptions = [1000, 100, 50, 20];
  filteredData: Vehicle[] = [];

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
            element.brand.name ||
            element.model.name
          ) {
            return (
              element.licensePlate ||
              element.brand.name ||
              element.model.name
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

  onRowClick(row: Vehicle) {
    this.selectedVehicle.emit(row);
  }

  handlePageEvent(event: PageEvent) {
    this.pageEvent.emit(event);
  }
}
