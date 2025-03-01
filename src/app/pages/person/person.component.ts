import { Component, signal, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTabsModule } from '@angular/material/tabs';
import { ContentHeaderComponent } from '@components/content-header/content-header.component';
import { DrawerComponent } from '@components/drawer/drawer.component';
import { TableComponent } from '@components/table/table.component';
import { CreateLegalEntityFormComponent } from '@forms/client/create-legal-entity-form/create-legal-entity-form.component';
import { CreateNaturalPersonFormComponent } from '@forms/client/create-natural-person-form/create-natural-person-form.component';
import { Person } from '@interfaces/entity';
import { PaginationResponse } from '@interfaces/pagination';
import { PersonService } from '@services/person.service';
import { ToastrService } from 'ngx-toastr';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-person',
  imports: [
    ContentHeaderComponent,
    TableComponent,
    DrawerComponent,
    MatTabsModule,
    CreateLegalEntityFormComponent,
    CreateNaturalPersonFormComponent,
  ],
  templateUrl: './person.component.html',
  styleUrl: './person.component.scss',
})
export class PersonComponent {
  personPaginatedList: PaginationResponse<Person> | null = null;
  selectedPerson: Person | null = null;
  clientListError: boolean = false;
  paginationRequestConfig = {
    pageSize: 1000,
    pageIndex: 0,
  };

  openForm = signal(false);

  handleOpenForm() {
    this.openForm.set(!this.openForm());
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
    this.personService
      .getPaginatedData(pageIndex, pageSize)
      .pipe(
        catchError((err) => {
          this.clientListError = true;
          console.error('Erro ao carregar a lista de pessoas:', err);
          this.toastr.error('Erro ao buscar dados da tabela de clientes');
          return of();
        })
      )
      .subscribe((response) => {
        if (response) {
          this.personPaginatedList = response;
        }
      });
  }

  handleSelectedPerson(person: Person) {
    this.selectedPerson = person;
    this.openForm.set(true);
  }

  handlePageEvent(event: PageEvent) {
    this.loadPersonList(event.pageIndex, event.pageSize);
  }
}
