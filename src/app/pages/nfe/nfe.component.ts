import { catchError, of, Subscription } from 'rxjs';
import { MatTabsModule } from '@angular/material/tabs';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Component, inject, signal, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { DecimalPipe } from '@angular/common';

import { DrawerComponent } from '@components/drawer/drawer.component';
import { GenericTableComponent } from '@components/generic-table/generic-table.component';
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
    GenericTableComponent,
    NfeEntradaFormComponent,
    NfeSaidaFormComponent,
    DecimalPipe,
  ],
  templateUrl: './nfe.component.html',
  styleUrl: './nfe.component.scss',
})
export class NfeComponent {
  readonly dialog = inject(MatDialog);
  private subscription!: Subscription;

  nfePaginatedList: PaginationResponse<Nfe> | null = null;
  selectedNfe: Nfe | null = null;
  searchValue: string = '';
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
    },
    {
      key: 'nfeDataEmissao',
      header: 'Emissão',
    },
    {
      key: 'select',
      header: '',
      showCheckbox: (row) => true,
    },
    {
      key: 'edit',
      header: '',
      showEditIcon: (row) => row.status === 'Em digitacao',
    },
    {
      key: 'delete',
      header: '',
      showDeleteIcon: (row) => row.status === 'Em digitacao',
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
    private actionsService: ActionsService
  ) {
    this.loadNfeList(
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
    this.selectedNfe = null;
    this.actionsService.hasFormChanges.set(false);
  }

  loadNfeList(pageIndex: number, pageSize: number, searchValue?: string) {
    this.nfeListLoading.set(true);

    this.nfeService
      .getPaginatedData(pageIndex, pageSize)
      .pipe(
        catchError((err) => {
          this.nfeListLoading.set(false);
          this.nfeListError.set(true);
          console.error('Erro ao carregar a lista de NFes:', err);
          this.toastr.error('Erro ao buscar dados da tabela de NFes');
          return of();
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
  }

  handleEdit(nfe: Nfe) {
    if (nfe) {
      this.selectedNfe = nfe;

      // Determina qual aba abrir baseado no tipo de NFe
      const tiposEntrada = [
        'COMPRA DE VEICULO USADO',
        'ENTRADA EM CONSIGNAÇÃO',
        'ENTRADA COMPRA DEFINITIVA',
        'DEVOLUÇÃO DE VENDA',
      ];

      const isEntrada = tiposEntrada.includes(nfe.nfeTipoDocumento);
      this.selectedTabIndex.set(isEntrada ? 0 : 1);
    }
    this.openInfo.set(false);
    this.openForm.set(true);
  }

  handleSelectionChange(selectedRows: any[]) {
    console.log('Linhas selecionadas:', selectedRows);
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
