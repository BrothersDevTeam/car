import { Component, inject, signal, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Subscription, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { extractErrorMessage } from '@utils/error-utils';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';

import { ContentHeaderComponent } from '@components/content-header/content-header.component';
import { GenericTableComponent } from '@components/generic-table/generic-table.component';
import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '@components/empty-state/empty-state.component';
import { DrawerComponent } from '@components/drawer/drawer.component';
import { CompraInfoComponent } from '../../../info/compra-info/compra-info.component';

import { CompraService } from '@services/compra.service';
import { StoreContextService } from '@services/store-context.service';
import { AuthService } from '@services/auth/auth.service';
import { ToastrService } from 'ngx-toastr';

import { Compra } from '@interfaces/compra';
import { PaginationResponse } from '@interfaces/pagination';
import { ColumnConfig } from '@interfaces/genericTable';
import { Authorizations } from '@enums/authorizations';

@Component({
  selector: 'app-compras-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ContentHeaderComponent,
    GenericTableComponent,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    EmptyStateComponent,
    DrawerComponent,
    CompraInfoComponent,
  ],
  providers: [DatePipe, CurrencyPipe],
  templateUrl: './compras-list.component.html',
  styleUrl: './compras-list.component.scss',
})
export class ComprasListComponent implements OnInit, OnDestroy {
  private compraService = inject(CompraService);
  private storeContextService = inject(StoreContextService);
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private datePipe = inject(DatePipe);
  private currencyPipe = inject(CurrencyPipe);

  private subscription = new Subscription();
  private searchSubject = new Subject<string>();

  comprasPaginatedList: PaginationResponse<Compra> | null = null;
  comprasListLoading = signal(false);
  openInfo = signal(false);
  selectedCompraId = signal<string | null>(null);
  searchValue: string = '';
  selectedStoreId: string | null = null;

  paginationConfig = {
    pageSize: 10,
    pageIndex: 0,
  };

  columns: ColumnConfig<Compra>[] = [
    {
      key: 'dataCompra',
      header: 'Data',
      format: (val) => this.datePipe.transform(val, 'dd/MM/yyyy') || '—',
    },
    {
      key: 'storeName',
      header: 'Loja',
      hidden: () => !!this.selectedStoreId,
    },
    {
      key: 'supplierName',
      header: 'Fornecedor',
      format: (val) => val || '—',
    },
    {
      key: 'vehicleDescription',
      header: 'Veículo',
      format: (val, row) => {
        if (row && row.vehiclePlate) {
          const desc = [row.vehiclePlate, row.vehicleBrand, row.vehicleModel].filter(Boolean).join(' - ');
          return desc || '—';
        }
        return val || '—';
      },
    },
    {
      key: 'valorCompra',
      header: 'Valor da Compra',
      format: (val) => this.currencyPipe.transform(val, 'BRL', 'symbol', '1.2-2') || '—',
    },
    {
      key: 'nfeStatus',
      header: 'NF-e',
      badgeConfig: {
        rascunho: { label: 'Em Digitação', cssClass: 'badge-rascunho' },
        processando: { label: 'Processando', cssClass: 'badge-processando' },
        autorizado: { label: 'Autorizada', cssClass: 'badge-autorizado' },
        cancelado: { label: 'Cancelada', cssClass: 'badge-cancelado' },
        erro: { label: 'Erro', cssClass: 'badge-erro' },
        erro_autorizacao: { label: 'Erro Autorização', cssClass: 'badge-erro' },
      },
      format: (val) => val || 'Não Gerada',
    },
    {
      key: 'acoes',
      header: '',
      menuActions: [
        {
          label: 'Editar Compra',
          icon: 'edit',
          color: 'primary',
          action: (row: Compra) => this.handleEdit(row),
          hidden: () => !this.authService.hasAuthority(Authorizations.EDIT_VEHICLE_STORE),
        },
        {
          label: 'Gerar NFe de Compra',
          icon: 'receipt_long',
          color: 'primary',
          action: (row: Compra) => this.handleEmitirNfe(row),
          hidden: (row: Compra) =>
            !this.authService.hasAuthority(Authorizations.CREATE_NFE_STORE) || !!row.nfeId,
        },
        {
          label: 'Excluir Compra',
          icon: 'delete',
          color: 'warn',
          action: (row: Compra) => this.handleDelete(row),
          hidden: () => !this.authService.hasAuthority(Authorizations.DELETE_VEHICLE_STORE),
        },
      ],
    },
  ];

  ngOnInit() {
    this.subscription.add(
      this.storeContextService.currentStoreId$.subscribe((storeId) => {
        this.selectedStoreId = storeId;
        this.compraService.clearCache();
        this.loadComprasList();
      }),
    );

    this.subscription.add(
      this.searchSubject.pipe(debounceTime(400), distinctUntilChanged()).subscribe((value) => {
        this.searchValue = value;
        this.paginationConfig.pageIndex = 0;
        this.loadComprasList();
      }),
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  loadComprasList() {
    this.comprasListLoading.set(true);

    this.compraService
      .getPaginatedData(this.paginationConfig.pageIndex, this.paginationConfig.pageSize, {
        search: this.searchValue,
        storeId: this.selectedStoreId ?? undefined,
      })
      .pipe(
        catchError((err) => {
          this.comprasListLoading.set(false);
          this.toastr.error('Erro ao carregar lista de compras');
          return of(null);
        }),
      )
      .subscribe((response) => {
        this.comprasListLoading.set(false);
        if (response) {
          this.comprasPaginatedList = response;
        }
      });
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }

  handlePageEvent(event: PageEvent) {
    this.paginationConfig.pageIndex = event.pageIndex;
    this.paginationConfig.pageSize = event.pageSize;
    this.loadComprasList();
  }

  goToNewCompra() {
    if (!this.storeContextService.validateStoreSelection()) return;
    this.router.navigate(['/compras/nova']);
  }

  onRowClick(compra: Compra) {
    if (compra.compraId) {
      this.selectedCompraId.set(compra.compraId);
      this.openInfo.set(true);
    }
  }

  handleCloseDrawer() {
    this.openInfo.set(false);
    this.selectedCompraId.set(null);
  }

  handleEdit(compra: Compra) {
    if (!this.storeContextService.validateStoreSelection()) return;
    this.router.navigate(['/compras/editar', compra.compraId]);
  }

  handleEditFromInfo(compraId: string) {
    this.handleCloseDrawer();
    this.router.navigate(['/compras/editar', compraId]);
  }

  handleEmitirNfe(compra: Compra) {
    if (!this.storeContextService.validateStoreSelection()) return;
    if (!compra.compraId) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Gerar NFe de Compra',
        message: `Deseja gerar a <strong style="color: var(--primary-color)">NFe de Compra (Entrada)</strong> para a compra do veículo <strong>${compra.vehiclePlate || ''}</strong>? <br><br> <small style="color: var(--text-secondary)">Os dados do fornecedor e do veículo serão importados automaticamente.</small>`,
        confirmText: 'Sim, Gerar',
        cancelText: 'Não',
        icon: 'receipt_long',
        type: 'primary',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.comprasListLoading.set(true);
        this.compraService.gerarRascunhoNfe(compra.compraId!).subscribe({
          next: () => {
            this.toastr.success('Rascunho da NFe de Entrada gerado com sucesso!');
            this.loadComprasList();
          },
          error: (err) => {
            this.comprasListLoading.set(false);
            const errorMessage = extractErrorMessage(err, 'Erro ao gerar NFe de Compra');
            this.toastr.error(errorMessage);
          },
        });
      }
    });
  }

  handleDelete(compra: Compra) {
    if (!this.storeContextService.validateStoreSelection()) return;
    if (!compra.compraId) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Excluir Registro de Compra',
        message: `Deseja realmente excluir a compra do veículo <strong>${compra.vehiclePlate || ''}</strong>? <br><br> <small>As transações financeiras e pendências fiscais vinculadas serão removidas do sistema.</small>`,
        confirmText: 'Sim, Excluir',
        cancelText: 'Não',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.compraService.excluirCompra(compra.compraId!).subscribe({
          next: () => {
            this.toastr.success('Compra excluída com sucesso');
            this.loadComprasList();
          },
          error: () => this.toastr.error('Erro ao excluir compra'),
        });
      }
    });
  }
}
