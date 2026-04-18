import { catchError, debounceTime, of, Subject, Subscription } from 'rxjs';
import { MatTabsModule } from '@angular/material/tabs';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Component, inject, signal, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DrawerComponent } from '@components/drawer/drawer.component';
import { GenericTableComponent } from '@components/generic-table/generic-table.component';
import { StoreContextService } from '@services/store-context.service';
import { ContentHeaderComponent } from '@components/content-header/content-header.component';
import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';

import { NfeSaidaFormComponent } from '../../forms/nfe/nfe-saida-form/nfe-saida-form.component';
import { NfeEntradaFormComponent } from '../../forms/nfe/nfe-entrada-form/nfe-entrada-form.component';

import type { Nfe } from '@interfaces/nfe';
import type { ColumnConfig } from '@interfaces/genericTable';
import type { PaginationResponse } from '@interfaces/pagination';

import { NfeService } from '@services/nfe.service';
import { ActionsService } from '@services/actions.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-nfe',
  imports: [
    ContentHeaderComponent,
    DrawerComponent,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    GenericTableComponent,
    NfeEntradaFormComponent,
    NfeSaidaFormComponent,
    DatePipe,
    NgClass,
    FormsModule,
  ],
  templateUrl: './nfe.component.html',
  styleUrl: './nfe.component.scss',
})
export class NfeComponent {
  readonly dialog = inject(MatDialog);
  private subscription: Subscription = new Subscription();
  private cacheSubscription!: Subscription;
  private searchSubject = new Subject<string>();

  nfePaginatedList: PaginationResponse<Nfe> | null = null;
  selectedNfe: Nfe | null = null;
  selectedRows: Nfe[] = [];
  searchValue: string = '';
  selectedStoreId: string | null = null;
  paginationRequestConfig = {
    pageSize: 1000,
    pageIndex: 0,
  };
  columns: ColumnConfig<Nfe>[] = [
    {
      key: 'nfeNumero',
      header: 'Nº NFe',
    },
    {
      key: 'nfeStatus',
      header: 'Status',
      // Badge personalizada para cada status possível de NFe
      badgeConfig: {
        rascunho: { label: 'Em digitação', cssClass: 'badge-rascunho' },
        processando: { label: 'Processando', cssClass: 'badge-processando' },
        autorizado: { label: 'Autorizado', cssClass: 'badge-autorizado' },
        cancelado: { label: 'Cancelado', cssClass: 'badge-cancelado' },
        erro: { label: 'Erro', cssClass: 'badge-erro' },
      },
    },
    {
      key: 'cfop',
      header: 'CFOP',
    },
    {
      key: 'nfeNaturezaOperacao',
      header: 'Natureza da Operação',
    },
    {
      key: 'createdAt',
      header: 'Criação',
      // Formata a data para o padrão brasileiro: dd/MM/yyyy às HH:mm
      format: (val) => {
        if (!val) return '—';
        const date = new Date(val);
        return new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(date);
      },
    },
    {
      key: 'nfeDataEmissao',
      header: 'Emissão',
      format: (val) => {
        if (!val) return '—';
        const date = new Date(val);
        return new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(date);
      },
    },
    {
      key: 'select',
      header: '',
      showCheckbox: (row) => true,
    },
    {
      key: 'edit',
      header: '',
      // Mostra o botão de editar apenas para NFes em rascunho
      showEditIcon: (row) => row.nfeStatus === 'rascunho',
    },
    {
      key: 'delete',
      header: '',
      // Mostra o botão de deletar apenas para NFes em rascunho
      showDeleteIcon: (row) => row.nfeStatus === 'rascunho',
    },
  ];

  nfeListLoading = signal(false);
  nfeListError = signal(false);
  openForm = signal(false);
  openInfo = signal(false);
  selectedTabIndex = signal(0); // 0 = Entrada, 1 = Saída

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private nfeService: NfeService,
    private toastr: ToastrService,
    private actionsService: ActionsService,
    private storeContextService: StoreContextService
  ) {
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
          this.loadNfeList(
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
    this.cacheSubscription = this.nfeService.cacheUpdated.subscribe(
      (updatedCache) => {
        if (updatedCache) {
          this.nfePaginatedList = updatedCache;
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
          this.loadNfeList(
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
    this.selectedNfe = null;
    this.actionsService.hasFormChanges.set(false);
  }

  loadNfeList(pageIndex: number, pageSize: number, searchValue?: string) {
    this.nfeListLoading.set(true);

    let searchParams: { search?: string; storeId?: string } | undefined;

    if (searchValue && searchValue.trim()) {
      searchParams = { search: searchValue.trim() };
    }

    if (this.selectedStoreId) {
      searchParams ??= {};
      searchParams.storeId = this.selectedStoreId;
    }

    this.nfeService
      .getPaginatedData(pageIndex, pageSize, searchParams)
      .pipe(
        catchError((err: any) => {
          this.nfeListLoading.set(false);
          this.nfeListError.set(true);
          console.error('Erro ao carregar a lista de NFes:', err);
          this.toastr.error('Erro ao buscar dados da tabela de NFes');
          return of(null as unknown as PaginationResponse<Nfe>);
        })
      )
      .subscribe((response) => {
        this.nfeListLoading.set(false);
        if (response && response.content) {
          this.nfePaginatedList = {
            ...response,
            content: response.content.map((nfe) => ({
              ...nfe,
              // Mapeie os dados conforme necessário para a tabela
              cfop: nfe.nfeItens[0]?.itemCfop || 'Não informado',
            })),
          };
        }
      });
  }

  handleSelectedNfe(nfe: Nfe) {
    this.selectedNfe = nfe;
    this.openInfo.set(true);
  }

  onRowClick(nfe: Nfe) {
    this.handleSelectedNfe(nfe);
  }

  handleOpenForm() {
    this.selectedNfe = null;
    this.openForm.set(true);
    this.selectedTabIndex.set(0); // Inicia na aba de entrada
  }

  handlePageEvent(event: PageEvent) {
    this.loadNfeList(event.pageIndex, event.pageSize);
  }

  onSearch(event: Event) {
    this.searchValue = (event.target as HTMLInputElement).value;
    this.searchSubject.next(this.searchValue);
  }

  clearSearch() {
    this.searchValue = '';
    this.loadNfeList(
      this.paginationRequestConfig.pageIndex,
      this.paginationRequestConfig.pageSize
    );
  }

  handleEdit(nfe: Nfe) {
    if (nfe) {
      this.selectedNfe = nfe;

      // nfeTipoDocumento: '0' = Entrada, '1' = Saída
      const isEntrada = nfe.nfeTipoDocumento === '0';
      this.selectedTabIndex.set(isEntrada ? 0 : 1);
    }
    this.openInfo.set(false);
    this.openForm.set(true);
  }

  handleSelectionChange(selectedRows: Nfe[]) {
    this.selectedRows = selectedRows;
  }

  onEnviarNfe() {
    if (!this.selectedRows || this.selectedRows.length === 0) {
      this.toastr.warning('Por favor, selecione ao menos uma NFe para enviar.');
      return;
    }

    if (this.selectedRows.length > 1) {
      this.toastr.warning(
        'Por favor, selecione apenas uma NFe por vez para envio.'
      );
      return;
    }

    const nfe = this.selectedRows[0];

    // Impedir envio de NFes que não sejam rascunho ou com erro
    if (nfe.nfeStatus !== 'rascunho' && nfe.nfeStatus !== 'erro') {
      this.toastr.info(
        'Apenas NFes em rascunho ou com erro de digitação podem ser reenviadas.'
      );
      return;
    }

    if (!nfe.nfeId) {
      this.toastr.error('Erro de integridade: ID da Nfe não encontrado.');
      return;
    }

    this.nfeListLoading.set(true);
    this.nfeService.enviarNfe(nfe.nfeId).subscribe({
      next: (response: any) => {
        this.nfeListLoading.set(false);
        this.selectedRows = [];
        this.toastr.success('NFe enviada para processamento com sucesso!');
        this.loadNfeList(
          this.paginationRequestConfig.pageIndex,
          this.paginationRequestConfig.pageSize
        );
      },
      error: (err) => {
        this.nfeListLoading.set(false);
        this.toastr.error(
          'Ocorreu um erro ao enviar a NFe. Verifique os dados e tente novamente.'
        );
        // Recarregar a lista caso a NFe tenha sido processada e retornado erro do SEFAZ
        this.loadNfeList(
          this.paginationRequestConfig.pageIndex,
          this.paginationRequestConfig.pageSize
        );
      },
    });
  }

  onFormSubmitted() {
    this.loadNfeList(
      this.paginationRequestConfig.pageIndex,
      this.paginationRequestConfig.pageSize
    );
    this.openForm.set(false);
    this.openInfo.set(false);
    this.selectedNfe = null;
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
