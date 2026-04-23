import { Component, inject, signal, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ToastrService } from 'ngx-toastr';

import { DrawerComponent } from '@components/drawer/drawer.component';
import { GenericTableComponent } from '@components/generic-table/generic-table.component';
import { ContentHeaderComponent } from '@components/content-header/content-header.component';
import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';
import { UnsavedChangesDialogComponent } from '@components/dialogs/unsaved-changes-dialog/unsaved-changes-dialog.component';
import { StoreContextService } from '@services/store-context.service';
import {
  Subject,
  Subscription,
  catchError,
  debounceTime,
  of,
  Observable,
} from 'rxjs';
import { EmptyStateComponent } from '@components/empty-state/empty-state.component';

import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { VehicleFormComponent } from '@forms/vehicle/vehicle-form/vehicle-form.component';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { NfeService } from '@services/nfe.service';

import { VehicleInfoComponent } from '@info/vehicle-info/vehicle-info.component';

import type { ColumnConfig } from '@interfaces/genericTable';
import type { PaginationResponse } from '@interfaces/pagination';
import type { Vehicle, VehicleForm, VehicleList } from '@interfaces/vehicle';

import { VehicleService } from '@services/vehicle.service';
import { ActionsService } from '@services/actions.service';
import { CanComponentDeactivate } from '@guards/unsaved-changes.guard';

@Component({
  selector: 'app-vehicle',
  standalone: true,
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
    MatSnackBarModule,
  ],
  templateUrl: './vehicle.component.html',
  styleUrl: './vehicle.component.scss',
})
export class VehicleComponent implements CanComponentDeactivate {
  readonly dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private nfeService = inject(NfeService);
  private subscription: Subscription = new Subscription();
  private cacheSubscription!: Subscription;
  private searchSubject = new Subject<string>();

  vehiclePaginatedList: PaginationResponse<VehicleList> | null = null;
  selectedVehicle: VehicleForm | null = null;
  searchValue: string = '';
  selectedStoreId: string | null = null;
  selectedStatus: 'DISPONIVEL' | 'VENDIDO' | 'TODOS' = 'TODOS';
  paginationRequestConfig = {
    pageSize: 1000,
    pageIndex: 0,
  };
  columns: ColumnConfig<VehicleList>[] = [
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
      key: 'nfes',
      header: 'NFes',
      actions: [
        {
          label: 'NFe de Entrada',
          icon: 'input',
          color: 'primary',
          action: (row) => this.viewNfe(row, '0'),
          hidden: (row) =>
            !row.nfeHistory?.some((n) => n.nfeTipoDocumento === '0'),
        },
        {
          label: 'NFe de Saída',
          icon: 'output',
          color: 'accent',
          action: (row) => this.viewNfe(row, '1'),
          hidden: (row) =>
            !row.nfeHistory?.some((n) => n.nfeTipoDocumento === '1'),
        },
      ],
    },
    {
      key: 'acoes_nfe',
      header: 'Ações NFe',
      actions: [
        {
          label: 'Emitir NFe de Compra',
          icon: 'receipt_long',
          color: 'primary',
          action: (row) => this.gerarNfeCompra(row),
          hidden: (row) =>
            !!row.nfeHistory?.some((nfe) => nfe.nfeTipoDocumento === '0'),
        },
      ],
      alertConfig: {
        getMessage: (row) => {
          const errors = this.getVehicleNfeValidationErrors(row);
          return errors.length > 0 ? errors.join('; ') : null;
        },
        icon: 'error_outline',
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
  @ViewChild(VehicleFormComponent) vehicleFormRef?: VehicleFormComponent;

  constructor(
    private vehicleService: VehicleService,
    private toastr: ToastrService,
    private actionsService: ActionsService,
    private storeContextService: StoreContextService,
    private http: HttpClient,
    private router: Router
  ) {
    // Inscrever-se nas mudanças do cache
    this.setupCacheSubscription();
    this.setupSearchDebounce();
  }

  ngOnInit() {
    this.subscription.add(
      this.actionsService.sidebarClick$.subscribe(
        (targetRoute: string | undefined) => {
          // Se a gaveta estiver aberta...
          if (this.openForm() || this.openInfo()) {
            const currentRoute = '/vehicle';

            // Se o clique foi em um menu que aponta para OUTRA rota,
            // não fazemos nada aqui e deixamos o unsavedChangesGuard agir.
            if (targetRoute && targetRoute !== currentRoute) {
              return;
            }

            this.handleConfirmationCloseDrawer();
          }
        }
      )
    );

    // Contexto Global de Loja
    this.subscription.add(
      this.storeContextService.currentStoreId$.subscribe((storeId) => {
        this.selectedStoreId = storeId;
        this.vehicleService.clearCache(); // Limpa cache sempre que a loja mudar (Global ou Específica)
        this.loadVehicleList(
          0,
          this.paginationRequestConfig.pageSize,
          this.searchValue
        );
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

    searchParams.storeId = this.selectedStoreId ?? undefined;

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
          return of(null as unknown as PaginationResponse<VehicleList>);
        })
      )
      .subscribe((response) => {
        this.vehicleListLoading.set(false);
        if (response && response.content) {
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

  handleSelectedVehicle(vehicle: VehicleList) {
    this.vehicleService.getById(vehicle.vehicleId).subscribe({
      next: (fullVehicle) => {
        this.selectedVehicle = this.vehicleToForm(fullVehicle);
        this.openInfo.set(true);
      },
      error: (err) => {
        this.toastr.error('Erro ao carregar detalhes do veículo');
        console.error(err);
      },
    });
  }

  onRowClick(vehicle: VehicleList) {
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
  handleEdit(vehicle: VehicleList | Vehicle | VehicleForm) {
    if (
      'vehicleId' in vehicle &&
      !('chassis' in vehicle) &&
      !('buyerDisplay' in vehicle)
    ) {
      // É VehicleList (veio da tabela), precisa buscar o completo
      this.vehicleService.getById(vehicle.vehicleId!).subscribe({
        next: (fullVehicle) => {
          this.selectedVehicle = this.vehicleToForm(fullVehicle);
          this.openInfo.set(false);
          this.openForm.set(true);
        },
        error: (err) =>
          this.toastr.error('Erro ao carregar veículo para edição'),
      });
      return;
    }

    // Se for Vehicle (tem propriedade owner do tipo Person), converte
    if (
      'owner' in vehicle &&
      vehicle.owner &&
      typeof vehicle.owner === 'object'
    ) {
      this.selectedVehicle = this.vehicleToForm(vehicle as Vehicle);
    } else {
      // Já é VehicleForm ou já tem o formato correto
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

  handleDelete(vehicle: VehicleList) {
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

  /**
   * Chama o backend para gerar o rascunho da NFe de compra.
   */
  viewNfe(row: any, tipo: string) {
    const nfe = row.nfeHistory?.find((n: any) => n.nfeTipoDocumento === tipo);
    if (nfe && nfe.nfeDanfeUrl) {
      window.open(nfe.nfeDanfeUrl, '_blank');
    } else if (nfe) {
      this.toastr.info(
        'DANFE não disponível. A NFe está em rascunho ou processamento. Redirecionando para a lista de NFes...',
        'Info'
      );
      this.router.navigate(['/nfe']);
    } else {
      this.toastr.warning('NFe não encontrada.');
    }
  }

  gerarNfeCompra(vehicle: VehicleList) {
    const errors = this.getVehicleNfeValidationErrors(vehicle);

    if (errors.length > 0) {
      this.snackBar.open(
        'Resolva as pendências antes de gerar a NFe de Entrada. Verifique o ícone de alerta (!).',
        'OK',
        { duration: 5000, panelClass: ['warn-snackbar'] }
      );
      return;
    }

    this.toastr.info('Gerando rascunho de NFe de compra...');
    this.nfeService.generatePurchaseNfe(vehicle.vehicleId).subscribe({
      next: (response: any) => {
        this.toastr.success('Rascunho de NFe gerado com sucesso!');
        this.router.navigate(['/nfe']);
      },
      error: (err: any) => {
        console.error('Erro ao gerar NFe:', err);
        // Tenta extrair a mensagem detalhada da API (errorMessage ou message)
        const msg =
          err.error?.errorMessage ||
          err.error?.message ||
          'Erro ao gerar rascunho de NFe';
        this.toastr.error(msg, 'Erro ao gerar rascunho de NFe');
      },
    });
  }

  // --- Implementação de CanComponentDeactivate ---

  hasUnsavedChanges(): boolean {
    if (!this.openForm()) {
      return false;
    }
    return this.vehicleFormRef?.hasUnsavedChanges() ?? false;
  }

  canSaveForm(): boolean {
    return this.vehicleFormRef?.canSaveForm() ?? false;
  }

  saveForm(isDraft: boolean): Observable<boolean> {
    if (!this.vehicleFormRef) {
      return of(true);
    }
    return this.vehicleFormRef.saveForm(isDraft);
  }

  saveLocalDraft(silent?: boolean, name?: string): void {
    if (this.vehicleFormRef) {
      this.vehicleFormRef.saveLocalDraft(silent, name);
    }
  }

  openDialog() {
    const canSave = this.vehicleFormRef?.vehicleForm?.valid ?? false;

    const dialogRef = this.dialog.open(UnsavedChangesDialogComponent, {
      width: '450px',
      disableClose: true,
      data: {
        canSave,
        message: canSave
          ? 'Deseja salvar as alterações do veículo antes de sair?'
          : 'Há campos obrigatórios não preenchidos ou inválidos. Deseja descartar as alterações?',
        hideDraftOption: false,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result || result === 'cancel') return;

      if (result === 'discard') {
        this.handleCloseDrawer();
        return;
      }

      if (result === 'save' && canSave) {
        this.vehicleFormRef?.onSubmit();
      }

      if (typeof result === 'string' && result.startsWith('draft:')) {
        const draftName = result.split(':')[1];
        this.vehicleFormRef?.saveLocalDraft(true, draftName);
        this.handleCloseDrawer();
      }
    });
  }

  /**
   * Verifica campos obrigatórios para emissão de NFe e retorna lista de pendências.
   */
  getVehicleNfeValidationErrors(vehicle: VehicleList): string[] {
    const errors: string[] = [];

    // Dados Básicos do Veículo
    if (!vehicle.brand) errors.push('Marca');
    if (!vehicle.model) errors.push('Modelo');
    if (!vehicle.vehicleYear) errors.push('Ano Fabr.');
    if (!vehicle.modelYear) errors.push('Ano Mod.');
    if (!vehicle.color) errors.push('Cor');
    if (!vehicle.chassis) errors.push('Chassi');
    if (!vehicle.renavam) errors.push('Renavam');
    if (!vehicle.vehicleType) errors.push('Tipo');
    if (!vehicle.species) errors.push('Espécie');
    if (!vehicle.category) errors.push('Categoria');
    if (!vehicle.fuelTypes || vehicle.fuelTypes.length === 0)
      errors.push('Combustível');

    // Dados de Compra (necessários para NFe de Entrada)
    // Só valida se não tiver NFe de entrada autorizada
    const temNfeEntrada = vehicle.nfeHistory?.some(
      (n) => n.nfeTipoDocumento === '0' && n.nfeStatus === 'autorizado'
    );
    if (!temNfeEntrada) {
      if (!vehicle.supplierId) errors.push('Fornecedor');
      else if (vehicle.hasSupplierAddress === false)
        errors.push('Endereço do Fornecedor');

      if (!vehicle.valorCompra || vehicle.valorCompra === '0')
        errors.push('Valor Compra');
      if (!vehicle.dataCompra) errors.push('Data Compra');
    }

    return errors;
  }
}
