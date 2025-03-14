import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Vehicle } from '@interfaces/vehicle';
import { VehicleInfoComponent } from './vehicle-info.component';

describe('VehicleInfoComponent', () => {
  let component: VehicleInfoComponent;
  let fixture: ComponentFixture<VehicleInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehicleInfoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VehicleInfoComponent);
    component = fixture.componentInstance;

    const mockVehicle: Vehicle = {
      id: '1',
      licensePlate: 'ABC-1234',
      brand: { id: '1', name: 'Volkswagen' },
      model: { id: '1', name: 'Fusca' },
      yearModel: '1970',
      color: 'Azul',
      origin: 'nacional',
    };

    component.vehicle = mockVehicle;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
