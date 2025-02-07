import { ChangeDetectorRef, Component, Input, OnInit, signal } from '@angular/core';
import { ContentHeaderComponent } from '@components/content-header/content-header.component';
import { DrawerComponent } from '@components/drawer/drawer.component';
import { TableComponent } from '@components/table/table.component';
import { CreateClientFormComponent } from '../../forms/client/create-client-form/create-client-form.component';
import { Person } from '@interfaces/entity';
import { PersonService } from '@services/person.service';



@Component({
  selector: 'app-person',
  imports: [
    ContentHeaderComponent,
    TableComponent,
    DrawerComponent,
    CreateClientFormComponent,
  ],
  templateUrl: './person.component.html',
  styleUrl: './person.component.scss'
})

export class PersonComponent implements OnInit {
  dataSource: Person[] = [];
  totalElements = 0;
  displayedColumns: string[] = ['id', 'fullName', 'cpf'];

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

}
