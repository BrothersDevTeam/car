import type { Person } from '@interfaces/person';import { LegalEntityFormComponent } from '@forms/client/legal-entity-form/legal-entity-form.component';
import { NaturalPersonFormComponent } from '@forms/client/natural-person-form/natural-person-form.component';import { DrawerComponent } from '@components/drawer/drawer.component';import { MatTabsModule } from '@angular/material/tabs';import {
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
import { distinctUntilChanged, forkJoin, Subscription } from 'rxjs';

import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';
import { CustomSelectComponent } from '@components/custom-select/custom-select.component';
import { PrimaryInputComponent } from '@components/primary-input/primary-input.component';
import { PrimarySelectComponent } from '@components/primary-select/primary-select.component';
import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';

import { VehicleForm } from '@interfaces/vehicle';

import { VehicleService } from '@services/vehicle.service';
import { BrandService } from '@services/brand.service';
import { ModelService } from '@services/model.service';
import { ColorService } from '@services/color.service';
import { AuthService } from '@services/auth/auth.service';
import { PersonService } from '@services/person.service';

import { FuelTypes, FuelTypesLabels } from '../../../enums/fuelTypes';

@Component({
  selector: 'app-vehicle-form',
  imports: [
    PrimaryInputComponent,
    PrimarySelectComponent,
    ReactiveFormsModule,
    WrapperCardComponent,
    MatButtonModule,
    MatIconModule,
    MatOptionModule,
    MatSelectModule,
    CustomSelectComponent,
    MatRadioModule,
    DrawerComponent,
    MatTabsModule,
    LegalEntityFormComponent,
    NaturalPersonFormComponent,
  ],
  templateUrl: './vehicle-form.component.html',
  styleUrl: './vehicle-form.component.scss',
})
export class VehicleFormComponent implements OnInit, OnChanges, OnDestroy {
  private subscriptions = new Subscription();
  submitted = false;

  brands: { id: string; name: string }[] = [];
  models: { id: string; name: string }[] = [];
  colors: { id: string; name: string }[] = [];
  persons: { id: string; name: string }[] = [];

  // Flags para controlar o drawer de person
  openPersonForm = signal(false);
  selectedPersonToEdit: Person | null = null;

  // Flags para controlar o carregamento
  private brandsLoaded = false;
  private colorsLoaded = false;
  private personsLoaded = false;
  private formFilled = false; // Flag para garantir preenchimento único

  // Opções de tipos de combustível
  fuelTypesOptions: { value: string; label: string }[] = [];

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
   * Formulário com FormGroups aninhados para brand, model e color
   * para trabalhar com o custom-select component
   */
  protected form: FormGroup = this.formBuilderService.group({
    owner: this.formBuilderService.group({
      id: [''],
      name: [''],
    }),
    plate: ['', Validators.required],
    brand: this.formBuilderService.group({
      id: [''],
      name: [''],
    }),
    model: this.formBuilderService.group({
      id: [''],
      name: [''],
    }),
    vehicleYear: [''],
    modelYear: [''],
    color: this.formBuilderService.group({
      id: [''],
      name: [''],
    }),
    chassis: [''],
    renavam: [''],
    doors: [''],
    horsepower: [''],
    engineNumber: [''],
    km: [''],
    vehicleType: [''],
    species: [''],
    category: [''],
    features: [''],
    fuelTypes: [[]], // Array de FuelTypes
    origin: ['NACIONAL'],
  });

  public get vehicleForm(): FormGroup {
    return this.form;
  }

  constructor(
    private vehicleService: VehicleService,
    private brandService: BrandService,
    private modelService: ModelService,
    private colorService: ColorService,
    private personService: PersonService,
    private toastrService: ToastrService
  ) {}

  ngOnInit() {
    // Carrega opções de tipos de combustível do enum
    this.fuelTypesOptions = Object.values(FuelTypes).map((fuelType) => ({
      value: fuelType,
      label: FuelTypesLabels[fuelType],
    }));

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
        this.brandsLoaded = true;
        // Tenta preencher o formulário se já tiver dataForm
        this.tryFillFormOnEdit();
      },
      error: (error) => {
        console.error('Erro ao carregar marcas:', error);
        this.toastrService.error('Erro ao carregar marcas');
        this.brandsLoaded = true;
      },
    });

    // Carrega pessoas do backend
    this.personService.getPaginatedData(0, 1000).subscribe({
      next: (response) => {
        console.log('Pessoas carregadas:', response);
        if (response.page.totalElements > 0) {
          this.persons = response.content.map((person) => ({
            id: person.personId,
            name: person.name,
          }));
        }
        this.personsLoaded = true;
        // Tenta preencher o formulário se já tiver dataForm
        this.tryFillFormOnEdit();
      },
      error: (error) => {
        console.error('Erro ao carregar pessoas:', error);
        this.toastrService.error('Erro ao carregar pessoas');
        this.personsLoaded = true;
      },
    });

    // Carrega cores do backend
    this.colorService.getColors().subscribe({
      next: (response) => {
        console.log('Cores carregadas:', response);
        if (response.page.totalElements > 0) {
          this.colors = response.content.map((color) => ({
            id: color.colorId,
            name: color.name, // Usar o campo 'name' do backend
          }));
        }
        this.colorsLoaded = true;
        // Tenta preencher o formulário se já tiver dataForm
        this.tryFillFormOnEdit();
      },
      error: (error) => {
        console.error('Erro ao carregar cores:', error);
        this.toastrService.error('Erro ao carregar cores');
        this.colorsLoaded = true;
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
      // Reset da flag quando recebe novo dataForm
      this.formFilled = false;
      // Tenta preencher o formulário (só executa se brands e colors já foram carregados)
      this.tryFillFormOnEdit();
    }
  }

  /**
   * Tenta preencher o formulário para edição
   * Só executa quando brands e colors já estiverem carregados
   */
  private tryFillFormOnEdit(): void {
    // Verifica se tem dataForm e se brands, colors e persons já foram carregados
    if (
      !this.dataForm ||
      !this.brandsLoaded ||
      !this.colorsLoaded ||
      !this.personsLoaded
    ) {
      console.log('tryFillFormOnEdit - aguardando carregamento:', {
        hasDataForm: !!this.dataForm,
        brandsLoaded: this.brandsLoaded,
        colorsLoaded: this.colorsLoaded,
        personsLoaded: this.personsLoaded,
      });
      return;
    }

    // Se já preencheu uma vez, não preenche novamente
    if (this.formFilled) {
      console.log(
        'tryFillFormOnEdit - formulário já foi preenchido, ignorando'
      );
      return;
    }

    // Para edição, busca a marca pelo nome
    const selectedBrand = this.brands.find(
      (b) => b.name === this.dataForm!.brand
    );

    // Para edição, busca a cor pelo nome
    const selectedColor = this.colors.find(
      (c) => c.name === this.dataForm!.color
    );

    // Para edição, busca o proprietário pelo ID
    const selectedOwner = this.dataForm!.owner
      ? this.persons.find((p) => p.id === this.dataForm!.owner)
      : null;

    // Preenche o formulário com os dados do veículo
    this.form.patchValue({
      plate: this.dataForm!.plate || '',
      owner: selectedOwner
        ? { id: selectedOwner.id, name: selectedOwner.name }
        : { id: '', name: '' },
      brand: selectedBrand
        ? { id: selectedBrand.id, name: selectedBrand.name }
        : { id: '', name: '' },
      model: { id: '', name: this.dataForm!.model || '' },
      vehicleYear: this.dataForm!.vehicleYear || '',
      modelYear: this.dataForm!.modelYear || '',
      color: selectedColor
        ? { id: selectedColor.id, name: selectedColor.name }
        : { id: '', name: '' },
      chassis: this.dataForm!.chassis || '',
      renavam: this.dataForm!.renavam || '',
      doors: this.dataForm!.doors || '',
      horsepower: this.dataForm!.horsepower || '',
      engineNumber: this.dataForm!.engineNumber || '',
      km: this.dataForm!.km || '',
      vehicleType: this.dataForm!.vehicleType || '',
      species: this.dataForm!.species || '',
      category: this.dataForm!.category || '',
      features: this.dataForm!.features || '',
      fuelTypes: this.dataForm!.fuelTypes || [], // Tipos de combustível
      origin: this.dataForm!.origin || 'NACIONAL',
    });

    // Marca que o formulário foi preenchido
    this.formFilled = true;

    // Se houver uma marca selecionada, carrega os modelos
    if (selectedBrand && selectedBrand.id) {
      this.modelService.getModelsByBrand(selectedBrand.id).subscribe({
        next: (response) => {
          this.models = response.content.map((model) => ({
            id: model.modelId,
            name: model.name,
          }));
          this.selectModelDisabled.set(false);

          // Após carregar os modelos, busca o modelo selecionado
          const selectedModel = this.models.find(
            (m) => m.name === this.dataForm!.model
          );

          if (selectedModel) {
            this.modelControl.patchValue({
              id: selectedModel.id,
              name: selectedModel.name,
            });
          }
        },
        error: (error) => {
          console.error('Erro ao carregar modelos:', error);
          this.selectModelDisabled.set(true);
        },
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

    // Monta o payload para o backend (brand, model e color são Strings)
    const payload: any = {
      storeId: this.authService.getStoreId(),
      ownerId: formValues.owner?.id || null, // ID do proprietário (UUID)
      plate: formValues.plate,
      brand: formValues.brand?.name || '', // Nome da marca (String)
      model: formValues.model?.name || '', // Nome do modelo (String)
      vehicleYear: formValues.vehicleYear || '',
      modelYear: formValues.modelYear || '',
      color: formValues.color?.name || '', // Nome da cor (String)
      chassis: formValues.chassis || '',
      renavam: formValues.renavam || '',
      doors: formValues.doors || '',
      horsepower: formValues.horsepower || '',
      engineNumber: formValues.engineNumber || '',
      km: formValues.km || '',
      vehicleType: formValues.vehicleType || '',
      species: formValues.species || '',
      category: formValues.category || '',
      features: formValues.features || '',
      origin: formValues.origin || 'NACIONAL',
      fuelTypes: formValues.fuelTypes || [],
    };

    // Remove campos vazios, EXCETO color que pode ser string vazia
    Object.keys(payload).forEach((key) => {
      if (
        payload[key] === '' ||
        payload[key] === null ||
        payload[key] === undefined
      ) {
        delete payload[key];
      }
    });

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

  get colorControl(): FormGroup {
    return this.form.get('color') as FormGroup;
  }

  get ownerControl(): FormGroup {
    return this.form.get('owner') as FormGroup;
  }

  /**
   * Abre o drawer para criar nova pessoa
   */
  onCreateNewPerson() {
    this.selectedPersonToEdit = null;
    this.openPersonForm.set(true);
  }

  /**
   * Abre o drawer para editar pessoa existente
   */
  onEditPerson(personId: string) {
    // Busca a pessoa específica por ID (requisição otimizada)
    this.personService.getById(personId).subscribe({
      next: (person) => {
        this.selectedPersonToEdit = person;
        this.openPersonForm.set(true);
      },
      error: (error) => {
        console.error('Erro ao carregar pessoa:', error);
        this.toastrService.error('Erro ao carregar pessoa');
      },
    });
  }

  /**
   * Fecha o drawer de pessoa
   */
  handleClosePersonDrawer() {
    this.openPersonForm.set(false);
    this.selectedPersonToEdit = null;
  }

  /**
   * Callback quando o formulário de pessoa é submetido
   */
  onPersonFormSubmitted() {
    // Recarrega a lista de pessoas
    this.reloadPersons();
    this.handleClosePersonDrawer();
  }

  /**
   * Recarrega a lista de pessoas
   */
  private reloadPersons() {
    this.personService.getPaginatedData(0, 1000).subscribe({
      next: (response) => {
        this.persons = response.content.map((person) => ({
          id: person.personId,
          name: person.name,
        }));
      },
      error: (error) => {
        console.error('Erro ao recarregar pessoas:', error);
      },
    });
  }
}
