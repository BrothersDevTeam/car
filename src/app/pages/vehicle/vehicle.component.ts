import { Component, inject, signal, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { catchError, of, Subscription } from 'rxjs';

import { DrawerComponent } from '@components/drawer/drawer.component';
import { GenericTableComponent } from '@components/generic-table/generic-table.component';
import { ContentHeaderComponent } from '@components/content-header/content-header.component';
import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';

import { VehicleFormComponent } from '@forms/vehicle/vehicle-form/vehicle-form.component';

import { VehicleInfoComponent } from '@info/vehicle-info/vehicle-info.component';

import type { ColumnConfig } from '@interfaces/genericTable';
import type { PaginationResponse } from '@interfaces/pagination';
import type { GetVehicle, Vehicle, VehicleForm } from '@interfaces/vehicle';

import { VehicleService } from '@services/vehicle.service';
import { ActionsService } from '@services/actions.service';

@Component({
  selector: 'app-vehicle',
  imports: [
    ContentHeaderComponent,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    DrawerComponent,
    VehicleInfoComponent,
    VehicleFormComponent,
    GenericTableComponent,
  ],
  templateUrl: './vehicle.component.html',
  styleUrl: './vehicle.component.scss',
})
export class VehicleComponent {
  readonly dialog = inject(MatDialog);
  private subscription!: Subscription;
  private cacheSubscription!: Subscription;

  vehiclePaginatedList: PaginationResponse<GetVehicle> | null = null;
  selectedVehicle: VehicleForm | null = null;
  searchValue: string = '';
  paginationRequestConfig = {
    pageSize: 1000,
    pageIndex: 0,
  };
  columns: ColumnConfig<GetVehicle>[] = [
    {
      key: 'plate',
      header: 'Placa',
    },
    {
      key: 'brand',
      header: 'Marca',
    },
    {
      key: 'model',
      header: 'Modelo',
    },
    {
      key: 'modelYear',
      header: 'Ano/Modelo',
    },
    {
      key: 'color',
      header: 'Cor',
    },
    {
      key: 'origin',
      header: 'Origem',
    },
    {
      key: 'edit',
      header: '',
      showEditIcon: (row) => true,
    },
    {
      key: 'delete',
      header: '',
      showDeleteIcon: (row) => true,
    },
  ];

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

    // Inscrever-se nas mudanças do cache
    this.setupCacheSubscription();
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
    if (this.cacheSubscription) {
      this.cacheSubscription.unsubscribe();
    }
  }

  // Método para configurar a inscrição do cache
  private setupCacheSubscription() {
    this.cacheSubscription = this.vehicleService.cacheUpdated.subscribe(
      (updatedCache) => {
        if (updatedCache) {
          this.vehiclePaginatedList = updatedCache;
        }
      }
    );
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

  onRowClick(vehicle: GetVehicle) {
    this.handleSelectedVehicle(vehicle);
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

  handleEdit(vehicle?: GetVehicle) {
    if (vehicle) this.selectedVehicle = vehicle;
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

  handleDelete(vehicle: GetVehicle) {
    const dialogRef: MatDialogRef<ConfirmDialogComponent> = this.dialog.open(
      ConfirmDialogComponent,
      {
        data: {
          title: 'Confirmar exclusão',
          message: `Deseja realmente excluir o veículo <strong>${vehicle.plate}</strong>?`,
          confirmText: 'Sim, excluir',
          cancelText: 'Cancelar',
        },
      }
    );

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.deleteVehicle(vehicle.vehicleId!);
      }
    });
  }

  deleteVehicle(vehicleId: string) {
    this.vehicleService.delete(vehicleId).subscribe({
      next: (response) => {
        this.toastr.success('Veículo deletado com sucesso!');
        this.loadVehicleList(
          this.paginationRequestConfig.pageIndex,
          this.paginationRequestConfig.pageSize
        );
      },
      error: (err) => {
        console.error('Erro ao deletar veículo:', err);
        this.toastr.error('Erro ao deletar veículo');
      }
    });
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
