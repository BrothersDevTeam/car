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
      modelDto: {
        id: '1',
        description: 'Fusca',
        brandDto: { id: '1', description: 'Volkswagen' },
      },
      yearModel: '1970',
      colorDto: { id: '1', description: 'AZUL' },
      origin: 'NACIONAL',
    };

    component.vehicle = mockVehicle;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
