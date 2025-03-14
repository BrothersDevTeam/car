import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { PersonTableComponent } from './person-table.component';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { PaginationResponse } from '@interfaces/pagination';
import { Person } from '@interfaces/entity';

describe('TableComponent', () => {
  let component: PersonTableComponent;
  let fixture: ComponentFixture<PersonTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        PersonTableComponent,
        BrowserAnimationsModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PersonTableComponent);
    component = fixture.componentInstance;

    const mockPersonPaginatedList: PaginationResponse<Person> = {
      content: [
        {
          id: '1',
          person: {
            fullName: 'John Doe',
            active: true,
            cpf: '12345678901',
            cnpj: '12345678000199',
            legalName: 'John Doe Legal',
            tradeName: 'John Doe Trade',
          },
        },
        {
          id: '2',
          person: {
            fullName: 'John Lee',
            active: true,
            cpf: '12345678902',
            cnpj: '12345678000192',
            legalName: 'John Lee Legal',
            tradeName: 'John Lee Trade',
          },
        },
      ],
      totalElements: 2,
      totalPages: 1,
      size: 2,
      page: 0,
    };

    component.personPaginatedList = mockPersonPaginatedList;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
