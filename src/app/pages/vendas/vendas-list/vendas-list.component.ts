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

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';

import { ContentHeaderComponent } from '@components/content-header/content-header.component';
import { GenericTableComponent } from '@components/generic-table/generic-table.component';
import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';

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
  searchValue: string = '';
  selectedStoreId: string | null = null;

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

  ngOnInit() {
    // Escuta mudança de loja no contexto global
    this.subscription.add(
      this.storeContextService.currentStoreId$.subscribe((storeId) => {
        if (this.selectedStoreId !== storeId) {
          this.selectedStoreId = storeId;
          this.loadVendasList();
        }
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
    if (!this.selectedStoreId) return;

    this.vendasListLoading.set(true);

    this.vendaService
      .getPaginatedData(
        this.paginationConfig.pageIndex,
        this.paginationConfig.pageSize,
        { search: this.searchValue, storeId: this.selectedStoreId }
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

  handlePageEvent(event: PageEvent) {
    this.paginationConfig.pageIndex = event.pageIndex;
    this.paginationConfig.pageSize = event.pageSize;
    this.loadVendasList();
  }

  goToNewVenda() {
    this.router.navigate(['/vendas/nova']);
  }

  onRowClick(venda: VendaResponseDto) {
    // No futuro abrir drawer de detalhes
    console.log('Venda selecionada:', venda);
  }

  handleEdit(venda: VendaResponseDto) {
    this.router.navigate(['/vendas/editar', venda.vendaId]);
  }

  handleEmitirNfe(venda: VendaResponseDto) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Gerar NFe',
        message: `Deseja gerar o rascunho da NFe para a venda <strong>#${venda.numero}</strong>? <br><br> <small>Os dados do comprador e do veículo serão importados automaticamente.</small>`,
        confirmText: 'Sim, Gerar',
        cancelText: 'Não',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.vendasListLoading.set(true);
        this.vendaService.gerarNfe(venda.vendaId).subscribe({
          next: () => {
            this.toastr.success('Rascunho da NFe gerado com sucesso! A emissão foi disparada.');
            this.loadVendasList();
          },
          error: (err) => {
            this.vendasListLoading.set(false);
            this.toastr.error(err.error?.message || 'Erro ao gerar NFe');
          },
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
        this.vendaService.cancelVenda(venda.vendaId).subscribe({
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
