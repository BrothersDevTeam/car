import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VehicleFormComponent } from './vehicle-form.component';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { VehicleService } from '@services/vehicle.service';
import { BrandService } from '@services/brand.service';
import { ModelService } from '@services/model.service';
import { FuelTypeService } from '@services/fuel-type.service';
import { ColorService } from '@services/color.service';
import { of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { CommonModule } from '@angular/common';
import { PrimaryInputComponent } from '@components/primary-input/primary-input.component';
import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';
import { CustomSelectComponent } from '@components/custom-select/custom-select.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { provideNgxMask } from 'ngx-mask';

fdescribe('VehicleFormComponent', () => {
  let component: VehicleFormComponent;
  let fixture: ComponentFixture<VehicleFormComponent>;
  let httpTestingController: HttpTestingController;
  let vehicleService: VehicleService;
  let brandService: BrandService;
  let modelService: ModelService;
  let fuelTypeService: FuelTypeService;
  let colorService: ColorService;
  let toastrService: ToastrService;
  let matDialog: MatDialog;

  // Mocks para os serviços
  const vehicleServiceMock = {
    create: jasmine.createSpy('create').and.returnValue(of({})),
    update: jasmine.createSpy('update').and.returnValue(of({})),
    delete: jasmine.createSpy('delete').and.returnValue(of({})),
  };

  const brandServiceMock = {
    getBrands: jasmine
      .createSpy('getBrands')
      .and.returnValue(of([{ id: '1', description: 'Brand 1' }])),
  };

  const modelServiceMock = {
    getModels: jasmine
      .createSpy('getModels')
      .and.returnValue(of([{ id: '1', description: 'Model 1' }])),
  };

  const fuelTypeServiceMock = {
    getFuelTypes: jasmine
      .createSpy('getFuelTypes')
      .and.returnValue(of([{ id: '1', description: 'Gasolina' }])),
  };

  const colorServiceMock = {
    getColors: jasmine
      .createSpy('getColors')
      .and.returnValue(of([{ id: '1', description: 'Branco' }])),
  };

  const toastrServiceMock = {
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error'),
  };

  const matDialogMock = {
    open: jasmine.createSpy('open').and.returnValue({
      afterClosed: jasmine.createSpy('afterClosed').and.returnValue(of(true)),
    }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        VehicleFormComponent,
        CommonModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatIconModule,
        MatOptionModule,
        MatSelectModule,
        MatRadioModule,
        PrimaryInputComponent,
        WrapperCardComponent,
        CustomSelectComponent,
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNgxMask(),
        { provide: VehicleService, useValue: vehicleServiceMock },
        { provide: BrandService, useValue: brandServiceMock },
        { provide: ModelService, useValue: modelServiceMock },
        { provide: FuelTypeService, useValue: fuelTypeServiceMock },
        { provide: ColorService, useValue: colorServiceMock },
        { provide: ToastrService, useValue: toastrServiceMock },
        { provide: MatDialog, useValue: matDialogMock },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(VehicleFormComponent);
    component = fixture.componentInstance;
    httpTestingController = TestBed.inject(HttpTestingController);
    vehicleService = TestBed.inject(VehicleService);
    brandService = TestBed.inject(BrandService);
    modelService = TestBed.inject(ModelService);
    fuelTypeService = TestBed.inject(FuelTypeService);
    colorService = TestBed.inject(ColorService);
    toastrService = TestBed.inject(ToastrService);
    matDialog = TestBed.inject(MatDialog);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.vehicleForm).toBeDefined();
    expect(component.vehicleForm.get('licensePlate')?.value).toBe('');
    expect(component.vehicleForm.get('origin')?.value).toBe('NACIONAL');
  });

  it('should load brands, fuel types, and colors on init', () => {
    expect(brandServiceMock.getBrands).toHaveBeenCalled();
    expect(fuelTypeServiceMock.getFuelTypes).toHaveBeenCalled();
    expect(colorServiceMock.getColors).toHaveBeenCalled();
    expect(component.brands).toEqual([{ id: '1', description: 'Brand 1' }]);
    expect(component.fuelTypes).toEqual([{ id: '1', description: 'Gasolina' }]);
    expect(component.colors).toEqual([{ id: '1', description: 'Branco' }]);
  });

  // it('should disable model control when no brand is selected', () => {
  //   component.brandControl.setValue(null);
  //   fixture.detectChanges();
  //   expect(component.selectModelDisabled()).toBe(true);
  //   expect(component.modelControl.disabled).toBe(true);
  // });

  it('should enable model control and load models when brand is selected', () => {
    component.brandControl.setValue({ id: '1', description: 'Brand 1' });
    fixture.detectChanges();
    expect(modelServiceMock.getModels).toHaveBeenCalledWith('1');
    expect(component.models).toEqual([{ id: '1', description: 'Model 1' }]);
    expect(component.selectModelDisabled()).toBe(false);
    expect(component.modelControl.enabled).toBe(true);
  });

  it('should mark form as invalid if required fields are empty', () => {
    component.vehicleForm.patchValue({
      licensePlate: '',
      brandDto: { id: '1', description: 'Brand 1' },
      modelDto: null,
    });
    component.onSubmit();
    expect(component.vehicleForm.invalid).toBe(true);
    expect(component.submitted).toBe(true);
  });

  // Error
  fit('should call vehicleService.create on submit for new vehicle', () => {
    component.vehicleForm.patchValue({
      licensePlate: 'ABC1234',
      brandDto: { id: '1', description: 'Brand 1' },
      modelDto: { id: '1', description: 'Model 1' },
      colorDto: { id: '1', description: 'Branco' },
      fuelTypeDto: { id: '1', description: 'Gasolina' },
    });
    component.onSubmit();
    expect(vehicleServiceMock.create).toHaveBeenCalled();
    expect(toastrServiceMock.success).toHaveBeenCalledWith(
      'Cadastro realizado com sucesso'
    );
    expect(component.formSubmitted.emit).toHaveBeenCalled();
  });

  it('should call vehicleService.update on submit for existing vehicle', () => {
    component.dataForm = { id: '1', licensePlate: 'ABC1234' } as any;
    component.vehicleForm.patchValue({
      licensePlate: 'ABC1234',
      brandDto: { id: '1', description: 'Brand 1' },
      modelDto: { id: '1', description: 'Model 1' },
    });
    component.onSubmit();
    // expect(vehicleServiceMock.update).toHaveBeenCalledWith(
    //   expect.objectContaining({ id: '1', licensePlate: 'ABC1234' })
    // );
    expect(toastrServiceMock.success).toHaveBeenCalledWith(
      'Atualização feita com sucesso'
    );
    expect(component.formSubmitted.emit).toHaveBeenCalled();
  });

  // it('should open dialog on delete', () => {
  //   component.onDelete();
  //   expect(matDialogMock.open).toHaveBeenCalledWith(jasmine.any(Function), {
  //     data: expect.objectContaining({
  //       title: 'Confirmar Deleção',
  //       message: expect.any(String),
  //     }),
  //   });
  // });

  it('should call vehicleService.delete when dialog is confirmed', () => {
    component.dataForm = { id: '1' } as any;
    component.deleteConfirmed();
    expect(vehicleServiceMock.delete).toHaveBeenCalledWith('1');
    expect(toastrServiceMock.success).toHaveBeenCalledWith(
      'Deleção bem-sucedida'
    );
    expect(component.formSubmitted.emit).toHaveBeenCalled();
  });

  it('should emit formChanged when form is dirty', () => {
    spyOn(component.formChanged, 'emit');
    component.vehicleForm.get('licensePlate')?.setValue('ABC1234');
    expect(component.formChanged.emit).toHaveBeenCalledWith(true);
  });
});
