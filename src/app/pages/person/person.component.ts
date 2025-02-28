import { Component, OnInit, signal } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { ContentHeaderComponent } from '@components/content-header/content-header.component';
import { DrawerComponent } from '@components/drawer/drawer.component';
import { TableComponent } from '@components/table/table.component';
import { CreateLegalEntityFormComponent } from '@forms/client/create-legal-entity-form/create-legal-entity-form.component';
import { CreateNaturalPersonFormComponent } from '@forms/client/create-natural-person-form/create-natural-person-form.component';
import { Person } from '@interfaces/entity';
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
export class PersonComponent implements OnInit {
  personList: Person[] | null = null;
  selectedPerson: Person | null = null;
  clientListError: boolean = false;

  openForm = signal(false);

  handleOpenForm() {
    this.openForm.set(!this.openForm());
  }

  constructor(
    private personService: PersonService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadPersonList(0, 3);
  }

  loadPersonList(page: number, size: number) {
    this.personService
      .getPaginatedData(page, size)
      .pipe(
        catchError((err) => {
          this.clientListError = true;
          console.error('Erro ao carregar a lista de pessoas:', err);
          this.toastr.error('Erro ao buscar dados da tabela de clientes');
          return of();
        })
      )
      .subscribe((response) => {
        this.personList = response.content;
      });
  }

  handleSelectedPerson(person: Person) {
    this.selectedPerson = person;
    this.openForm.set(true);
  }
}
