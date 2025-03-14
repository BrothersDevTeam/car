import { Component, signal, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { ToastrService } from 'ngx-toastr';
import { catchError, of } from 'rxjs';

import { PaginationResponse } from '@interfaces/pagination';
import { Vehicle } from '@interfaces/vehicle';
import { VehicleService } from '@services/vehicle.service';

import { ContentHeaderComponent } from '@components/content-header/content-header.component';
import { VehicleTableComponent } from '@components/tables/vehicle-table/vehicle-table.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-vehicle',
  imports: [
    ContentHeaderComponent,
    VehicleTableComponent,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './vehicle.component.html',
  styleUrl: './vehicle.component.scss',
})
export class VehicleComponent {
  vehiclePaginatedList: PaginationResponse<Vehicle> | null = null;
  selectedVehicle: Vehicle | null = null;
  vehicleListError: boolean = false;
  searchValue: string = '';
  paginationRequestConfig = {
    pageSize: 1000,
    pageIndex: 0,
  };

  openForm = signal(false);
  openInfo = signal(false);

  handleCloseDrawer() {
    this.openForm.set(false);
    this.openInfo.set(false);
    this.selectedVehicle = null;
  }

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private vehicleService: VehicleService,
    private toastr: ToastrService
  ) {
    this.loadVehicleList(
      this.paginationRequestConfig.pageIndex,
      this.paginationRequestConfig.pageSize
    );
  }

  loadVehicleList(pageIndex: number, pageSize: number) {
    this.vehicleService
      .getPaginatedData(pageIndex, pageSize)
      .pipe(
        catchError((err) => {
          this.vehicleListError = true;
          console.error('Erro ao carregar a lista de veículos:', err);
          this.toastr.error('Erro ao buscar dados da tabela de veículos');
          return of();
        })
      )
      .subscribe((response) => {
        if (response) {
          this.vehiclePaginatedList = response;
        }
      });
  }

  handleSelectedVehicle(vehicle: Vehicle) {
    this.selectedVehicle = vehicle;
    this.openInfo.set(true);
  }

  handleOpenForm() {
    this.openForm.set(true);
    console.log('openForm: Implement me!');
  }

  handlePageEvent(event: PageEvent) {
    this.loadVehicleList(event.pageIndex, event.pageSize);
  }

  onSearch(event: Event) {
    this.searchValue = (event.target as HTMLInputElement).value;
  }

  handleEdit() {
    this.openInfo.set(false);
    this.openForm.set(true);
  }

  onFormSubmitted() {
    this.loadVehicleList(
      this.paginationRequestConfig.pageIndex,
      this.paginationRequestConfig.pageSize
    );
    this.openForm.set(false);
    this.selectedVehicle = null;
  }
}
