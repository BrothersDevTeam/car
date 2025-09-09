import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { PersonTableComponent } from './person-table.component';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { PaginationResponse } from '@interfaces/pagination';
import { Person } from '@interfaces/person';

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
          storeId: '1',
          personId: '1',
          name: 'John Doe',
          nickName: 'John Doe',
          email: 'd3d0o@example.com',
          legalEntity: false,
          cpf: '12345678901',
          cnpj: '12345678000199',
          rg: '123456789',
          rgIssuer: 'SSP',
          phone: '12345678901',
          active: true,
          ie: '123456789',
          crc: '123456789',
          relationshipTypes: []
        },

      ],

      page: {
        number: 0,
        size: 2,
        totalElements: 2,
        totalPages: 1,
      }

    };

    component.personPaginatedList = mockPersonPaginatedList;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
