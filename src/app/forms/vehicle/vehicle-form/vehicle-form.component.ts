import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { ToastrService } from 'ngx-toastr';
import { distinctUntilChanged } from 'rxjs';

import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';
import { CustomSelectComponent } from '@components/custom-select/custom-select.component';
import { PrimaryInputComponent } from '@components/primary-input/primary-input.component';
import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';

import { VehicleForm } from '@interfaces/vehicle';

import { FuelTypeService } from '@services/fuel-type.service';
import { VehicleService } from '@services/vehicle.service';
import { BrandService } from '@services/brand.service';
import { ModelService } from '@services/model.service';
import { ColorService } from '@services/color.service';

@Component({
  selector: 'app-vehicle-form',
  imports: [
    CommonModule,
    PrimaryInputComponent,
    ReactiveFormsModule,
    WrapperCardComponent,
    MatButtonModule,
    MatIconModule,
    MatOptionModule,
    MatSelectModule,
    CustomSelectComponent,
  ],
  templateUrl: './vehicle-form.component.html',
  styleUrl: './vehicle-form.component.scss',
})
export class VehicleFormComponent implements OnInit, OnChanges {
  submitted = false;

  brands: { id: string; description: string }[] = [];
  models: { id: string; description: string }[] = [];
  fuelTypes: { id: string; description: string }[] = [];
  colors: { id: string; description: string }[] = [];

  readonly dialog = inject(MatDialog);
  private formBuilderService = inject(FormBuilder);

  @Input() dataForm: VehicleForm | null = null;
  @Output() formSubmitted = new EventEmitter<void>();
  @Output() formChanged = new EventEmitter<boolean>();

  selectModelDisabled = signal(true);

  protected form = this.formBuilderService.group({
    licensePlate: ['', Validators.required],
    yearModel: [''],
    chassis: [''],
    numberOfDoors: [''],
    horsepower: [''],
    engineNumber: [''],
    initialMileage: [''],
    renavam: [''],
    species: [''],
    category: [''],
    age: [''],
    features: [''],
    modelDto: this.formBuilderService.group({
      id: [''],
      description: [''],
    }),
    brandDto: this.formBuilderService.group({
      id: [''],
      description: [''],
    }),
    colorDto: this.formBuilderService.group({
      id: [''],
      description: [''],
    }),
    fuelTypeDto: this.formBuilderService.group({
      id: [''],
      description: [''],
    }),
    origin: [''],
  });

  constructor(
    private vehicleService: VehicleService,
    private brandService: BrandService,
    private modelService: ModelService,
    private fuelTypeService: FuelTypeService,
    private colorService: ColorService,
    private toastrService: ToastrService
  ) {}

  ngOnInit() {
    console.log('Form structure:', this.form.value);

    this.form.valueChanges.subscribe(() => {
      const isDirty = this.form.dirty;
      this.formChanged.emit(isDirty);
    });

    this.brandService.getBrands().subscribe((brands) => {
      this.brands = brands;
    });

    this.fuelTypeService.getFuelTypes().subscribe((fuelTypes) => {
      this.fuelTypes = fuelTypes;
    });

    this.colorService.getColors().subscribe((colors) => {
      this.colors = colors;
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    this.brandControl.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe((brand) => {
        if (brand) {
          // Faz a requisição para buscar os modelos da marca selecionada
          this.modelService.getModels(brand.id).subscribe((models) => {
            this.models = models; // Atualiza a lista de modelos
            this.modelControl.enable({ emitEvent: false }); // Habilita o controle de "Modelo"
          });
          this.selectModelDisabled.set(false);
        } else {
          this.models = []; // Limpa a lista de modelos
          this.modelControl.disable({ emitEvent: false }); // Desabilita o controle de "Modelo"
          this.selectModelDisabled.set(true);
        }
      });

    if (changes['dataForm'] && this.dataForm) {
      setTimeout(() => {
        this.form.patchValue({
          licensePlate: this.dataForm!.licensePlate || '',
          yearModel: this.dataForm!.yearModel || null,
          chassis: this.dataForm!.chassis || null,
          numberOfDoors: this.dataForm!.numberOfDoors || null,
          horsepower: this.dataForm!.horsepower || null,
          engineNumber: this.dataForm!.engineNumber || null,
          initialMileage: this.dataForm!.initialMileage || null,
          renavam: this.dataForm!.renavam || null,
          species: this.dataForm!.species || null,
          category: this.dataForm!.category || null,
          age: this.dataForm!.age || null,
          features: this.dataForm!.features || null,
          modelDto: {
            id: this.dataForm!.modelDto?.id || null,
            description: this.dataForm!.modelDto?.description || null,
          },
          brandDto: {
            id: this.dataForm!.brandDto?.id || null,
            description: this.dataForm!.brandDto?.description || null,
          },
          colorDto: {
            id: this.dataForm!.colorDto?.id || null,
            description: this.dataForm!.colorDto?.description || null,
          },
          fuelTypeDto: {
            id: this.dataForm!.fuelTypeDto?.id || null,
            description: this.dataForm!.fuelTypeDto?.description || null,
          },
          origin: this.dataForm!.origin || null,
        });
      });
    }
  }

  onSubmit() {
    this.submitted = true;
    if (this.form.invalid) {
      // Marca todos os controles como "touched" para que os erros sejam exibidos
      this.form.markAllAsTouched();
      return;
    }

    let formValues: { [key: string]: any } = this.form.value;
    let payload: any = {};

    const removeEmptyValues = () => {
      Object.keys(formValues).forEach((key) => {
        if (typeof formValues[key] === 'object') {
          if (
            formValues[key]?.description === null ||
            formValues[key]?.description === undefined ||
            formValues[key]?.description === ''
          ) {
            delete formValues[key];
          }
        }

        if (
          formValues[key] === null ||
          formValues[key] === undefined ||
          formValues[key] === ''
        ) {
          delete formValues[key];
        }
      });
    };
    removeEmptyValues();

    const addformValuesOnPayload = () => {
      const { brandDto, modelDto, ...restOfFormValues } = formValues;
      payload = restOfFormValues;

      if (
        formValues['modelDto'] &&
        formValues['modelDto'].description !== '' &&
        formValues['modelDto'].description !== null &&
        formValues['brandDto'] &&
        formValues['brandDto'].description !== '' &&
        formValues['brandDto'].description !== null
      ) {
        payload = {
          ...payload,
          modelDto: {
            ...modelDto,
            brandDto,
          },
        } as VehicleForm;
      }
    };
    addformValuesOnPayload();

    if (this.dataForm?.id) {
      this.vehicleService
        .update({ ...payload, id: this.dataForm.id })
        .subscribe({
          next: () => {
            this.toastrService.success('Atualização feita com sucesso');
            this.formSubmitted.emit();
          },
          error: () =>
            this.toastrService.error(
              'Erro inesperado! Tente novamente mais tarde'
            ),
        });
    } else {
      this.vehicleService.create(payload).subscribe({
        next: () => {
          this.toastrService.success('Cadastro realizado com sucesso');
          this.formSubmitted.emit();
        },
        error: () =>
          this.toastrService.error(
            'Erro inesperado! Tente novamente mais tarde'
          ),
      });
    }
  }

  onDelete() {
    this.openDialog();
  }

  openDialog() {
    const dialogRef: MatDialogRef<ConfirmDialogComponent> = this.dialog.open(
      ConfirmDialogComponent,
      {
        data: {
          title: 'Confirmar Deleção',
          message:
            'Você tem certeza que deseja <strong>deletar</strong> este registro?',
          confirmText: 'Sim',
          cancelText: 'Não',
        },
      }
    );

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.deleteConfirmed();
      }
    });
  }

  deleteConfirmed() {
    if (this.dataForm?.id) {
      this.vehicleService.delete(this.dataForm.id).subscribe({
        next: (response) => {
          console.log('Deleção bem-sucedida', response);
          this.toastrService.success('Deleção bem-sucedida');
          this.formSubmitted.emit();
        },
        error: (error) => {
          console.error('Erro ao deletar veículo', error);
          this.toastrService.error('Erro ao deletar veículo');
        },
      });
    } else {
      console.error('ID não encontrado para deleção');
      this.toastrService.error('ID não encontrado para deleção');
    }
  }

  get brandControl(): FormGroup {
    const control = this.form.get('brandDto') as FormGroup;
    return control;
  }

  get modelControl(): FormGroup {
    const control = this.form.get('modelDto') as FormGroup;
    return control;
  }

  get modelIdControl(): FormControl {
    const control = this.modelControl.get('id');
    if (!control) {
      throw new Error(
        "O controle 'model.id' não foi encontrado no formulário."
      );
    }
    return control as FormControl;
  }

  get fuelTypeControl(): FormControl {
    const control = this.form.get('fuelTypeDto') as FormControl;
    return control;
  }

  get colorControl(): FormControl {
    const control = this.form.get('colorDto') as FormControl;
    return control;
  }
}
