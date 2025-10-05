import {
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  signal,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatIconModule } from '@angular/material/icon';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';

import { ToastrService } from 'ngx-toastr';
import { distinctUntilChanged, Subscription } from 'rxjs';

import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';
import { CustomSelectComponent } from '@components/custom-select/custom-select.component';
import { PrimaryInputComponent } from '@components/primary-input/primary-input.component';
import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';

import { VehicleForm } from '@interfaces/vehicle';

import { VehicleService } from '@services/vehicle.service';
import { BrandService } from '@services/brand.service';
import { ModelService } from '@services/model.service';
import { AuthService } from '@services/auth/auth.service';

@Component({
  selector: 'app-vehicle-form',
  imports: [
    PrimaryInputComponent,
    ReactiveFormsModule,
    WrapperCardComponent,
    MatButtonModule,
    MatIconModule,
    MatOptionModule,
    MatSelectModule,
    CustomSelectComponent,
    MatRadioModule,
  ],
  templateUrl: './vehicle-form.component.html',
  styleUrl: './vehicle-form.component.scss',
})
export class VehicleFormComponent implements OnInit, OnChanges, OnDestroy {
  private subscriptions = new Subscription();
  submitted = false;

  brands: { id: string; name: string }[] = [];
  models: { id: string; name: string }[] = [];

  readonly dialog = inject(MatDialog);
  private formBuilderService = inject(FormBuilder);
  private authService = inject(AuthService);

  @ViewChild('submitButton', { static: false, read: ElementRef })
  submitButton!: ElementRef<HTMLButtonElement>;

  @Input() dataForm: VehicleForm | null = null;
  @Output() formSubmitted = new EventEmitter<void>();
  @Output() formChanged = new EventEmitter<boolean>();

  selectModelDisabled = signal(true);

  /**
   * Formulário com FormGroups aninhados para brand e model
   * para trabalhar com o custom-select component
   */
  protected form: FormGroup = this.formBuilderService.group({
    owner: [''],
    plate: ['', Validators.required],
    brand: this.formBuilderService.group({
      id: [''],
      name: [''],
    }),
    model: this.formBuilderService.group({
      id: [''],
      name: [''],
    }),
    year: [''],
    modelYear: [''],
    color: [''],
    chassis: [''],
    renavam: [''],
    doors: [''],
    horsepower: [''],
    engineNumber: [''],
    km: [''],
    vehicleType: [''],
    age: [''],
    species: [''],
    category: [''],
    features: [''],
    fuelTypes: [''],
    origin: ['NACIONAL'],
  });

  public get vehicleForm(): FormGroup {
    return this.form;
  }

  constructor(
    private vehicleService: VehicleService,
    private brandService: BrandService,
    private modelService: ModelService,
    private toastrService: ToastrService
  ) {}

  ngOnInit() {
    // Monitora mudanças no formulário
    this.form.valueChanges.subscribe(() => {
      const isDirty = this.form.dirty;
      this.formChanged.emit(isDirty);
    });

    // Carrega marcas do backend
    this.brandService.getBrands().subscribe({
      next: (response) => {
        console.log('Marcas carregadas:', response);
        if (response.page.totalElements > 0) {
          this.brands = response.content.map((brand) => ({
            id: brand.brandId,
            name: brand.name,
          }));
        }
      },
      error: (error) => {
        console.error('Erro ao carregar marcas:', error);
        this.toastrService.error('Erro ao carregar marcas');
      },
    });

    // Quando a marca mudar, carrega os modelos
    this.subscriptions.add(
      this.brandControl.valueChanges
        .pipe(distinctUntilChanged((prev, curr) => prev?.id === curr?.id))
        .subscribe((brand) => {
          if (brand && brand.id) {
            // Limpa o modelo selecionado
            this.modelControl.reset();

            // Carrega modelos da marca
            this.modelService.getModelsByBrand(brand.id).subscribe({
              next: (response) => {
                console.log('Modelos carregados:', response);
                this.models = response.content.map((model) => ({
                  id: model.modelId,
                  name: model.name,
                }));
                this.selectModelDisabled.set(false);
              },
              error: (error) => {
                console.error('Erro ao carregar modelos:', error);
                this.toastrService.error('Erro ao carregar modelos');
                this.models = [];
                this.selectModelDisabled.set(true);
              },
            });
          } else {
            this.models = [];
            this.modelControl.reset();
            this.selectModelDisabled.set(true);
          }
        })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['dataForm'] && this.dataForm) {
      setTimeout(() => {
        // Para edição, busca a marca pelo nome
        const selectedBrand = this.brands.find(
          (b) => b.name === this.dataForm!.brand
        );

        console.log('Editando veículo:', this.dataForm);
        console.log('Marca encontrada:', selectedBrand);

        this.form.patchValue({
          plate: this.dataForm!.plate || '',
          owner: this.dataForm!.owner || '',
          brand: selectedBrand
            ? { id: selectedBrand.id, name: selectedBrand.name }
            : { id: '', name: '' },
          model: { id: '', name: this.dataForm!.model || '' },
          year: this.dataForm!.year || '',
          modelYear: this.dataForm!.modelYear || '',
          color: this.dataForm!.color || '',
          chassis: this.dataForm!.chassis || '',
          renavam: this.dataForm!.renavam || '',
          doors: this.dataForm!.doors || '',
          horsepower: this.dataForm!.horsepower || '',
          engineNumber: this.dataForm!.engineNumber || '',
          km: this.dataForm!.km || '',
          vehicleType: this.dataForm!.vehicleType || '',
          age: this.dataForm!.age || '',
          category: this.dataForm!.category || '',
          features: this.dataForm!.features || '',
          origin: this.dataForm!.origin || 'NACIONAL',
        });
      });
    }
  }

  onEnter(event: Event): void {
    if (event instanceof KeyboardEvent) {
      event.preventDefault();

      if (
        this.form.valid &&
        document.activeElement === this.submitButton.nativeElement
      ) {
        this.onSubmit();
      }

      if (this.form.valid && this.submitButton) {
        this.submitButton.nativeElement.focus();
      }
    }
  }

  onSubmit() {
    this.submitted = true;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastrService.warning('Preencha todos os campos obrigatórios');
      return;
    }

    const formValues = this.form.value;
    console.log('Valores do formulário:', formValues);

    // Monta o payload para o backend (brand e model são Strings)
    const payload: any = {
      storeId: this.authService.getStoreId(),
      plate: formValues.plate,
      brand: formValues.brand?.name || '', // Nome da marca (String)
      model: formValues.model?.name || '', // Nome do modelo (String)
      year: formValues.year || '',
      modelYear: formValues.modelYear || '',
      color: formValues.color || '',
      chassis: formValues.chassis || '',
      renavam: formValues.renavam || '',
      doors: formValues.doors || '',
      horsepower: formValues.horsepower || '',
      engineNumber: formValues.engineNumber || '',
      km: formValues.km || '',
      vehicleType: formValues.vehicleType || '',
      age: formValues.age || '',
      category: formValues.category || '',
      features: formValues.features || '',
      origin: formValues.origin || 'NACIONAL',
      fuelTypes: formValues.fuelTypes || [],
    };

    // Remove campos vazios
    Object.keys(payload).forEach((key) => {
      if (
        payload[key] === '' ||
        payload[key] === null ||
        payload[key] === undefined
      ) {
        delete payload[key];
      }
    });

    console.log('Payload enviado ao backend:', payload);

    // Cria ou atualiza o veículo
    if (this.dataForm?.vehicleId) {
      this.vehicleService
        .update({ ...payload, vehicleId: this.dataForm.vehicleId })
        .subscribe({
          next: () => {
            this.toastrService.success('Veículo atualizado com sucesso');
            this.formSubmitted.emit();
          },
          error: (error) => {
            console.error('Erro ao atualizar:', error);
            this.toastrService.error('Erro ao atualizar veículo');
          },
        });
    } else {
      this.vehicleService.create(payload).subscribe({
        next: () => {
          this.toastrService.success('Veículo cadastrado com sucesso');
          this.formSubmitted.emit();
        },
        error: (error) => {
          console.error('Erro ao cadastrar:', error);
          this.toastrService.error('Erro ao cadastrar veículo');
        },
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
    if (this.dataForm?.vehicleId) {
      this.vehicleService.delete(this.dataForm.vehicleId).subscribe({
        next: (response) => {
          console.log('Veículo deletado:', response);
          this.toastrService.success('Veículo deletado com sucesso');
          this.formSubmitted.emit();
        },
        error: (error) => {
          console.error('Erro ao deletar:', error);
          this.toastrService.error('Erro ao deletar veículo');
        },
      });
    } else {
      this.toastrService.error('ID do veículo não encontrado');
    }
  }

  get brandControl(): FormGroup {
    return this.form.get('brand') as FormGroup;
  }

  get modelControl(): FormGroup {
    return this.form.get('model') as FormGroup;
  }
}
