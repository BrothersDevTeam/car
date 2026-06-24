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
  FormArray,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { ToastrService } from 'ngx-toastr';
import { distinctUntilChanged, Subscription, of, Observable } from 'rxjs';

import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';
import { CustomSelectComponent } from '@components/custom-select/custom-select.component';
import { PrimaryInputComponent } from '@components/primary-input/primary-input.component';
import { PrimarySelectComponent } from '@components/primary-select/primary-select.component';

import { VehicleForm, SPECIES_OPTIONS, CATEGORY_OPTIONS, VEHICLE_TYPE_OPTIONS } from '@interfaces/vehicle';
import { extractErrorMessage } from '@utils/error-utils';
import { FuelTypes, FuelTypesLabels } from '../../../enums/fuelTypes';

import { VehicleService } from '@services/vehicle.service';
import { ColorService } from '@services/color.service';
import { OptionalService } from '@services/optional.service';
import { CurrencyInputComponent } from '@components/currency-input/currency-input.component';
import { DateInputComponent } from '@components/date-input/date-input.component';
import { PersonService } from '@services/person.service';
import { FipeService } from '@services/fipe.service';
import { StoreContextService } from '@services/store-context.service';
import { FormDraftService, FormDraft } from '@services/form-draft.service';
import { ActionsService } from '@services/actions.service';
import {
  SaveDraftDialogComponent,
  SaveDraftDialogResult,
} from '@components/dialogs/save-draft-dialog/save-draft-dialog.component';

@Component({
  selector: 'app-vehicle-form',
  standalone: true,
  imports: [
    CommonModule,
    PrimaryInputComponent,
    PrimarySelectComponent,
    ReactiveFormsModule,
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
    CurrencyInputComponent,
    DateInputComponent,
    MatTooltipModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './vehicle-form.component.html',
  styleUrl: './vehicle-form.component.scss',
})
export class VehicleFormComponent implements OnInit, OnChanges, OnDestroy {
  private subscriptions = new Subscription();
  submitted = false;
  readonly FORM_TYPE = 'vehicle';

  // Gestão de Rascunhos
  draftSelectorClicked = false;
  availableDrafts: FormDraft[] = [];
  selectedDraft: FormDraft | null = null;
  showFormFields = false;
  selectedDraftId: string | null = null;
  isSaving = false;
  isInitializing = false;
  private lastSavedDraftValue: any = null;
  private formDraftService = inject(FormDraftService);
  private actionsService = inject(ActionsService);
  private router = inject(Router);

  brands: { id: string; name: string }[] = [];
  models: { id: string; name: string }[] = [];
  years: { id: string; name: string }[] = []; // FIPE Years
  colors: { id: string; name: string }[] = [];
  persons: { id: string; name: string }[] = [];
  selectedTabIndex = signal(0);

  // Flags para controlar o drawer de person
  openPersonForm = signal(false);
  selectedPersonToEdit: Person | null = null;

  // Flags para controlar o carregamento
  brandsLoaded = false;
  colorsLoaded = false;
  personsLoaded = false;
  private formFilled = false; // Flag para garantir preenchimento único
  private isFillingForm = false; // Flag para evitar resete em cascata ao editar

  // Loading states for new FIPE fields
  loadingModels = signal(false);
  loadingYears = signal(false);
  loadingDetails = signal(false);

  // Opções de tipos de combustível
  fuelTypesOptions: { value: string; label: string }[] = [];

  // Opções de opcionais
  optionalsOptions: { value: string; label: string }[] = [];

  readonly dialog = inject(MatDialog);
  private formBuilderService = inject(FormBuilder);
  private storeContextService = inject(StoreContextService);

  @ViewChild('submitButton', { static: false, read: ElementRef })
  submitButton!: ElementRef<HTMLButtonElement>;

  // Opções para os selects
  speciesOptions = SPECIES_OPTIONS;
  categoryOptions = CATEGORY_OPTIONS;
  vehicleTypeOptions = VEHICLE_TYPE_OPTIONS;

  @Input() dataForm: VehicleForm | null = null;
  @Input() draft: FormDraft | null | undefined = null;
  @Output() formSubmitted = new EventEmitter<void>();
  @Output() formChanged = new EventEmitter<boolean>();

  selectModelDisabled = signal(true);
  selectYearDisabled = signal(true);

  private initialFormValue: string = '';

  /**
   * Formulário com FormGroups aninhados para brand, model e color
   * para trabalhar com o custom-select component
   */
  protected form: FormGroup = this.formBuilderService.group(
    {
      owner: this.formBuilderService.group({
        id: [''],
        name: [''],
      }),
      supplier: this.formBuilderService.group({
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
      engineDisplacement: [''],
      engineNumber: [''],
      km: [''],
      vehicleType: ['AUTOMOVEL'],
      species: ['PASSAGEIRO'],
      category: ['PARTICULAR'],
      features: [''],
      fuelTypes: [[]], // Array de FuelTypes
      optionalIds: [[]], // Array de Opcionais (UUIDs)
      origin: ['NACIONAL'],
      valorVenda: [''],
      observation: [''],
      entryDate: [''],
      exitDate: [''],
    }
  );

  public get vehicleForm(): FormGroup {
    return this.form;
  }



  private formatDateToISO(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  constructor(
    private vehicleService: VehicleService,
    private fipeService: FipeService, // Injected FipeService
    private colorService: ColorService,
    private personService: PersonService,
    private toastrService: ToastrService,
    private optionalService: OptionalService,
  ) {}

  hasUnsavedChanges(): boolean {
    if (this.isSaving || this.isInitializing) {
      return false;
    }

    if (this.form.pristine) {
      return false;
    }

    if (this.dataForm) {
      return this.hasChangesComparedTo(this.dataForm);
    }

    const defaultSource = {
      origin: 'NACIONAL',
      fuelTypes: [],
      optionalIds: [],
    };
    return this.hasChangesComparedTo(defaultSource);
  }

  canSaveForm(): boolean {
    if (this.form.valid) {
      return true;
    }
    const raw = this.form.value;
    return !!(raw.plate || raw.brand?.name || raw.model?.name);
  }

  get isSaveButtonDisabled(): boolean {
    if (this.isSaving || this.isInitializing) {
      return true;
    }

    const hasActiveDraft = !!this.draft || !!this.selectedDraftId;
    const isEditMode = !!this.dataForm && !!this.dataForm.vehicleId;

    if (isEditMode) {
      if (hasActiveDraft) {
        return !this.form.valid;
      }
      return !this.hasUnsavedChanges();
    }
    return !this.form.valid;
  }

  hasChangesComparedToDraft(): boolean {
    const source = this.lastSavedDraftValue;
    if (!source) {
      return this.hasUnsavedChanges();
    }
    return this.hasChangesComparedTo(source);
  }

  hasChangesComparedTo(source: any): boolean {
    const formValue = this.form.getRawValue();

    const normalize = (val: any): string | null => {
      if (val === null || val === undefined) return null;
      const str = val.toString().trim();
      return str === '' ? null : str;
    };

    const fields = [
      'plate',
      'origin',
      'vehicleType',
      'vehicleYear',
      'modelYear',
      'km',
      'doors',
      'chassis',
      'renavam',
      'engineNumber',
      'engineDisplacement',
      'horsepower',
      'species',
      'category',
      'features',
      'observation',
      'dataCompra',
      'entryDate',
      'exitDate',
    ];

    for (const field of fields) {
      if (normalize(formValue[field]) !== normalize(source[field])) {
        return true;
      }
    }

    const nestedObjects = ['owner', 'supplier', 'brand', 'model', 'fipeYear', 'color'];
    for (const obj of nestedObjects) {
      const formObj = formValue[obj] || {};
      const sourceObj = source[obj] || {};
      if (normalize(formObj.id) !== normalize(sourceObj.id) || normalize(formObj.name) !== normalize(sourceObj.name)) {
        return true;
      }
    }

    const arrays = ['fuelTypes', 'optionalIds'];
    for (const arrField of arrays) {
      const formArr = Array.isArray(formValue[arrField]) ? formValue[arrField] : [];
      const sourceArr = Array.isArray(source[arrField]) ? source[arrField] : [];
      if (formArr.length !== sourceArr.length) {
        return true;
      }
      const sortedForm = [...formArr].sort();
      const sortedSource = [...sourceArr].sort();
      for (let i = 0; i < sortedForm.length; i++) {
        if (sortedForm[i] !== sortedSource[i]) {
          return true;
        }
      }
    }

    return false;
  }

  get canShowDraftButton(): boolean {
    return !this.isSaving && !this.isInitializing && this.form.dirty && this.hasChangesComparedToDraft();
  }

  get currentDraftName(): string | undefined {
    return this.selectedDraft?.draftName;
  }

  get suggestedDraftName(): string {
    return this.form.value.plate || `Rascunho ${new Date().toLocaleString()}`;
  }

  openSaveDraftDialog() {
    if (this.selectedDraftId) {
      const currentDraft = this.availableDrafts.find((d) => d.id === this.selectedDraftId);
      if (currentDraft) {
        this.saveLocalDraft(false, currentDraft.draftName, this.selectedDraftId, true);
        return;
      }
    }

    const suggestedName = this.form.value.plate || `Rascunho ${new Date().toLocaleString()}`;

    const dialogRef = this.dialog.open(SaveDraftDialogComponent, {
      data: {
        title: 'Salvar Rascunho',
        suggestedName,
      },
    });

    dialogRef.afterClosed().subscribe((result: SaveDraftDialogResult) => {
      if (result && result.confirmed) {
        const nameExists = this.availableDrafts.some((d) => d.draftName === result.draftName);

        if (nameExists) {
          this.toastrService.error('Já existe um rascunho com este nome. Por favor, escolha outro.', 'Nome Duplicado');
          this.openSaveDraftDialog();
          return;
        }

        this.saveLocalDraft(false, result.draftName, undefined, true);
      }
    });
  }

  saveLocalDraft(
    silent: boolean = false,
    draftName?: string,
    existingDraftId?: string | null,
    closeAfterSave: boolean = true,
  ): void {
    const vehicleId = this.dataForm?.vehicleId || undefined;
    let effectiveEntityId = vehicleId;

    if (!effectiveEntityId && existingDraftId) {
      const prefix = `${this.FORM_TYPE}_`;
      if (existingDraftId.startsWith(prefix)) {
        effectiveEntityId = existingDraftId.replace(prefix, '') as any;
      }
    }

    const draftData = {
      ...this.form.value,
      _editingId: this.dataForm?.vehicleId,
    };

    const draftId = this.formDraftService.saveDraft(this.FORM_TYPE, draftData, effectiveEntityId, draftName);

    this.selectedDraftId = draftId;
    this.lastSavedDraftValue = this.form.getRawValue();

    if (!silent) {
      this.toastrService.info('Rascunho salvo localmente');
    }

    if (!closeAfterSave) {
      this.form.markAsPristine();
      this.actionsService.hasFormChanges.set(false);

      setTimeout(() => {
        this.initialFormValue = JSON.stringify(this.form.value);
      }, 100);
    }

    if (closeAfterSave) {
      this.formSubmitted.emit();
    }
  }

  saveForm(isDraft: boolean): Observable<boolean> {
    this.isSaving = true;

    if (isDraft) {
      this.saveLocalDraft(false, undefined, this.selectedDraftId, true);
      this.isSaving = false;
      return of(true);
    }

    return this.executeSave();
  }

  private executeSave(): Observable<boolean> {
    return new Observable((observer) => {
      try {
        const formValues = this.form.getRawValue();
        const payload: any = {
          storeId: this.storeContextService.currentStoreId,
          ownerId: formValues.owner?.id || null,
          plate: formValues.plate,
          brand: formValues.brand?.name || '',
          model: formValues.model?.name || '',
          vehicleYear: formValues.vehicleYear || '',
          modelYear: formValues.modelYear || '',
          color: formValues.color?.name || '',
          chassis: formValues.chassis || '',
          renavam: formValues.renavam || '',
          doors: formValues.doors || '',
          horsepower: formValues.horsepower || '',
          engineDisplacement: formValues.engineDisplacement || '',
          engineNumber: formValues.engineNumber || '',
          km: formValues.km || '',
          vehicleType: formValues.vehicleType || '',
          species: formValues.species || '',
          category: formValues.category || '',
          features: formValues.features || '',
          origin: formValues.origin || 'NACIONAL',
          fuelTypes: this.mapFuelTypeToBackend(formValues.fuelTypes),
          optionalIds: formValues.optionalIds || [],
          valorVenda: formValues.valorVenda?.toString() || '',
          observation: formValues.observation || '',
          entryDate: formValues.entryDate || '',
          exitDate: formValues.exitDate || '',
        };

        Object.keys(payload).forEach((key) => {
          if (payload[key] === '' || payload[key] === null || payload[key] === undefined) {
            delete payload[key];
          }
        });

        if (this.dataForm?.vehicleId) {
          const draftIdToDelete = this.selectedDraftId;

          this.vehicleService.update({ ...payload, vehicleId: this.dataForm.vehicleId }).subscribe({
            next: () => {
              this.toastrService.success('Veículo atualizado com sucesso');

              if (draftIdToDelete) {
                this.formDraftService.removeDraftById(draftIdToDelete);
              } else {
                this.formDraftService.removeDraft(this.FORM_TYPE, this.dataForm?.vehicleId);
              }

              this.initialFormValue = JSON.stringify(this.form.value);
              this.actionsService.hasFormChanges.set(false);
              this.isSaving = false;
              observer.next(true);
              observer.complete();
            },
            error: (error) => {
              console.error('Erro ao atualizar:', error);
              const msg = extractErrorMessage(error, 'Erro ao atualizar veículo');
              this.toastrService.error(msg);
              this.isSaving = false;
              observer.next(false);
              observer.complete();
            },
          });
        } else {
          const draftIdToDelete = this.selectedDraftId || this.draft?.id;

          this.vehicleService.create(payload).subscribe({
            next: () => {
              this.toastrService.success('Veículo cadastrado com sucesso');

              if (draftIdToDelete) {
                this.formDraftService.removeDraftById(draftIdToDelete);
              } else {
                this.formDraftService.removeDraft(this.FORM_TYPE);
              }

              this.initialFormValue = JSON.stringify(this.form.value);
              this.actionsService.hasFormChanges.set(false);
              this.isSaving = false;
              observer.next(true);
              observer.complete();
            },
            error: (error) => {
              console.error('Erro ao cadastrar:', error);
              const msg = extractErrorMessage(error, 'Erro ao cadastrar veículo');
              this.toastrService.error(msg);
              this.isSaving = false;
              observer.next(false);
              observer.complete();
            },
          });
        }
      } catch (error) {
        console.error('[executeSave] Erro ao salvar:', error);
        this.isSaving = false;
        observer.next(false);
        observer.complete();
      }
    });
  }

  private checkForDrafts() {
    this.availableDrafts = this.formDraftService.getDraftsByType(this.FORM_TYPE);
    if (this.availableDrafts.length === 0) {
      this.showFormFields = true;
    } else if (this.dataForm || this.selectedDraftId || this.draft) {
      this.showFormFields = true;
    }
  }

  handleDraftSelection(draftId: string | null) {
    this.showFormFields = true;
    if (!draftId || draftId === 'new') {
      this.selectedDraftId = 'new';
      this.selectedDraft = null;
      this.form.reset({
        origin: 'NACIONAL',
        fuelTypes: [],
      });
      this.modelControl.reset();
      this.fipeYearControl.reset();
      this.years = [];
      this.selectModelDisabled.set(true);
      this.selectYearDisabled.set(true);
      this.initialFormValue = JSON.stringify(this.form.value);
      this.lastSavedDraftValue = this.form.getRawValue();
      return;
    }

    const draft = this.availableDrafts.find((d) => d.id === draftId);
    if (!draft) {
      console.error('[handleDraftSelection] Rascunho não encontrado:', draftId);
      return;
    }

    this.selectedDraft = draft;
    this.selectedDraftId = draft.id;

    // Se o rascunho contém ID de edição e não temos dataForm definido, recria a referência do dataForm
    if (!this.dataForm && draft.data?._editingId) {
      this.dataForm = {
        vehicleId: draft.data._editingId,
      } as any;
    }

    this.isFillingForm = false;

    if (draft.data?.brand?.id) {
      this.loadModels();
    }
    if (draft.data?.model?.id) {
      this.loadYears();
    }

    this.initialFormValue = JSON.stringify(this.form.value);
    this.lastSavedDraftValue = this.form.getRawValue();
    this.toastrService.success('Rascunho carregado com sucesso');
    this.actionsService.hasFormChanges.set(false);
  }

  removeDraft(draftId: string, event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    const draft = this.availableDrafts.find((d) => d.id === draftId);
    if (!draft) {
      return;
    }

    this.formDraftService.removeDraftById(draft.id);
    this.checkForDrafts();

    if (this.selectedDraftId === draftId) {
      this.form.reset({
        origin: 'NACIONAL',
        fuelTypes: [],
      });
      this.modelControl.reset();
      this.fipeYearControl.reset();
      this.years = [];
      this.selectModelDisabled.set(true);
      this.selectYearDisabled.set(true);
      this.selectedDraft = null;
      this.selectedDraftId = null;
      this.showFormFields = this.availableDrafts.length === 0;
    }

    this.toastrService.success('Rascunho excluído');
  }

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
            const selectedModel = this.models.find((m) => m.name === this.dataForm!.model);
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
            name: ano.nome.replace('32000', 'Zero KM'),
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
          // Se o ano for 32000, considera como Zero KM (usa o ano atual)
          const fipeYear = details.AnoModelo === 32000 ? new Date().getFullYear() : details.AnoModelo;

          // Extração de cilindrada do modelo (ex: "GOL 1.0" -> "1.0" ou "2.0")
          // Procura por padrão número.número (ex: 1.0, 2.0, 1.6)
          const engineDisplacementMatch = details.Modelo.match(/(\d+\.\d+)/);
          const extractedDisplacement = engineDisplacementMatch ? engineDisplacementMatch[0] : '';

          this.form.patchValue({
            vehicleYear: fipeYear,
            modelYear: fipeYear, // FIPE geralmente retorna apenas AnoModelo
            engineDisplacement: extractedDisplacement,
            fuelTypes: this.mapFuelTypeToBackend(details.Combustivel),
          });

          // Opcional: Se quiser salvar o valor da tabela FIPE em algum lugar, pode fazer aqui
          console.log('Detalhes FIPE:', details);
          this.toastrService.info(`Valor tabela FIPE: ${details.Valor}`, 'Dados carregados');
        },
        error: (error) => {
          console.error('Erro ao carregar detalhes FIPE:', error);
          this.loadingDetails.set(false);
        },
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
    this.isInitializing = true;

    // Carrega opções de tipos de combustível do enum
    this.fuelTypesOptions = Object.keys(FuelTypes).map((key) => {
      const enumValue = FuelTypes[key as keyof typeof FuelTypes];
      return {
        value: key,
        label: FuelTypesLabels[enumValue],
      };
    });

    // Monitora mudanças no formulário
    this.subscriptions.add(
      this.form.valueChanges.subscribe(() => {
        const hasChanges = this.hasUnsavedChanges();
        this.actionsService.hasFormChanges.set(hasChanges);
        this.formChanged.emit(hasChanges);
      }),
    );

    // Carrega marcas do backend
    this.loadBrands();

    // Carrega pessoas do backend (filtrando pela rede da loja)
    this.personService
      .getPaginatedData(0, 1000, {
        networkStoreId: this.storeContextService.currentStoreId!,
      })
      .subscribe({
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

    // Carrega opcionais disponíveis do backend
    this.optionalService.getAvailableOptionals().subscribe({
      next: (response) => {
        console.log('Opcionais disponíveis carregados:', response);
        this.optionalsOptions = response.map((opt) => ({
          value: opt.optionalId,
          label: opt.name,
        }));
      },
      error: (error) => {
        console.error('Erro ao carregar opcionais:', error);
        this.toastrService.error('Erro ao carregar opcionais disponíveis');
      },
    });

    // Busca rascunhos disponíveis
    this.showFormFields = !!this.dataForm || !!this.draft;
    this.checkForDrafts();

    // Inicializa o valor inicial do formulário
    this.initialFormValue = JSON.stringify(this.form.value);

    // Quando o tipo de veículo mudar, recarrega as marcas
    this.subscriptions.add(
      this.form.get('vehicleType')?.valueChanges.subscribe(() => {
        if (this.isFillingForm) return;
        // Limpa seleções dependentes
        this.brandControl.reset();

        // Recarrega marcas com o novo tipo
        this.loadBrands();
      }),
    );

    // Cascata: Marca -> Modelo
    this.subscriptions.add(
      this.brandControl.valueChanges
        .pipe(distinctUntilChanged((prev, curr) => prev?.id === curr?.id))
        .subscribe((brand) => {
          if (this.isFillingForm) return;
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
        }),
    );

    // Cascata: Modelo -> Ano
    this.subscriptions.add(
      this.modelControl.valueChanges
        .pipe(distinctUntilChanged((prev, curr) => prev?.id === curr?.id))
        .subscribe((model) => {
          if (this.isFillingForm) return;
          if (model && model.id) {
            this.fipeYearControl.reset();
            this.loadYears();
          } else {
            this.years = [];
            this.fipeYearControl.reset();
            this.selectYearDisabled.set(true);
          }
        }),
    );

    // Cascata: Ano -> Detalhes
    this.subscriptions.add(
      this.fipeYearControl.valueChanges
        .pipe(distinctUntilChanged((prev, curr) => prev?.id === curr?.id))
        .subscribe((year) => {
          if (year && year.id) {
            this.loadVehicleDetails();
          }
        }),
    );

    setTimeout(() => {
      this.isInitializing = false;
      if (!this.lastSavedDraftValue) {
        this.lastSavedDraftValue = this.form.getRawValue();
      }
    }, 500);

    // Inscreve para atualizar lista quando rascunhos mudarem
    this.subscriptions.add(
      this.formDraftService.draftsChanges.subscribe(() => {
        this.checkForDrafts();
      }),
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['dataForm'] && this.dataForm) {
      this.showFormFields = true;
      // Reset da flag quando recebe novo dataForm
      this.formFilled = false;
      // Tenta preencher o formulário (só executa se brands e colors já foram carregados)
      this.tryFillFormOnEdit();
    }

    if (changes['draft'] && this.draft) {
      this.handleDraftSelection(this.draft.id);
    }
  }

  /**
   * Tenta preencher o formulário para edição
   * Só executa quando brands e colors já estiverem carregados
   */
  private tryFillFormOnEdit(): void {
    // Verifica se tem dataForm e se brands, colors e persons já foram carregados
    if (!this.dataForm || !this.brandsLoaded || !this.colorsLoaded || !this.personsLoaded) {
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
      console.log('tryFillFormOnEdit - formulário já foi preenchido, ignorando');
      return;
    }

    this.isInitializing = true;

    // Para edição, busca a marca pelo nome
    // FIPE retorna nomes em maiúsculo ou formato específico, pode precisar de normalização de comparação
    const selectedBrand = this.brands.find((b) => b.name.toLowerCase() === (this.dataForm?.brand || '').toLowerCase());

    // Para edição, busca a cor pelo nome
    const selectedColor = this.colors.find((c) => c.name === (this.dataForm?.color || ''));

    // Preenche o formulário com os dados do veículo
    this.isFillingForm = true;
    this.form.patchValue({
      plate: this.dataForm?.plate || '',
      brand: selectedBrand
        ? { id: selectedBrand.id, name: selectedBrand.name }
        : { id: '', name: this.dataForm?.brand || '' }, // Fallback se não encontrar ID
      model: { id: '', name: this.dataForm?.model || '' },
      vehicleYear: this.dataForm!.vehicleYear || '',
      modelYear: this.dataForm!.modelYear || '',
      color: selectedColor ? { id: selectedColor.id, name: selectedColor.name } : { id: '', name: '' },
      chassis: this.dataForm!.chassis || '',
      renavam: this.dataForm!.renavam || '',
      doors: this.dataForm!.doors || '',
      horsepower: this.dataForm!.horsepower || '',
      engineDisplacement: this.dataForm!.engineDisplacement || '',
      engineNumber: this.dataForm!.engineNumber || '',
      km: this.dataForm!.km || '',
      vehicleType: this.dataForm!.vehicleType || '',
      species: this.dataForm!.species || '',
      category: this.dataForm!.category || '',
      features: this.dataForm!.features || '',
      fuelTypes: this.dataForm!.fuelTypes || [], // Tipos de combustível
      optionalIds: this.dataForm!.optionals ? this.dataForm!.optionals.map((opt) => opt.optionalId) : [], // Opcionais do veículo
      origin: this.dataForm!.origin || 'NACIONAL',
      valorVenda: this.dataForm!.valorVenda || '',
      observation: this.dataForm!.observation || '',
      entryDate: this.dataForm!.entryDate ? this.dataForm!.entryDate.toString().substring(0, 16) : '',
      exitDate: this.dataForm!.exitDate ? this.dataForm!.exitDate.toString().substring(0, 16) : '',
    });

    this.isFillingForm = false;

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
            (m) => m.name.toLowerCase() === (this.dataForm?.model || '').toLowerCase(),
          );

          if (selectedModel) {
            this.modelControl.patchValue({
              id: selectedModel.id,
              name: selectedModel.name,
            });
            // Opcional: Carregar anos se o modelo for encontrado
          }

          this.isInitializing = false;
          this.lastSavedDraftValue = this.form.getRawValue();
        },
        error: (error) => {
          console.error('Erro ao carregar modelos:', error);
          this.selectModelDisabled.set(true);
          this.loadingModels.set(false);
          this.isInitializing = false;
          this.lastSavedDraftValue = this.form.getRawValue();
        },
      });
    } else {
      this.isInitializing = false;
      this.lastSavedDraftValue = this.form.getRawValue();
    }
  }

  onEnter(event: Event): void {
    if (event instanceof KeyboardEvent) {
      event.preventDefault();

      if (this.form.valid && document.activeElement === this.submitButton.nativeElement) {
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

      // Identifica quais campos estão inválidos para dar um feedback melhor
      const invalidFields: string[] = [];
      const controls = this.form.controls;

      if (controls['plate'].invalid) invalidFields.push('Placa');
      if (this.form.hasError('supplierRequired')) invalidFields.push('Fornecedor');
      if (this.form.hasError('paymentsMismatch'))
        invalidFields.push('Financeiro (Soma das parcelas deve ser igual ao Valor de Compra)');

      this.toastrService.warning(`Campos obrigatórios pendentes: ${invalidFields.join(', ')}`);

      // Determina para qual aba navegar dependendo dos erros
      if (controls['plate'].invalid) {
        this.selectedTabIndex.set(0);
      } else if (this.form.hasError('supplierRequired')) {
        this.selectedTabIndex.set(1);
      } else if (this.form.hasError('paymentsMismatch')) {
        this.selectedTabIndex.set(2);
      } else {
        this.selectedTabIndex.set(1);
      }

      return;
    }

    this.saveForm(false).subscribe((success) => {
      if (success) {
        this.formSubmitted.emit();
      }
    });
  }

  onDelete() {
    this.openDialog();
  }

  openDialog() {
    const dialogRef: MatDialogRef<ConfirmDialogComponent> = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirmar Deleção',
        message: 'Você tem certeza que deseja <strong>deletar</strong> este registro?',
        confirmText: 'Sim, Deletar',
        cancelText: 'Não',
        icon: 'delete_forever',
        type: 'danger',
      },
    });

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

  get supplierControl(): FormGroup {
    return this.form.get('supplier') as FormGroup;
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
   * Mapeia os valores do frontend/FIPE para o Enum do backend
   */
  private mapFuelTypeToBackend(frontendValue: string | string[]): string[] {
    const valueToCheck = Array.isArray(frontendValue) ? frontendValue[0] : frontendValue;
    if (!valueToCheck) return [];

    const upperValue = valueToCheck.toUpperCase();

    // Mapeamento Direto (Nomes dos Enums do Backend)
    const directMatch = Object.keys(FuelTypes).find((key) => key === upperValue);
    if (directMatch) return [directMatch];

    // Mapeamento por Descrição (FIPE / Labels)
    if (upperValue.includes('ALCOOL/GASOLINA') || upperValue === 'FLEX' || upperValue === 'ALCOOL/GASOL') {
      return ['FLEX'];
    }
    if (
      upperValue === 'GASOLINA/ALCOOL/GAS NATURAL VEICULAR' ||
      (upperValue.includes('FLEX') && upperValue.includes('GNV'))
    ) {
      return ['FLEX_GNV'];
    }
    if (upperValue === 'GASOLINA/ELETRICO' || upperValue === 'HIBRIDO') {
      return ['HIBRIDO'];
    }
    if (upperValue === 'ALCOOL' || upperValue === 'ETANOL') return ['ALCOOL'];
    if (upperValue === 'GASOLINA') return ['GASOLINA'];
    if (upperValue === 'DIESEL') return ['DIESEL'];
    if (upperValue.includes('GNV') || upperValue.includes('GAS NATURAL VEICULAR')) return ['GNV'];
    if (upperValue.includes('ELETRICO')) return ['ELETRICO_FONTE_INTERNA'];

    // Fallback: Tenta normalizar e ver se bate com algum enum
    const normalized = valueToCheck
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/\s+/g, '_');

    const normalizedMatch = Object.keys(FuelTypes).find((key) => key === normalized);
    return normalizedMatch ? [normalizedMatch] : [];
  }

  protected formatDraftDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'agora mesmo';
    } else if (diffMins < 60) {
      return `há ${diffMins} min${diffMins > 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else if (diffDays < 7) {
      return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    } else {
      return new Date(date).toLocaleDateString('pt-BR');
    }
  }

  getSelectedOptionals(): { value: string; label: string }[] {
    const selectedIds = this.form.get('optionalIds')?.value || [];
    return this.optionalsOptions.filter((opt) => selectedIds.includes(opt.value));
  }

  removeOptional(optionalId: string) {
    const selectedIds = this.form.get('optionalIds')?.value || [];
    const newIds = selectedIds.filter((id: string) => id !== optionalId);
    this.form.get('optionalIds')?.setValue(newIds);
    this.form.get('optionalIds')?.markAsDirty();
  }

  onCreateNewOptional(newOptionalName: string) {
    if (newOptionalName && newOptionalName.trim()) {
      const payload = {
        name: newOptionalName.trim(),
        storeId: this.storeContextService.currentStoreId,
        isGlobal: false,
      };

      this.optionalService.create(payload).subscribe({
        next: (response) => {
          this.toastrService.success('Opcional adicionado com sucesso!');

          // Recarrega a lista de opcionais do backend
          this.optionalService.getAvailableOptionals().subscribe({
            next: (available) => {
              this.optionalsOptions = available.map((opt) => ({
                value: opt.optionalId,
                label: opt.name,
              }));

              // Seleciona automaticamente o opcional recém-criado
              const currentSelection = this.form.get('optionalIds')?.value || [];
              this.form.get('optionalIds')?.setValue([...currentSelection, response.optionalId]);
              this.form.get('optionalIds')?.markAsDirty();
            },
          });
        },
        error: (error) => {
          console.error('Erro ao criar opcional:', error);
          this.toastrService.error('Erro ao adicionar opcional. Tente novamente.');
        },
      });
    }
  }
}


