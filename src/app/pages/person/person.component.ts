import { Component, Input, OnInit } from '@angular/core';

import { ContentHeaderComponent } from '@components/content-header/content-header.component';
import { TableComponent } from "../../components/table/table.component";
import { Person } from '@interfaces/entity';
import { PersonService } from '@services/person.service';



@Component({
  selector: 'app-person',
  imports: [ContentHeaderComponent, TableComponent],
  templateUrl: './person.component.html',
  styleUrl: './person.component.scss'
})

export class PersonComponent implements OnInit {
  @Input() dataSource: Person[] = [];
  totalElements = 0;
  displayedColumns: string[] = ['id', 'name', 'city'];

  constructor(private personService: PersonService) {}

  ngOnInit() {
    this.loadPage(0, 10);
  }

  loadPage(page: number, size: number) {
    this.personService.getPaginatedData(page, size).subscribe((response) => {
      this.dataSource = response.content;
      this.totalElements = response.totalElements;
    });
  }

}
