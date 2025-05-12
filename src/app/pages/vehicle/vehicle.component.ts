import { Component, inject, signal, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { catchError, of, Subscription } from 'rxjs';

import { DrawerComponent } from '@components/drawer/drawer.component';
import { ContentHeaderComponent } from '@components/content-header/content-header.component';
import { VehicleTableComponent } from '@components/tables/vehicle-table/vehicle-table.component';
import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';

import { VehicleFormComponent } from '@forms/vehicle/vehicle-form/vehicle-form.component';

import { VehicleInfoComponent } from '@info/vehicle-info/vehicle-info.component';

import type { PaginationResponse } from '@interfaces/pagination';
import type { GetVehicle, Vehicle, VehicleForm } from '@interfaces/vehicle';

import { VehicleService } from '@services/vehicle.service';
import { ActionsService } from '@services/actions.service';

@Component({
  selector: 'app-vehicle',
  imports: [
    ContentHeaderComponent,
    VehicleTableComponent,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    DrawerComponent,
    VehicleInfoComponent,
    VehicleFormComponent,
  ],
  templateUrl: './vehicle.component.html',
  styleUrl: './vehicle.component.scss',
})
export class VehicleComponent {
  readonly dialog = inject(MatDialog);
  private subscription!: Subscription;

  vehiclePaginatedList: PaginationResponse<GetVehicle> | null = null;
  selectedVehicle: VehicleForm | null = null;
  searchValue: string = '';
  paginationRequestConfig = {
    pageSize: 1000,
    pageIndex: 0,
  };

  vehicleListLoading = signal(false);
  vehicleListError = signal(false);
  openForm = signal(false);
  openInfo = signal(false);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private vehicleService: VehicleService,
    private toastr: ToastrService,
    private actionsService: ActionsService
  ) {
    this.loadVehicleList(
      this.paginationRequestConfig.pageIndex,
      this.paginationRequestConfig.pageSize
    );
  }

  ngOnInit() {
    this.subscription = this.actionsService.sidebarClick$.subscribe(() => {
      this.handleConfirmationCloseDrawer();
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  handleFormChanged(isDirty: boolean) {
    this.actionsService.hasFormChanges.set(isDirty);
  }

  handleConfirmationCloseDrawer() {
    if (this.actionsService.hasFormChanges()) {
      this.openDialog();
    } else {
      this.handleCloseDrawer();
    }
  }

  handleCloseDrawer() {
    this.openForm.set(false);
    this.openInfo.set(false);
    this.selectedVehicle = null;
    this.actionsService.hasFormChanges.set(false);
  }

  loadVehicleList(pageIndex: number, pageSize: number) {
    this.vehicleListLoading.set(true);
    this.vehicleService
      .getPaginatedData(pageIndex, pageSize)
      .pipe(
        catchError((err) => {
          this.vehicleListError.set(true);
          console.error('Erro ao carregar a lista de veículos:', err);
          this.toastr.error('Erro ao buscar dados da tabela de veículos');
          return of();
        })
      )
      .subscribe((response) => {
        this.vehicleListLoading.set(false);
        if (response) {
          this.vehiclePaginatedList = response;
        }
      });
  }

  handleSelectedVehicle(vehicle: GetVehicle) {
    (this.selectedVehicle = {
      ...vehicle,
      brandDto: vehicle.modelDto?.brandDto || null,
      modelDto: vehicle.modelDto || null,
    }),
      this.openInfo.set(true);
  }

  handleOpenForm() {
    this.openForm.set(true);
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
    this.openInfo.set(false);
    this.selectedVehicle = null;
    this.actionsService.hasFormChanges.set(false);
  }

  openDialog() {
    const dialogRef: MatDialogRef<ConfirmDialogComponent> = this.dialog.open(
      ConfirmDialogComponent,
      {
        data: {
          title: 'Há mudanças não salvas',
          message: 'Deseja fechar <strong>sem salvar</strong>?',
          confirmText: 'Sim',
          cancelText: 'Não',
        },
      }
    );

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.handleCloseDrawer();
      }
    });
  }
}
