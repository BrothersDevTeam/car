import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { PaginationResponse } from '@interfaces/pagination';
import { Vehicle } from '@interfaces/vehicle';

import { VehicleTableComponent } from './vehicle-table.component';

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
          licensePlate: 'ABC-1234',
          brand: { id: '1', name: 'Volkswagen' },
          model: { id: '1', name: 'Fusca' },
          yearModel: '1970',
          color: 'Azul',
          origin: 'nacional',
        },
        {
          id: '2',
          licensePlate: 'DEF-5678',
          model: { id: '2', name: 'Gol' },
          brand: { id: '1', name: 'Volkswagen' },
          yearModel: '2000',
          color: 'Azul',
          origin: 'nacional',
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
