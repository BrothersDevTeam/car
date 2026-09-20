import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VehicleFormComponent } from './vehicle-form.component';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { VehicleService } from '@services/vehicle.service';
import { BrandService } from '@services/brand.service';
import { ModelService } from '@services/model.service';
import { ColorService } from '@services/color.service';
import { OptionalService } from '@services/optional.service';
import { FipeService } from '@services/fipe.service';
import { PersonService } from '@services/person.service';
import { StoreContextService } from '@services/store-context.service';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { provideNgxMask } from 'ngx-mask';

describe('VehicleFormComponent', () => {
  let component: VehicleFormComponent;
  let fixture: ComponentFixture<VehicleFormComponent>;

  const vehicleServiceMock = {
    create: jasmine.createSpy('create').and.returnValue(of({})),
    update: jasmine.createSpy('update').and.returnValue(of({})),
    delete: jasmine.createSpy('delete').and.returnValue(of({})),
  };

  const brandServiceMock = {
    getBrands: jasmine.createSpy('getBrands').and.returnValue(of([])),
  };

  const modelServiceMock = {
    getModels: jasmine.createSpy('getModels').and.returnValue(of([])),
  };

  const colorServiceMock = {
    getColors: jasmine.createSpy('getColors').and.returnValue(of([])),
  };

  const fipeServiceMock = {
    getBrands: jasmine.createSpy('getBrands').and.returnValue(of([])),
    getModels: jasmine.createSpy('getModels').and.returnValue(of([])),
    getYears: jasmine.createSpy('getYears').and.returnValue(of([])),
  };

  const optionalServiceMock = {
    getAll: jasmine.createSpy('getAll').and.returnValue(of([])),
  };

  const personServiceMock = {
    personCreated$: of(null),
    getAllMinimal: jasmine.createSpy('getAllMinimal').and.returnValue(of({ content: [] })),
  };

  const storeContextServiceMock = {
    currentStoreId: jasmine.createSpy('currentStoreId').and.returnValue('store-1'),
    getActiveStoreId: jasmine.createSpy('getActiveStoreId').and.returnValue('store-1'),
  };

  const toastrServiceMock = {
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error'),
    warning: jasmine.createSpy('warning'),
    info: jasmine.createSpy('info'),
  };

  const matDialogMock = {
    open: jasmine.createSpy('open').and.returnValue({
      afterClosed: jasmine.createSpy('afterClosed').and.returnValue(of(true)),
    }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehicleFormComponent, ReactiveFormsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNgxMask(),
        { provide: VehicleService, useValue: vehicleServiceMock },
        { provide: BrandService, useValue: brandServiceMock },
        { provide: ModelService, useValue: modelServiceMock },
        { provide: ColorService, useValue: colorServiceMock },
        { provide: FipeService, useValue: fipeServiceMock },
        { provide: OptionalService, useValue: optionalServiceMock },
        { provide: PersonService, useValue: personServiceMock },
        { provide: StoreContextService, useValue: storeContextServiceMock },
        { provide: ToastrService, useValue: toastrServiceMock },
        { provide: MatDialog, useValue: matDialogMock },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(VehicleFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.vehicleForm).toBeDefined();
    expect(component.vehicleForm.get('plate')?.value).toBe('');
    expect(component.vehicleForm.get('origin')?.value).toBe('NACIONAL');
  });
});
