import { Component, inject, signal, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

import { DrawerComponent } from '@components/drawer/drawer.component';
import { GenericTableComponent } from '@components/generic-table/generic-table.component';
import { ContentHeaderComponent } from '@components/content-header/content-header.component';
import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';
import { StoreContextService } from '@services/store-context.service';
import { Subject, Subscription, catchError, debounceTime, of } from 'rxjs';
import { EmptyStateComponent } from '@components/empty-state/empty-state.component';

import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { VehicleFormComponent } from '@forms/vehicle/vehicle-form/vehicle-form.component';

import { VehicleInfoComponent } from '@info/vehicle-info/vehicle-info.component';

import type { ColumnConfig } from '@interfaces/genericTable';
import type { PaginationResponse } from '@interfaces/pagination';
import type { Vehicle, VehicleForm } from '@interfaces/vehicle';

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
    MatButtonModule,
    MatButtonToggleModule,
    EmptyStateComponent,
    FormsModule,
    MatIconModule,
  ],
  templateUrl: './vehicle.component.html',
  styleUrl: './vehicle.component.scss',
})
export class VehicleComponent {
  readonly dialog = inject(MatDialog);
  private subscription: Subscription = new Subscription();
  private cacheSubscription!: Subscription;
  private searchSubject = new Subject<string>();

  vehiclePaginatedList: PaginationResponse<Vehicle> | null = null;
  selectedVehicle: VehicleForm | null = null;
  searchValue: string = '';
  selectedStoreId: string | null = null;
  selectedStatus: 'DISPONIVEL' | 'VENDIDO' | 'TODOS' = 'TODOS';
  paginationRequestConfig = {
    pageSize: 1000,
    pageIndex: 0,
  };
  columns: ColumnConfig<Vehicle>[] = [
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
      key: 'status',
      header: 'Status',
      badgeConfig: {
        DISPONIVEL: { label: 'Disponível', cssClass: 'badge-disponivel' },
        VENDIDO: { label: 'Vendido', cssClass: 'badge-vendido' },
      },
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

  // Configurações dinâmicas para o Empty State baseadas no status do veículo
  private readonly emptyStateConfigs: Record<
    string,
    { icon: string; title: string; description: string }
  > = {
    TODOS: {
      icon: 'no_sim',
      title: 'Nenhum veículo no estoque',
      description:
        'Sua lista de veículos aparecerá aqui assim que você adicionar novos itens ao estoque.',
    },
    DISPONIVEL: {
      icon: 'check_circle',
      title: 'Nenhum veículo disponível',
      description:
        'Todos os seus veículos foram vendidos ou o estoque está vazio.',
    },
    VENDIDO: {
      icon: 'sell',
      title: 'Nenhum veículo vendido',
      description:
        'O histórico de veículos comercializados aparecerá neste filtro.',
    },
  };

  get emptyStateIcon(): string {
    return this.emptyStateConfigs[this.selectedStatus]?.icon || 'no_sim';
  }

  get emptyStateTitle(): string {
    return (
      this.emptyStateConfigs[this.selectedStatus]?.title ||
      'Nenhum veículo encontrado'
    );
  }

  get emptyStateDescription(): string {
    return (
      this.emptyStateConfigs[this.selectedStatus]?.description ||
      'Sua lista de veículos aparecerá aqui.'
    );
  }

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private vehicleService: VehicleService,
    private toastr: ToastrService,
    private actionsService: ActionsService,
    private storeContextService: StoreContextService
  ) {
    // Inscrever-se nas mudanças do cache
    this.setupCacheSubscription();
    this.setupSearchDebounce();
  }

  ngOnInit() {
    this.subscription.add(
      this.actionsService.sidebarClick$.subscribe(() => {
        this.handleConfirmationCloseDrawer();
      })
    );

    // Contexto Global de Loja
    this.subscription.add(
      this.storeContextService.currentStoreId$.subscribe((storeId) => {
        if (this.selectedStoreId !== storeId) {
          this.selectedStoreId = storeId;
          this.loadVehicleList(
            0,
            this.paginationRequestConfig.pageSize,
            this.searchValue
          );
        }
      })
    );
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

  // Configura o debounce de 500ms para a busca
  private setupSearchDebounce() {
    this.subscription.add(
      this.searchSubject
        .pipe(
          debounceTime(500) // Aguarda 500ms após o usuário parar de digitar
        )
        .subscribe((searchValue) => {
          this.loadVehicleList(
            0, // Sempre volta para a primeira página ao buscar
            this.paginationRequestConfig.pageSize,
            searchValue
          );
        })
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

  loadVehicleList(pageIndex: number, pageSize: number, searchValue?: string) {
    this.vehicleListLoading.set(true);

    let searchParams: {
      search?: string;
      storeId?: string;
      status?: 'DISPONIVEL' | 'VENDIDO' | 'TODOS';
    } = {};

    if (searchValue && searchValue.trim()) {
      searchParams.search = searchValue.trim();
    }

    if (this.selectedStoreId) {
      searchParams.storeId = this.selectedStoreId;
    }

    if (this.selectedStatus !== 'TODOS') {
      searchParams.status = this.selectedStatus;
    }

    this.vehicleService
      .getPaginatedData(pageIndex, pageSize, searchParams)
      .pipe(
        catchError((err: any) => {
          this.vehicleListError.set(true);
          console.error('Erro ao carregar a lista de veículos:', err);
          this.toastr.error('Erro ao buscar dados da tabela de veículos');
          return of(null as unknown as PaginationResponse<Vehicle>);
        })
      )
      .subscribe((response) => {
        this.vehicleListLoading.set(false);
        if (response && response.content) {
          // Mapear dados para injetar o status virtual
          response.content = response.content.map((vehicle) => ({
            ...vehicle,
            status: vehicle.exitDate ? 'VENDIDO' : 'DISPONIVEL',
          }));
          this.vehiclePaginatedList = response;
        }
      });
  }

  /**
   * Converte Vehicle para VehicleForm
   * Vehicle.owner é Person | undefined
   * VehicleForm.owner é string | undefined (ID da pessoa)
   */
  private vehicleToForm(vehicle: Vehicle): VehicleForm {
    const form = {
      ...vehicle,
      owner: vehicle.owner?.personId || undefined,
    };
    return form;
  }

  handleSelectedVehicle(vehicle: Vehicle) {
    this.selectedVehicle = this.vehicleToForm(vehicle);
    this.openInfo.set(true);
  }

  onRowClick(vehicle: Vehicle) {
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
    this.searchSubject.next(this.searchValue);
  }

  onStatusChange(status: any) {
    this.selectedStatus = status;
    this.loadVehicleList(
      0,
      this.paginationRequestConfig.pageSize,
      this.searchValue
    );
  }

  clearSearch() {
    this.searchValue = '';
    this.loadVehicleList(
      this.paginationRequestConfig.pageIndex,
      this.paginationRequestConfig.pageSize
    );
  }

  /**
   * Método handleEdit aceita tanto Vehicle quanto VehicleForm
   * Quando vem da tabela (editClick), recebe Vehicle
   * Quando vem do vehicle-info (editEvent), recebe VehicleForm
   */
  handleEdit(vehicle: Vehicle | VehicleForm) {
    // Se for Vehicle (tem propriedade owner do tipo Person), converte
    if (
      'owner' in vehicle &&
      vehicle.owner &&
      typeof vehicle.owner === 'object'
    ) {
      this.selectedVehicle = this.vehicleToForm(vehicle as Vehicle);
    } else {
      // Já é VehicleForm
      this.selectedVehicle = vehicle as VehicleForm;
    }

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

  handleDelete(vehicle: Vehicle) {
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
      },
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
