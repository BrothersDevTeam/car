import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';

import { Person } from '@interfaces/entity';
import { PersonService } from '@services/person.service';

import { MatTabsModule } from '@angular/material/tabs';

import { ContentHeaderComponent } from '@components/content-header/content-header.component';
import { DrawerComponent } from '@components/drawer/drawer.component';
import { TableComponent } from '@components/table/table.component';
import { CreateLegalEntityFormComponent } from '@forms/client/create-legal-entity-form/create-legal-entity-form.component';
import { CreateNaturalPersonFormComponent } from '@forms/client/create-natural-person-form/create-natural-person-form.component';

@Component({
  selector: 'app-person',
  imports: [
    ContentHeaderComponent,
    TableComponent,
    DrawerComponent,
    MatTabsModule,
    CreateLegalEntityFormComponent,
    CreateNaturalPersonFormComponent
],
  templateUrl: './person.component.html',
  styleUrl: './person.component.scss'
})

export class PersonComponent implements OnInit {
  dataSource: Person[] = [];
  selectedPerson: Person | null = null;
  totalElements = 0;


  openForm = signal(false);

  handleOpenForm() {
    this.openForm.set(!this.openForm())
  }

  constructor(
    private personService: PersonService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadPage(0, 10);
  }

  loadPage(page: number, size: number) {
    this.personService.getPaginatedData(page, size).subscribe((response) => {
      this.dataSource = response.content;
      this.totalElements = response.totalElements;

      this.cdr.detectChanges();
    });
  }

  handleSelectedPerson(person: Person) {
    this.selectedPerson = person;
    this.openForm.set(true); // Abre o drawer automaticamente
  }

}
