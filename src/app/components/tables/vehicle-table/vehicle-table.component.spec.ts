import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { PaginationResponse } from '@interfaces/pagination';
import { GetVehicle, Vehicle } from '@interfaces/vehicle';

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
    // const mockVehiclePaginatedList: PaginationResponse<GetVehicle> = {
    //   content: [
    //     {
    //       id: '1',
    //       licensePlate: 'ABC-1234',
    //       modelDto: {
    //         id: '1',
    //         description: '',
    //         brandDto: {
    //           id: '11e4f7cb-e8e7-401a-b47c-d8b4d5a6b3f8',
    //           description: 'HONDA',
    //         },
    //       },
    //       yearModel: '1970',
    //       colorDto: { id: '1', description: 'Azul' },
    //       origin: 'nacional',
    //     },
    //     {
    //       id: '2',
    //       licensePlate: 'DEF-5678',
    //       modelDto: {
    //         id: '2',
    //         description: 'Gol',
    //         brandDto: {
    //           id: '11e4f7cb-e8e7-401a-b47c-d8b4d5a6b3f8',
    //           description: 'HONDA',
    //         },
    //       },
    //       yearModel: '2000',
    //       colorDto: { id: '1', description: 'Azul' },
    //       origin: 'nacional',
    //     },
    //   ],
    //   page: 0,
    //   size: 1000,
    //   totalElements: 2,
    //   totalPages: 1,
    // };

    // component.vehiclePaginatedList = mockVehiclePaginatedList;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
