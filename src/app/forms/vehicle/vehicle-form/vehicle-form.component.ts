import {
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { DialogComponent } from '@components/dialog/dialog.component';
import { PrimaryInputComponent } from '@components/primary-input/primary-input.component';
import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';
import { CreateVehicle, Vehicle } from '@interfaces/vehicle';
import { VehicleService } from '@services/vehicle.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-vehicle-form',
  imports: [
    PrimaryInputComponent,
    ReactiveFormsModule,
    WrapperCardComponent,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './vehicle-form.component.html',
  styleUrl: './vehicle-form.component.scss',
})
export class VehicleFormComponent {
  submitted = false;

  readonly dialog = inject(MatDialog);
  private formBuilderService = inject(FormBuilder);

  @Input() dataForm: Vehicle | null = null;
  @Output() formSubmitted = new EventEmitter<void>();
  @Output() formChanged = new EventEmitter<boolean>();

  protected form = this.formBuilderService.group({
    licensePlate: ['', Validators.required],
    brand: [''],
    model: [''],
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
    color: [''],
    fuelType: [''],
    origin: [''],
  });

  constructor(
    private vehicleService: VehicleService,
    private toastrService: ToastrService
  ) {}

  ngOnInit() {
    this.form.valueChanges.subscribe(() => {
      const isDirty = this.form.dirty;
      this.formChanged.emit(isDirty);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['dataForm'] && this.dataForm) {
      setTimeout(() => {
        this.form.patchValue({
          licensePlate: this.dataForm!.licensePlate || '',
          brand: this.dataForm!.brand || '',
          model: this.dataForm!.model || '',
          yearModel: this.dataForm!.yearModel || '',
          chassis: this.dataForm!.chassis || '',
          numberOfDoors: this.dataForm!.numberOfDoors || '',
          horsepower: this.dataForm!.horsepower || '',
          engineNumber: this.dataForm!.engineNumber || '',
          initialMileage: this.dataForm!.initialMileage || '',
          renavam: this.dataForm!.renavam || '',
          species: this.dataForm!.species || '',
          category: this.dataForm!.category || '',
          age: this.dataForm!.age || '',
          features: this.dataForm!.features || '',
          color: this.dataForm!.color || '',
          fuelType: this.dataForm!.fuelType || '',
          origin: this.dataForm!.origin || '',
        });
      });
    }
  }

  onSubmit() {
    this.submitted = true;
    if (this.form.invalid) {
      // Marca todos os controles como "touched" para que os erros sejam exibidos
      this.form.markAllAsTouched();
      console.log('Formulário inválido: ', this.form.value);
      return;
    }

    if (this.dataForm?.id) {
      console.log('this.dataForm editing: ', this.form.value);
      const updateValue = {
        ...this.form.value,
        id: this.dataForm.id,
      } as Vehicle;

      this.vehicleService.update(updateValue, this.dataForm.id).subscribe({
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
      const createValue = this.form.value as CreateVehicle;

      this.vehicleService.create(createValue).subscribe({
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
    const dialogRef: MatDialogRef<DialogComponent> = this.dialog.open(
      DialogComponent,
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
}
