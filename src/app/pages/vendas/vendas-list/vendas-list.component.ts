import {
  Component,
  inject,
  signal,
  ViewChild,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Subscription, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { extractErrorMessage, getErrorDetails } from '@utils/error-utils';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { ContentHeaderComponent } from '@components/content-header/content-header.component';
import { GenericTableComponent } from '@components/generic-table/generic-table.component';
import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '@components/empty-state/empty-state.component';
import { DrawerComponent } from '@components/drawer/drawer.component';
import { VendaInfoComponent } from '@info/venda-info/venda-info.component';

import { VendaService } from '@services/venda.service';
import { StoreContextService } from '@services/store-context.service';
import { AuthService } from '@services/auth/auth.service';
import { ToastrService } from 'ngx-toastr';

import { VendaResponseDto } from '@interfaces/venda';
import { PaginationResponse } from '@interfaces/pagination';
import { ColumnConfig } from '@interfaces/genericTable';
import { Authorizations } from '@enums/authorizations';
import { VendaStatus } from '@enums/venda-status';

@Component({
  selector: 'app-vendas-list',
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
    MatButtonToggleModule,
    EmptyStateComponent,
    DrawerComponent,
    VendaInfoComponent,
  ],
  providers: [DatePipe, CurrencyPipe],
  templateUrl: './vendas-list.component.html',
  styleUrl: './vendas-list.component.scss',
})
export class VendasListComponent implements OnInit, OnDestroy {
  private vendaService = inject(VendaService);
  private storeContextService = inject(StoreContextService);
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private datePipe = inject(DatePipe);
  private currencyPipe = inject(CurrencyPipe);

  private subscription = new Subscription();
  private searchSubject = new Subject<string>();

  vendasPaginatedList: PaginationResponse<VendaResponseDto> | null = null;
  vendasListLoading = signal(false);
  openInfo = signal(false);
  selectedVendaId = signal<string | null>(null);
  searchValue: string = '';
  selectedStoreId: string | null = null;
  selectedStatus: string = 'TODOS';

  paginationConfig = {
    pageSize: 10,
    pageIndex: 0,
  };

  columns: ColumnConfig<VendaResponseDto>[] = [
    {
      key: 'numero',
      header: 'Nº Venda',
      format: (val) => (val ? `#${val}` : '—'),
    },
    {
      key: 'dataVenda',
      header: 'Data',
      format: (val) => this.datePipe.transform(val, 'dd/MM/yyyy') || '—',
    },
    {
      key: 'buyerName',
      header: 'Comprador',
      format: (val) => val || '—',
    },
    {
      key: 'vehicleDescription',
      header: 'Veículo',
      format: (val) => val || '—',
    },
    {
      key: 'valorFinal',
      header: 'Valor Total',
      format: (val) =>
        this.currencyPipe.transform(val, 'BRL', 'symbol', '1.2-2') || '—',
    },
    {
      key: 'vendaStatus',
      header: 'Status',
      badgeConfig: {
        [VendaStatus.ATIVA]: { label: 'Ativa', cssClass: 'badge-autorizado' },
        [VendaStatus.CANCELADA]: {
          label: 'Cancelada',
          cssClass: 'badge-cancelado',
        },
        [VendaStatus.TRANSFERENCIA]: {
          label: 'Transferência',
          cssClass: 'badge-processando',
        },
      },
    },
    {
      key: 'edit',
      header: '',
      showEditIcon: (row) =>
        this.authService.hasAuthority(Authorizations.EDIT_VENDA) &&
        row.vendaStatus !== VendaStatus.CANCELADA,
    },
    {
      key: 'nfe',
      header: '',
      showNfeIcon: (row) =>
        this.authService.hasAuthority(Authorizations.EMITIR_NFE) &&
        row.vendaStatus === VendaStatus.ATIVA &&
        !row.nfeId,
    },
    {
      key: 'delete',
      header: '',
      showDeleteIcon: (row) =>
        this.authService.hasAuthority(Authorizations.CANCEL_VENDA) &&
        row.vendaStatus !== VendaStatus.CANCELADA,
    },
  ];

  // Configurações dinâmicas para o Empty State baseadas no status da venda
  private readonly emptyStateConfigs: Record<
    string,
    { icon: string; title: string; description: string }
  > = {
    TODOS: {
      icon: 'receipt_long',
      title: 'Nenhuma venda realizada',
      description:
        'Suas vendas aparecerão aqui assim que forem concluídas e registradas no sistema.',
    },
    ATIVA: {
      icon: 'check_circle',
      title: 'Nenhuma venda ativa',
      description: 'Não há vendas com status "Ativa" no momento.',
    },
    CANCELADA: {
      icon: 'block',
      title: 'Nenhuma venda cancelada',
      description: 'O histórico de vendas que foram canceladas aparecerá aqui.',
    },
    TRANSFERENCIA: {
      icon: 'swap_horiz',
      title: 'Sem vendas em transferência',
      description: 'Nenhuma venda foi marcada como transferência de estoque.',
    },
  };

  get emptyStateIcon(): string {
    return this.emptyStateConfigs[this.selectedStatus]?.icon || 'receipt_long';
  }

  get emptyStateTitle(): string {
    return (
      this.emptyStateConfigs[this.selectedStatus]?.title ||
      'Nenhuma venda encontrada'
    );
  }

  get emptyStateDescription(): string {
    return (
      this.emptyStateConfigs[this.selectedStatus]?.description ||
      'Suas vendas aparecerão aqui após o registro.'
    );
  }

  ngOnInit() {
    // Escuta mudança de loja no contexto global
    this.subscription.add(
      this.storeContextService.currentStoreId$.subscribe((storeId) => {
        this.selectedStoreId = storeId;
        this.vendaService.clearCache(); // Limpa cache para garantir dados da nova loja/rede
        this.loadVendasList();
      })
    );

    // Setup de busca com debounce
    this.subscription.add(
      this.searchSubject
        .pipe(debounceTime(400), distinctUntilChanged())
        .subscribe((value) => {
          this.searchValue = value;
          this.paginationConfig.pageIndex = 0;
          this.loadVendasList();
        })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  loadVendasList() {
    this.vendasListLoading.set(true);

    this.vendaService
      .getPaginatedData(
        this.paginationConfig.pageIndex,
        this.paginationConfig.pageSize,
        {
          search: this.searchValue,
          storeId: this.selectedStoreId ?? undefined,
          status:
            this.selectedStatus !== 'TODOS' ? this.selectedStatus : undefined,
        }
      )
      .pipe(
        catchError((err) => {
          this.vendasListLoading.set(false);
          this.toastr.error('Erro ao carregar lista de vendas');
          return of(null);
        })
      )
      .subscribe((response) => {
        this.vendasListLoading.set(false);
        if (response) {
          this.vendasPaginatedList = response;
        }
      });
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }

  onStatusChange(status: string) {
    this.selectedStatus = status;
    this.paginationConfig.pageIndex = 0;
    this.loadVendasList();
  }

  handlePageEvent(event: PageEvent) {
    this.paginationConfig.pageIndex = event.pageIndex;
    this.paginationConfig.pageSize = event.pageSize;
    this.loadVendasList();
  }

  goToNewVenda() {
    this.router.navigate(['/vendas/nova']);
  }

  onRowClick(venda: VendaResponseDto) {
    this.selectedVendaId.set(venda.vendaId);
    this.openInfo.set(true);
  }

  handleCloseDrawer() {
    this.openInfo.set(false);
    this.selectedVendaId.set(null);
  }

  handleEdit(venda: VendaResponseDto) {
    this.router.navigate(['/vendas/editar', venda.vendaId]);
  }

  handleEditFromInfo(vendaId: string) {
    this.handleCloseDrawer();
    this.router.navigate(['/vendas/editar', vendaId]);
  }

  handleEmitirNfe(venda: VendaResponseDto) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Gerar NFe',
        message: `Deseja gerar a <strong style="color: var(--primary-color)">NFe Em Digitação</strong> para a venda <strong>#${venda.numero}</strong>? <br><br> <small style="color: var(--text-secondary)">Os dados do comprador e do veículo serão importados automaticamente.</small>`,
        confirmText: 'Sim, Gerar',
        cancelText: 'Não',
        icon: 'description',
        type: 'primary',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.vendasListLoading.set(true);
        this.vendaService.gerarNfe(venda.vendaId, venda.storeId).subscribe({
          next: () => {
            this.toastr.success(
              'Rascunho da NFe gerado com sucesso! A emissão foi disparada.'
            );
            this.loadVendasList();
          },
          error: (err) => {
            this.vendasListLoading.set(false);
            const errorMessage = extractErrorMessage(err, 'Erro ao gerar NFe');
            const details = getErrorDetails(err);

            // Tratamento específico para falta de endereço
            if (details && details['missingAddressPersonId']) {
              this.handleMissingAddressError(
                details['missingAddressPersonId'],
                errorMessage
              );
            } else {
              this.toastr.error(errorMessage);
            }
          },
        });
      }
    });
  }

  /**
   * Abre um diálogo informativo quando falta o endereço do comprador
   * e oferece um botão para ir direto ao cadastro.
   */
  private handleMissingAddressError(personId: string, message: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Endereço Ausente',
        message: `${message}<br><br>Deseja ir para o cadastro desta pessoa para adicionar um endereço agora?`,
        confirmText: 'Sim, ir para Cadastro',
        cancelText: 'Agora não',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Navega para a tela de pessoas passando o ID para edição
        this.router.navigate(['/person'], {
          queryParams: { editId: personId },
        });
      }
    });
  }

  handleDelete(venda: VendaResponseDto) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Cancelar Venda',
        message: `Deseja realmente cancelar a venda <strong>#${venda.numero}</strong>? <br><br> <small>O veículo voltará ao estoque automaticamente.</small>`,
        confirmText: 'Sim, Cancelar',
        cancelText: 'Não',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.vendaService.cancelVenda(venda.vendaId, venda.storeId).subscribe({
          next: () => {
            this.toastr.success('Venda cancelada com sucesso');
            this.loadVendasList();
          },
          error: () => this.toastr.error('Erro ao cancelar venda'),
        });
      }
    });
  }
}
