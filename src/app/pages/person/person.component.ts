import { ToastrService } from 'ngx-toastr';

import {
  inject,
  OnInit,
  signal,
  Component,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { catchError, of, Subscription } from 'rxjs';

import { MatTabsModule } from '@angular/material/tabs';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';

import { DrawerComponent } from '@components/drawer/drawer.component';
import { GenericTableComponent } from '@components/generic-table/generic-table.component';
import { ContentHeaderComponent } from '@components/content-header/content-header.component';
import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';
import { BusinessDoneTableComponent } from '@components/tables/business-done-table/business-done-table.component';

import { LegalEntityFormComponent } from '@forms/client/legal-entity-form/legal-entity-form.component';
import { NaturalPersonFormComponent } from '@forms/client/natural-person-form/natural-person-form.component';

import { LegalEntityInfoComponent } from '@info/legal-entity-info/legal-entity-info.component';
import { NaturalPersonInfoComponent } from '@info/natural-person-info/natural-person-info.component';

import type { Person } from '@interfaces/person';
import type { PaginationResponse } from '@interfaces/pagination';
import type { ColumnConfig } from '@interfaces/genericTable';

import { PersonService } from '@services/person.service';
import { ActionsService } from '@services/actions.service';

@Component({
  selector: 'app-person',
  imports: [
    ContentHeaderComponent,
    DrawerComponent,
    MatTabsModule,
    LegalEntityFormComponent,
    NaturalPersonFormComponent,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    LegalEntityInfoComponent,
    NaturalPersonInfoComponent,
    BusinessDoneTableComponent,
    GenericTableComponent,
  ],
  templateUrl: './person.component.html',
  styleUrl: './person.component.scss',
})
export class PersonComponent implements OnInit, OnDestroy {
  readonly dialog = inject(MatDialog);
  private subscription!: Subscription;
  private cacheSubscription!: Subscription;

  personPaginatedList: PaginationResponse<Person> | null = null;
  selectedPerson: Person | null = null;
  searchValue: string = '';
  paginationRequestConfig = {
    pageSize: 1000,
    pageIndex: 0,
  };
  columns: ColumnConfig<Person>[] = [
    {
      key: 'fullName-legalName',
      header: 'Nome',
      format: (value: any, row: Person) => {
        return row.person.fullName ? row.person.fullName : row.person.legalName;
      },
    },
    {
      key: 'person.cnpj',
      header: 'PF/PJ',
      format: (value: any, row: Person) =>
        row.person.legalName ? 'PESSOA JURÍDICA' : 'PESSOA FÍSICA',
    },
    {
      key: 'cpf-cnpj',
      header: 'CPF/CNPJ',
      format: (value: any, row: Person) => {
        return row.person.cpf ? row.person.cpf : row.person.cnpj || '-';
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

  clientListLoading = signal(false);
  clientListError = signal(false);
  openForm = signal(false);
  openInfo = signal(false);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private personService: PersonService,
    private toastr: ToastrService,
    private actionsService: ActionsService
  ) {
    this.loadPersonList(
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
    this.cacheSubscription = this.personService.cacheUpdated.subscribe(
      (updatedCache) => {
        if (updatedCache) {
          this.personPaginatedList = updatedCache;
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
    this.selectedPerson = null;
    this.actionsService.hasFormChanges.set(false);
  }

  loadPersonList(pageIndex: number, pageSize: number) {
    this.clientListLoading.set(true);
    this.personService
      .getPaginatedData(pageIndex, pageSize)
      .pipe(
        catchError((err) => {
          this.clientListLoading.set(false);
          this.clientListError.set(true);
          console.error('Erro ao carregar a lista de pessoas:', err);
          this.toastr.error('Erro ao buscar dados da tabela de clientes');
          return of();
        })
      )
      .subscribe((response) => {
        this.clientListLoading.set(false);
        if (response) {
          this.personPaginatedList = response;
        }
      });
  }

  handleSelectedPerson(person: Person) {
    this.selectedPerson = person;
    this.openInfo.set(true);
  }

  onRowClick(person: Person) {
    this.handleSelectedPerson(person);
  }

  handleOpenForm() {
    this.openForm.set(true);
  }

  handlePageEvent(event: PageEvent) {
    this.loadPersonList(event.pageIndex, event.pageSize);
  }

  onSearch(event: Event) {
    this.searchValue = (event.target as HTMLInputElement).value;
  }

  handleEdit(person?: Person) {
    if (person) this.selectedPerson = person;
    this.openInfo.set(false);
    this.openForm.set(true);
  }

  onFormSubmitted() {
    this.loadPersonList(
      this.paginationRequestConfig.pageIndex,
      this.paginationRequestConfig.pageSize
    );
    this.openForm.set(false);
    this.openInfo.set(false);
    this.selectedPerson = null;
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
