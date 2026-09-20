import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ToastrService } from 'ngx-toastr';

import { VehicleForm } from '@interfaces/vehicle';
import { VehicleInfoComponent } from './vehicle-info.component';

describe('VehicleInfoComponent', () => {
  let component: VehicleInfoComponent;
  let fixture: ComponentFixture<VehicleInfoComponent>;

  beforeEach(async () => {
    const toastrSpy = jasmine.createSpyObj('ToastrService', ['success', 'error', 'warning', 'info']);

    await TestBed.configureTestingModule({
      imports: [VehicleInfoComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastrService, useValue: toastrSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VehicleInfoComponent);
    component = fixture.componentInstance;

    const mockVehicle: VehicleForm = {
      vehicleId: '1',
      plate: 'ABC-1234',
      brand: 'Volkswagen',
      model: 'Fusca',
      vehicleYear: '1970',
      modelYear: '1970',
      color: 'AZUL',
      chassis: '9BWZZZ377VT004251',
      renavam: '12345678901',
      doors: '2',
      horsepower: '60',
      engineDisplacement: '1300',
      engineNumber: '123456',
      km: '50000',
      vehicleType: 'AUTOMOVEL',
      origin: 'NACIONAL',
    };

    component.vehicle = mockVehicle;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
