import { Component, signal, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { catchError, of } from 'rxjs';

import { Person } from '@interfaces/person';
import { PaginationResponse } from '@interfaces/pagination';
import { PersonService } from '@services/person.service';

import { ContentHeaderComponent } from '@components/content-header/content-header.component';
import { DrawerComponent } from '@components/drawer/drawer.component';
import { PersonTableComponent } from '@components/tables/person-table/person-table.component';
import { NaturalPersonFormComponent } from '@forms/client/natural-person-form/natural-person-form.component';
import { LegalEntityFormComponent } from '@forms/client/legal-entity-form/legal-entity-form.component';
import { LegalEntityInfoComponent } from '@info/legal-entity-info/legal-entity-info.component';
import { NaturalPersonInfoComponent } from '@info/natural-person-info/natural-person-info.component';
import { BusinessDoneTableComponent } from '@components/tables/business-done-table/business-done-table.component';

@Component({
  selector: 'app-person',
  imports: [
    ContentHeaderComponent,
    PersonTableComponent,
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
  ],
  templateUrl: './person.component.html',
  styleUrl: './person.component.scss',
})
export class PersonComponent {
  personPaginatedList: PaginationResponse<Person> | null = null;
  selectedPerson: Person | null = null;
  searchValue: string = '';
  paginationRequestConfig = {
    pageSize: 1000,
    pageIndex: 0,
  };

  clientListLoading = signal(false);
  clientListError = signal(false);
  openForm = signal(false);
  openInfo = signal(false);

  handleCloseDrawer() {
    this.openForm.set(false);
    this.openInfo.set(false);
    this.selectedPerson = null;
  }

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private personService: PersonService,
    private toastr: ToastrService
  ) {
    this.loadPersonList(
      this.paginationRequestConfig.pageIndex,
      this.paginationRequestConfig.pageSize
    );
  }

  loadPersonList(pageIndex: number, pageSize: number) {
    this.clientListLoading.set(true);
    this.personService
      .getPaginatedData(pageIndex, pageSize)
      .pipe(
        catchError((err) => {
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

  handleOpenForm() {
    this.openForm.set(true);
  }

  handlePageEvent(event: PageEvent) {
    this.loadPersonList(event.pageIndex, event.pageSize);
  }

  onSearch(event: Event) {
    this.searchValue = (event.target as HTMLInputElement).value;
  }

  handleEdit() {
    this.openInfo.set(false);
    this.openForm.set(true);
  }

  onFormSubmitted() {
    this.loadPersonList(
      this.paginationRequestConfig.pageIndex,
      this.paginationRequestConfig.pageSize
    );
    this.openForm.set(false);
    this.selectedPerson = null;
  }
}
