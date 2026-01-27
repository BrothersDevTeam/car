import type { Person } from '@interfaces/person';
import { LegalEntityFormComponent } from '@forms/client/legal-entity-form/legal-entity-form.component';
import { NaturalPersonFormComponent } from '@forms/client/natural-person-form/natural-person-form.component';
import { DrawerComponent } from '@components/drawer/drawer.component';
import { MatTabsModule } from '@angular/material/tabs';
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
import { PrimarySelectComponent } from '@components/primary-select/primary-select.component';
import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';

import {
  VehicleForm,
  SPECIES_OPTIONS,
  CATEGORY_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
} from '@interfaces/vehicle';
import { FuelTypes, FuelTypesLabels } from '../../../enums/fuelTypes';

import { VehicleService } from '@services/vehicle.service';
import { ColorService } from '@services/color.service';
import { AuthService } from '@services/auth/auth.service';
import { PersonService } from '@services/person.service';
import { FipeService } from '@services/fipe.service';

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
  years: { id: string; name: string }[] = []; // FIPE Years
  colors: { id: string; name: string }[] = [];
  persons: { id: string; name: string }[] = [];

  // Flags para controlar o drawer de person
  openPersonForm = signal(false);
  selectedPersonToEdit: Person | null = null;

  // Flags para controlar o carregamento
  brandsLoaded = false;
  colorsLoaded = false;
  personsLoaded = false;
  private formFilled = false; // Flag para garantir preenchimento único

  // Loading states for new FIPE fields
  loadingModels = signal(false);
  loadingYears = signal(false);
  loadingDetails = signal(false);

  // Opções de tipos de combustível
  fuelTypesOptions: { value: string; label: string }[] = [];

  readonly dialog = inject(MatDialog);
  private formBuilderService = inject(FormBuilder);
  private authService = inject(AuthService);

  @ViewChild('submitButton', { static: false, read: ElementRef })
  submitButton!: ElementRef<HTMLButtonElement>;

  // Opções para os selects
  speciesOptions = SPECIES_OPTIONS;
  categoryOptions = CATEGORY_OPTIONS;
  vehicleTypeOptions = VEHICLE_TYPE_OPTIONS;

  @Input() dataForm: VehicleForm | null = null;
  @Output() formSubmitted = new EventEmitter<void>();
  @Output() formChanged = new EventEmitter<boolean>();

  selectModelDisabled = signal(true);
  selectYearDisabled = signal(true);

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
    fipeYear: this.formBuilderService.group({
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
    private fipeService: FipeService, // Injected FipeService
    private colorService: ColorService,
    private personService: PersonService,
    private toastrService: ToastrService
  ) { }

  // Método auxiliar para mapear o tipo de veículo do formulário para o tipo da API FIPE
  private getFipeVehicleType(): string {
    const rawType = this.form.get('vehicleType')?.value;

    // Mapeamento baseado no enum VehicleType
    switch (rawType) {
      case 'MOTOCICLETA':
        return 'motos';
      case 'CAMINHAO':
      case 'ONIBUS': // Assumindo caminhões para ônibus por enquanto
        return 'caminhoes';
      case 'AUTOMOVEL':
      case 'CAMINHONETE':
      case 'CAMIONETA':
      default:
        return 'carros';
    }
  }

  // Métodos de carregamento para serem chamados quando houver alteração
  loadBrands() {
    const fipeType = this.getFipeVehicleType();

    this.fipeService.getMarcas(fipeType).subscribe({
      next: (response) => {
        this.brands = response.map((brand) => ({
          id: brand.codigo,
          name: brand.nome,
        }));
        this.brandsLoaded = true;
        this.tryFillFormOnEdit();
      },
      error: (error) => {
        console.error('Erro ao carregar marcas FIPE:', error);
        this.toastrService.error('Erro ao carregar marcas (FIPE)');
        this.brandsLoaded = true;
      },
    });
  }

  loadModels() {
    const brandControlValue = this.brandControl.value;
    const brandId = brandControlValue?.id;
    const fipeType = this.getFipeVehicleType();

    if (brandId) {
      this.loadingModels.set(true);
      this.fipeService.getModelos(fipeType, brandId).subscribe({
        next: (response) => {
          this.models = response.modelos.map((model) => ({
            id: model.codigo.toString(),
            name: model.nome,
          }));
          this.selectModelDisabled.set(false);
          this.loadingModels.set(false);

          // Se estamos editando, tenta selecionar o modelo correto
          if (this.dataForm?.model) {
            const selectedModel = this.models.find(
              (m) => m.name === this.dataForm!.model
            );
            if (selectedModel && !this.modelControl.value?.id) {
              this.modelControl.patchValue({
                id: selectedModel.id,
                name: selectedModel.name,
              });
            }
          }
        },
        error: (error) => {
          console.error('Erro ao carregar modelos FIPE:', error);
          this.toastrService.error('Erro ao carregar modelos');
          this.models = [];
          this.selectModelDisabled.set(true);
          this.loadingModels.set(false);
        },
      });
    }
  }

  loadYears() {
    const brandId = this.brandControl.value?.id;
    const modelId = this.modelControl.value?.id;
    const fipeType = this.getFipeVehicleType();

    if (brandId && modelId) {
      this.loadingYears.set(true);
      this.fipeService.getAnos(fipeType, brandId, modelId).subscribe({
        next: (response) => {
          this.years = response.map((ano) => ({
            id: ano.codigo,
            name: ano.nome,
          }));
          this.selectYearDisabled.set(false);
          this.loadingYears.set(false);
        },
        error: (error) => {
          console.error('Erro ao carregar anos FIPE:', error);
          this.toastrService.error('Erro ao carregar versões/anos');
          this.years = [];
          this.selectYearDisabled.set(true);
          this.loadingYears.set(false);
        },
      });
    }
  }

  loadVehicleDetails() {
    const brandId = this.brandControl.value?.id;
    const modelId = this.modelControl.value?.id;
    const yearId = this.fipeYearControl.value?.id;
    const fipeType = this.getFipeVehicleType();

    if (brandId && modelId && yearId) {
      this.loadingDetails.set(true);
      this.fipeService.getVehicleDetails(fipeType, brandId, modelId, yearId).subscribe({
        next: (details) => {
          this.loadingDetails.set(false);

          // Preenche automaticamente os campos com dados da FIPE
          this.form.patchValue({
            vehicleYear: details.AnoModelo,
            modelYear: details.AnoModelo, // FIPE geralmente retorna apenas AnoModelo
            fuelTypes: this.mapFuelTypeToBackend(details.Combustivel)
          });

          // Opcional: Se quiser salvar o valor da tabela FIPE em algum lugar, pode fazer aqui
          console.log('Detalhes FIPE:', details);
          this.toastrService.info(`Valor tabela FIPE: ${details.Valor}`, 'Dados carregados');
        },
        error: (error) => {
          console.error('Erro ao carregar detalhes FIPE:', error);
          this.loadingDetails.set(false);
        }
      });
    }
  }

  loadColors() {
    this.colorService.getColors().subscribe({
      next: (response) => {
        if (response.page.totalElements > 0) {
          this.colors = response.content.map((color) => ({
            id: color.colorId,
            name: color.name,
          }));
        }
        this.colorsLoaded = true;
        this.tryFillFormOnEdit();
      },
      error: (error) => {
        console.error('Erro ao carregar cores:', error);
        this.toastrService.error('Erro ao carregar cores');
        this.colorsLoaded = true;
      },
    });
  }

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
    this.loadBrands();

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
    this.loadColors();

    // Quando o tipo de veículo mudar, recarrega as marcas
    this.subscriptions.add(
      this.form.get('vehicleType')?.valueChanges.subscribe(() => {
        // Limpa seleções dependentes
        this.brandControl.reset();

        // Recarrega marcas com o novo tipo
        this.loadBrands();
      })
    );

    // Cascata: Marca -> Modelo
    this.subscriptions.add(
      this.brandControl.valueChanges
        .pipe(distinctUntilChanged((prev, curr) => prev?.id === curr?.id))
        .subscribe((brand) => {
          if (brand && brand.id) {
            this.modelControl.reset();
            this.fipeYearControl.reset();
            this.years = [];
            this.selectYearDisabled.set(true);
            this.loadModels();
          } else {
            this.models = [];
            this.years = [];
            this.modelControl.reset();
            this.fipeYearControl.reset(); // Reset ano também
            this.selectModelDisabled.set(true);
            this.selectYearDisabled.set(true);
          }
        })
    );

    // Cascata: Modelo -> Ano
    this.subscriptions.add(
      this.modelControl.valueChanges
        .pipe(distinctUntilChanged((prev, curr) => prev?.id === curr?.id))
        .subscribe((model) => {
          if (model && model.id) {
            this.fipeYearControl.reset();
            this.loadYears();
          } else {
            this.years = [];
            this.fipeYearControl.reset();
            this.selectYearDisabled.set(true);
          }
        })
    );

    // Cascata: Ano -> Detalhes
    this.subscriptions.add(
      this.fipeYearControl.valueChanges
        .pipe(distinctUntilChanged((prev, curr) => prev?.id === curr?.id))
        .subscribe((year) => {
          if (year && year.id) {
            this.loadVehicleDetails();
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
    // FIPE retorna nomes em maiúsculo ou formato específico, pode precisar de normalização de comparação
    const selectedBrand = this.brands.find(
      (b) => b.name.toLowerCase() === this.dataForm!.brand.toLowerCase()
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
        : { id: '', name: this.dataForm!.brand || '' }, // Fallback se não encontrar ID
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

    // Se houver uma marca selecionada (com ID), carrega os modelos
    if (selectedBrand && selectedBrand.id) {
      const fipeType = this.getFipeVehicleType();
      this.loadingModels.set(true);
      this.fipeService.getModelos(fipeType, selectedBrand.id).subscribe({
        next: (response) => {
          this.models = response.modelos.map((model) => ({
            id: model.codigo.toString(),
            name: model.nome,
          }));
          this.selectModelDisabled.set(false);
          this.loadingModels.set(false);

          // Após carregar os modelos, busca o modelo selecionado
          const selectedModel = this.models.find(
            (m) => m.name.toLowerCase() === this.dataForm!.model.toLowerCase()
          );

          if (selectedModel) {
            this.modelControl.patchValue({
              id: selectedModel.id,
              name: selectedModel.name,
            });
            // Opcional: Carregar anos se o modelo for encontrado
          }
        },
        error: (error) => {
          console.error('Erro ao carregar modelos:', error);
          this.selectModelDisabled.set(true);
          this.loadingModels.set(false);
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
      fuelTypes: this.mapFuelTypeToBackend(formValues.fuelTypes),
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

  get fipeYearControl(): FormGroup {
    return this.form.get('fipeYear') as FormGroup;
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

  /**
   * Mapeia os valores complexos do frontend para o Enum simples do backend
   */
  private mapFuelTypeToBackend(frontendValue: string | string[]): string[] {
    const valueToCheck = Array.isArray(frontendValue)
      ? frontendValue[0] // Assumindo seleção única por enquanto, pega o primeiro
      : frontendValue;

    if (!valueToCheck) return [];

    // Normaliza para maiúsculas para facilitar comparação
    const upperValue = valueToCheck.toUpperCase();

    // Mapeamento baseado no FuelTypes.ts do frontend
    switch (upperValue) {
      case 'ÁLCOOL':
        return ['ALCOOL'];
      case 'GASOLINA':
        return ['GASOLINA'];
      case 'DIESEL':
        return ['DIESEL'];
      case 'GÁS NATURAL VEICULAR':
        return ['GNV'];

      // Elétricos
      case 'ELÉTRICO/FONTE INTERNA':
      case 'ELÉTRICO/FONTE EXTERNA':
        return ['ELETRICO'];

      // Flex e Misturas
      case 'ÁLCOOL/GASOLINA': // Flex
        return ['ALCOOL', 'GASOLINA'];

      // Híbridos
      case 'GASOLINA/ELÉTRICO':
        return ['GASOLINA', 'ELETRICO'];

      // GNV Combinado
      case 'GASOLINA/GÁS NATURAL VEICULAR':
      case 'GASOLINA/GÁS NATURAL COMBUSTÍVEL':
        return ['GASOLINA', 'GNV'];

      case 'ÁLCOOL/GÁS NATURAL VEICULAR':
      case 'ÁLCOOL/GÁS NATURAL COMBUSTÍVEL':
        return ['ALCOOL', 'GNV'];

      case 'DIESEL/GÁS NATURAL VEICULAR':
      case 'DIESEL/GÁS NATURAL COMBUSTÍVEL':
        return ['DIESEL', 'GNV'];

      case 'GASOLINA/ÁLCOOL/GÁS NATURAL VEICULAR': // Flex + GNV
        return ['GASOLINA', 'ALCOOL', 'GNV'];

      default:
        // Se não encontrar mapeamento exato, tenta retornar o próprio valor
        // se ele for um dos aceitos pelo backend (ex: GASOLINA, ALCOOL)
        // Remove acentos e caracteres especiais para tentar dar match
        return [
          valueToCheck
            .normalize('NFD') // Decomponha acentos
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .toUpperCase(),
        ];
    }
  }
}
