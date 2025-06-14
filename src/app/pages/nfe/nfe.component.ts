import { catchError, of, Subscription } from 'rxjs';
import { MatTabsModule } from '@angular/material/tabs';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Component, inject, signal, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';

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
      key: 'numero',
      header: 'Nº NFe',
    },
    {
      key: 'status',
      header: 'Status',
    },
    {
      key: 'cfop',
      header: 'CFOP',
    },
    {
      key: 'tipo',
      header: 'Natureza da Operação',
    },
    {
      key: 'dataEmissao',
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

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private nfeService: NfeService,
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

  loadNfeList(pageIndex: number, pageSize: number) {
    this.nfeListLoading.set(true);
    this.nfeService
      .getPaginatedData(pageIndex, pageSize)
      .pipe(
        catchError((err) => {
          this.nfeListError.set(true);
          this.nfeListLoading.set(false);
          console.error('Erro ao carregar a lista de pessoas:', err);
          return of();
        })
      )
      .subscribe((response) => {
        this.nfeListLoading.set(false);
        if (response) {
          this.nfePaginatedList = response;
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
    this.openForm.set(true);
  }

  handlePageEvent(event: PageEvent) {
    this.loadNfeList(event.pageIndex, event.pageSize);
  }

  onSearch(event: Event) {
    this.searchValue = (event.target as HTMLInputElement).value;
  }

  handleEdit(nfe: Nfe) {
    if (nfe) this.selectedNfe = nfe;
    this.openInfo.set(false);
    this.openForm.set(true);
  }

  handleSelectionChange(selectedRows: any[]) {
    console.log('Linhas selecionadas:', selectedRows);
    // Exemplo: atualizar estado com linhas selecionadas
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
