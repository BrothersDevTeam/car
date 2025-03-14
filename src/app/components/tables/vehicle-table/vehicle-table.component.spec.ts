import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehicleTableComponent } from './vehicle-table.component';
import { PaginationResponse } from '@interfaces/pagination';
import { Vehicle } from '@interfaces/vehicle';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('VehicleTableComponent', () => {
  let component: VehicleTableComponent;
  let fixture: ComponentFixture<VehicleTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehicleTableComponent, BrowserAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(VehicleTableComponent);
    component = fixture.componentInstance;

    // Mock da propriedade personPaginatedList
    const mockVehiclePaginatedList: PaginationResponse<Vehicle> = {
      content: [
        {
          id: '1',
          vehicle: {
            plate: 'ABC-1234',
            brand: 'Volkswagen',
            model: 'Fusca',
            year: '1970',
            color: 'Azul',
            active: true,
            imported: false,
          },
        },
        {
          id: '2',
          vehicle: {
            plate: 'DEF-5678',
            model: 'Gol',
            brand: 'Volkswagen',
            year: '2000',
            color: 'Azul',
            active: true,
            imported: false,
          },
        },
        {
          id: '3',
          vehicle: {
            plate: 'GHI-9012',
            model: 'Uno',
            brand: 'Fiat',
            year: '1990',
            color: 'Azul',
            active: true,
            imported: false,
          },
        },
      ],
      page: 0,
      size: 1000,
      totalElements: 3,
      totalPages: 1,
    };

    component.vehiclePaginatedList = mockVehiclePaginatedList;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
