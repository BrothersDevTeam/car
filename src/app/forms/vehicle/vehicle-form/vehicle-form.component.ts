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
import { distinctUntilChanged, Subscription, of, Observable, forkJoin, catchError } from 'rxjs';

import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';
import { CustomSelectComponent, CustomSelectOption } from '@components/custom-select/custom-select.component';
import { PrimaryInputComponent } from '@components/primary-input/primary-input.component';
import { PrimarySelectComponent } from '@components/primary-select/primary-select.component';

import { VehicleForm, SPECIES_OPTIONS, CATEGORY_OPTIONS, VEHICLE_TYPE_OPTIONS } from '@interfaces/vehicle';
import { extractErrorMessage } from '@utils/error-utils';
import { FuelType, FuelTypeLabels } from '../../../enums/fuelType';

import { VehicleService } from '@services/vehicle.service';
import { BrandService } from '@services/brand.service';
import { ModelService } from '@services/model.service';
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

  brands: CustomSelectOption[] = [];
  models: CustomSelectOption[] = [];
  years: CustomSelectOption[] = []; // FIPE Years
  colors: CustomSelectOption[] = [];
  persons: CustomSelectOption[] = [];
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
  fuelTypeOptions: { value: string; label: string }[] = [];

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
  protected form: FormGroup = this.formBuilderService.group({
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
    fuelType: [''], // Tipo de Combustível (String)
    optionalIds: [[]], // Array de Opcionais (UUIDs)
    origin: ['NACIONAL'],
    valorVendaSugerido: [''],
    fipeValue: [''],
    observation: [''],
    entryDate: [''],
    exitDate: [''],
  });

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
    private brandService: BrandService,
    private modelService: ModelService,
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
      fuelType: '',
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

    const formFuel = normalize(formValue['fuelType']);
    const sourceFuel = normalize(source['fuelType']);
    if (formFuel !== sourceFuel) {
      return true;
    }

    const arrays = ['optionalIds'];
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
          fuelType: this.mapFuelTypeToBackend(formValues.fuelType),
          optionalIds: formValues.optionalIds || [],
          valorVendaSugerido: formValues.valorVendaSugerido?.toString() || '',
          fipeValue: formValues.fipeValue || '',
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
        fuelType: '',
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

    this.isFillingForm = true;

    if (draft.data) {
      this.form.patchValue(draft.data);

      const brandId = draft.data.brand?.id;
      const modelId = draft.data.model?.id;
      const fipeType = this.getFipeVehicleType();

      if (brandId) {
        this.loadingModels.set(true);
        this.fipeService.getModelos(fipeType, brandId).subscribe({
          next: (response) => {
            this.models = response.modelos.map((m) => ({
              id: m.codigo.toString(),
              name: m.nome,
            }));
            this.selectModelDisabled.set(false);
            this.loadingModels.set(false);

            if (modelId) {
              this.loadingYears.set(true);
              this.fipeService.getAnos(fipeType, brandId, modelId).subscribe({
                next: (yearsRes) => {
                  this.years = yearsRes.map((ano) => ({
                    id: ano.codigo,
                    name: ano.nome.replace('32000', 'Zero KM'),
                  }));
                  this.selectYearDisabled.set(false);
                  this.loadingYears.set(false);
                },
                error: () => {
                  this.loadingYears.set(false);
                },
              });
            }
          },
          error: () => {
            this.loadingModels.set(false);
          },
        });
      }
    }

    this.isFillingForm = false;
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
        fuelType: '',
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

  // Validador de formato UUID (marcas e modelos do banco da loja sempre usam UUID)
  private isUuid(id: string | null | undefined): boolean {
    if (!id) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  }

  // Métodos auxiliares para identificação de Marca/Modelo selecionados
  getSelectedBrand(): CustomSelectOption | undefined {
    const val = this.brandControl.value;
    if (!val) return undefined;
    const found =
      this.brands.find((b) => b.id === val.id) ||
      this.brands.find((b) => b.name?.trim().toLowerCase() === val.name?.trim().toLowerCase());

    if (!found && this.isUuid(val.id)) {
      return {
        id: val.id,
        name: val.name,
        isCustom: true,
      };
    }
    return found;
  }

  getSelectedModel(): CustomSelectOption | undefined {
    const val = this.modelControl.value;
    if (!val) return undefined;
    const found =
      this.models.find((m) => m.id === val.id) ||
      this.models.find((m) => m.name?.trim().toLowerCase() === val.name?.trim().toLowerCase());

    if (!found && this.isUuid(val.id)) {
      return {
        id: val.id,
        name: val.name,
        isCustom: true,
      };
    }
    return found;
  }

  get isCustomVehicle(): boolean {
    const brand = this.getSelectedBrand();
    const model = this.getSelectedModel();
    const brandId = this.brandControl.value?.id;
    const modelId = this.modelControl.value?.id;
    return !!(brand?.isCustom || model?.isCustom || this.isUuid(brandId) || this.isUuid(modelId));
  }

  get isFipeValueReadOnly(): boolean {
    if (this.isCustomVehicle) {
      return false;
    }
    const yearId = this.fipeYearControl.value?.id;
    if (!yearId || yearId === 'MANUAL') {
      return false;
    }
    return !!this.form.get('fipeValue')?.value;
  }

  getYearPlaceholder(): string {
    if (this.isCustomVehicle) {
      return 'Não se aplica a veículo personalizado';
    }
    if (this.loadingYears()) {
      return 'Carregando anos...';
    }
    if (this.selectYearDisabled()) {
      return 'Selecione um modelo primeiro';
    }
    return 'Selecione o ano/versão';
  }

  getModelPlaceholder(): string {
    if (this.loadingModels()) {
      return 'Carregando modelos...';
    }
    if (this.selectModelDisabled()) {
      return 'Selecione uma marca primeiro';
    }
    if (this.models.length === 0) {
      return 'Nenhum modelo cadastrado (clique em + para adicionar)';
    }
    return 'Selecione um modelo';
  }

  // Métodos de carregamento para serem chamados quando houver alteração
  loadBrands() {
    const fipeType = this.getFipeVehicleType();

    forkJoin({
      fipe: this.fipeService.getMarcas(fipeType).pipe(
        catchError((error) => {
          console.warn('FIPE getMarcas falhou ou está offline:', error);
          return of([]);
        }),
      ),
      store: this.brandService.getBrands().pipe(
        catchError((error) => {
          console.warn('Erro ao carregar marcas da loja:', error);
          return of({ content: [] } as any);
        }),
      ),
    }).subscribe({
      next: ({ fipe, store }) => {
        const fipeBrands: CustomSelectOption[] = (fipe || []).map((brand: any) => ({
          id: brand.codigo,
          name: brand.nome,
          isCustom: false,
        }));

        const storeBrands: CustomSelectOption[] = (store?.content || []).map((brand: any) => ({
          id: brand.brandId,
          name: brand.name,
          isCustom: true,
          raw: brand,
        }));

        this.brands = [...fipeBrands, ...storeBrands].sort((a, b) => a.name.localeCompare(b.name));
        this.brandsLoaded = true;
        this.tryFillFormOnEdit();
      },
      error: (error) => {
        console.error('Erro ao consolidar marcas:', error);
        this.brandsLoaded = true;
      },
    });
  }

  loadModels() {
    const brandValue = this.brandControl.value;
    const selectedBrand = this.getSelectedBrand();
    const brandId = brandValue?.id || selectedBrand?.id;
    const brandName = brandValue?.name || selectedBrand?.name;
    const fipeType = this.getFipeVehicleType();

    if (!brandId && !brandName) {
      this.models = [];
      this.selectModelDisabled.set(true);
      return;
    }

    this.loadingModels.set(true);
    this.models = [];

    const isStoreBrand = selectedBrand?.isCustom || this.isUuid(brandId);

    // Se a marca for exclusiva da loja (isCustom: true ou UUID), busca EXCLUSIVAMENTE na API do CAR
    if (isStoreBrand && brandId) {
      this.modelService
        .getModelsByBrand(brandId)
        .pipe(
          catchError((error) => {
            console.warn('Erro ao carregar modelos da loja para marca customizada:', error);
            return of({ content: [] } as any);
          }),
        )
        .subscribe({
          next: (response) => {
            this.models = (response?.content || [])
              .map((m: any) => ({
                id: m.modelId,
                name: m.name,
                isCustom: true,
                raw: m,
              }))
              .sort((a: any, b: any) => a.name.localeCompare(b.name));

            this.selectModelDisabled.set(false);
            this.loadingModels.set(false);
            this.handleSelectedModelOnEdit();
          },
          error: () => {
            this.models = [];
            this.selectModelDisabled.set(false);
            this.loadingModels.set(false);
          },
        });
      return;
    }

    // Se a marca for da FIPE (código numérico, ex: "21"):
    this.brandService
      .getBrands()
      .pipe(
        catchError(() => of({ content: [] } as any)),
      )
      .subscribe({
        next: (brandsRes) => {
          const matchingStoreBrand = brandsRes?.content?.find(
            (b: any) => b.name?.trim().toUpperCase() === brandName?.trim().toUpperCase(),
          );

          const storeModels$ = matchingStoreBrand
            ? this.modelService.getModelsByBrand(matchingStoreBrand.brandId).pipe(
                catchError((error) => {
                  console.warn('Erro ao carregar modelos locais da marca:', error);
                  return of({ content: [] } as any);
                }),
              )
            : of({ content: [] } as any);

          // NUNCA envia UUID para a API externa da FIPE
          const fipeModels$ = brandId && !this.isUuid(brandId)
            ? this.fipeService.getModelos(fipeType, brandId).pipe(
                catchError((error) => {
                  console.warn('FIPE getModelos falhou ou está offline:', error);
                  return of({ modelos: [], anos: [] });
                }),
              )
            : of({ modelos: [], anos: [] });

          forkJoin({
            fipe: fipeModels$,
            store: storeModels$,
          }).subscribe({
            next: ({ fipe, store }) => {
              const fipeModels: CustomSelectOption[] = (fipe?.modelos || []).map((model: any) => ({
                id: model.codigo.toString(),
                name: model.nome,
                isCustom: false,
              }));

              const storeModels: CustomSelectOption[] = (store?.content || []).map((m: any) => ({
                id: m.modelId,
                name: m.name,
                isCustom: true,
                raw: m,
              }));

              this.models = [...fipeModels, ...storeModels].sort((a, b) => a.name.localeCompare(b.name));
              this.selectModelDisabled.set(false);
              this.loadingModels.set(false);
              this.handleSelectedModelOnEdit();
            },
            error: (error) => {
              console.error('Erro ao consolidar modelos:', error);
              this.models = [];
              this.selectModelDisabled.set(false);
              this.loadingModels.set(false);
            },
          });
        },
      });
  }

  private handleSelectedModelOnEdit() {
    if (this.dataForm?.model) {
      const selectedModel = this.models.find(
        (m) => m.name.trim().toLowerCase() === this.dataForm!.model.trim().toLowerCase(),
      );
      if (selectedModel) {
        this.modelControl.patchValue({
          id: selectedModel.id,
          name: selectedModel.name,
        });
        if (!this.isCustomVehicle) {
          this.loadYears();
        }
      }
    }
    this.isInitializing = false;
    this.lastSavedDraftValue = this.form.getRawValue();
  }

  loadYears() {
    const selectedBrand = this.getSelectedBrand();
    const selectedModel = this.getSelectedModel();
    const brandId = this.brandControl.value?.id || selectedBrand?.id;
    const modelId = this.modelControl.value?.id || selectedModel?.id;
    const fipeType = this.getFipeVehicleType();

    // Se marca ou modelo for personalizado da loja, não carrega anos FIPE
    if (selectedBrand?.isCustom || selectedModel?.isCustom) {
      this.years = [];
      this.fipeYearControl.reset();
      this.selectYearDisabled.set(true);
      return;
    }

    if (!brandId || !modelId) {
      this.years = [];
      this.fipeYearControl.reset();
      this.selectYearDisabled.set(true);
      return;
    }

    this.loadingYears.set(true);
    this.fipeService
      .getAnos(fipeType, brandId, modelId)
      .pipe(
        catchError((error) => {
          console.warn('FIPE getAnos falhou ou está offline:', error);
          return of([]);
        }),
      )
      .subscribe({
        next: (response) => {
          const manualOption: CustomSelectOption = {
            id: 'MANUAL',
            name: '⚙️ Não encontrei meu ano/versão (Preencher manualmente, Ano de fabricação e Ano do Modelo)',
            isCustom: false,
          };

          const fipeYears: CustomSelectOption[] = (response || []).map((ano: any) => ({
            id: ano.codigo,
            name: ano.nome.replace('32000', 'Zero KM'),
            isCustom: false,
          }));

          this.years = [manualOption, ...fipeYears];
          this.selectYearDisabled.set(false);
          this.loadingYears.set(false);

          // Se estamos em edição, busca e pré-seleciona a opção FIPE correspondente ao ano
          const targetYear = (this.dataForm?.modelYear || this.dataForm?.vehicleYear || '').toString();
          if (targetYear) {
            const selectedYear = this.years.find(
              (y) => y.id.startsWith(targetYear) || y.name.includes(targetYear),
            );
            if (selectedYear) {
              this.fipeYearControl.patchValue(
                { id: selectedYear.id, name: selectedYear.name },
                { emitEvent: false },
              );
            }
          }
          this.isInitializing = false;
          this.lastSavedDraftValue = this.form.getRawValue();
        },
        error: (error) => {
          console.error('Erro ao carregar anos FIPE:', error);
          this.years = [
            {
              id: 'MANUAL',
              name: '⚙️ Não encontrei meu ano/versão (Preencher manualmente, Ano de fabricação e Ano do Modelo)',
              isCustom: false,
            },
          ];
          this.selectYearDisabled.set(false);
          this.loadingYears.set(false);
          this.isInitializing = false;
          this.lastSavedDraftValue = this.form.getRawValue();
        },
      });
  }

  loadVehicleDetails(showToast = true) {
    const selectedBrand = this.getSelectedBrand();
    const selectedModel = this.getSelectedModel();
    const brandId = this.brandControl.value?.id || selectedBrand?.id;
    const modelId = this.modelControl.value?.id || selectedModel?.id;
    const yearId = this.fipeYearControl.value?.id;
    const fipeType = this.getFipeVehicleType();

    if (this.isCustomVehicle || yearId === 'MANUAL') {
      return;
    }

    if (brandId && modelId && yearId) {
      this.loadingDetails.set(true);
      this.fipeService
        .getVehicleDetails(fipeType, brandId, modelId, yearId)
        .pipe(
          catchError((error) => {
            console.warn('Erro ao carregar detalhes FIPE:', error);
            return of(null);
          }),
        )
        .subscribe({
          next: (details) => {
            this.loadingDetails.set(false);
            if (!details) {
              return;
            }

            const fipeYear = details.AnoModelo === 32000 ? new Date().getFullYear() : details.AnoModelo;
            const engineDisplacementMatch = details.Modelo.match(/(\d+\.\d+)/);
            const extractedDisplacement = engineDisplacementMatch ? engineDisplacementMatch[0] : '';

            this.form.patchValue({
              vehicleYear: fipeYear,
              modelYear: fipeYear,
              engineDisplacement: extractedDisplacement,
              fuelType: this.mapFuelTypeToBackend(details.Combustivel),
              fipeValue: details.Valor,
            });

            console.log('Detalhes FIPE:', details);
            if (showToast) {
              this.toastrService.info(`Valor tabela FIPE: ${details.Valor}`, 'Dados FIPE carregados');
            }
          },
          error: (error) => {
            console.error('Erro ao carregar detalhes FIPE:', error);
            this.loadingDetails.set(false);
          },
        });
    }
  }

  refreshFipeValue() {
    if (this.isCustomVehicle) {
      this.toastrService.info('Veículo com marca ou modelo personalizado não possui consulta FIPE.');
      return;
    }

    const brandId = this.brandControl.value?.id;
    const modelId = this.modelControl.value?.id;
    const yearId = this.fipeYearControl.value?.id;

    if (!brandId || !modelId || !yearId || yearId === 'MANUAL') {
      this.toastrService.warning(
        'Selecione a marca, modelo e versão/ano da FIPE na aba Veículo para consultar a Tabela FIPE.',
        'Tabela FIPE',
      );
      return;
    }

    this.loadVehicleDetails(true);
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
    this.fuelTypeOptions = Object.keys(FuelType).map((key) => {
      const enumValue = FuelType[key as keyof typeof FuelType];
      return {
        value: key,
        label: FuelTypeLabels[enumValue],
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
        this.brandControl.reset({ id: '', name: '' });
        this.modelControl.reset({ id: '', name: '' });
        this.fipeYearControl.reset({ id: '', name: '' });
        this.models = [];
        this.years = [];

        // Recarrega marcas com o novo tipo
        this.loadBrands();
      }),
    );

    // Cascata: Marca -> Modelo
    this.subscriptions.add(
      this.brandControl.valueChanges
        .pipe(distinctUntilChanged((prev, curr) => prev?.id === curr?.id && prev?.name === curr?.name))
        .subscribe((brand) => {
          if (this.isFillingForm) return;
          if (brand && (brand.id || brand.name)) {
            this.models = [];
            this.modelControl.reset({ id: '', name: '' });
            this.fipeYearControl.reset({ id: '', name: '' });
            this.years = [];
            this.selectYearDisabled.set(true);
            this.loadModels();
          } else {
            this.models = [];
            this.years = [];
            this.modelControl.reset({ id: '', name: '' });
            this.fipeYearControl.reset({ id: '', name: '' });
            this.selectModelDisabled.set(true);
            this.selectYearDisabled.set(true);
          }
        }),
    );

    // Cascata: Modelo -> Ano
    this.subscriptions.add(
      this.modelControl.valueChanges
        .pipe(distinctUntilChanged((prev, curr) => prev?.id === curr?.id && prev?.name === curr?.name))
        .subscribe((model) => {
          if (this.isFillingForm) return;
          if (model && (model.id || model.name)) {
            this.fipeYearControl.reset({ id: '', name: '' });
            this.loadYears();
          } else {
            this.years = [];
            this.fipeYearControl.reset({ id: '', name: '' });
            this.selectYearDisabled.set(true);
          }
        }),
    );

    // Cascata: Ano -> Detalhes
    this.subscriptions.add(
      this.fipeYearControl.valueChanges
        .pipe(distinctUntilChanged((prev, curr) => prev?.id === curr?.id))
        .subscribe((year) => {
          if (year && year.id && year.id !== 'MANUAL') {
            this.loadVehicleDetails();
          } else if (year?.id === 'MANUAL') {
            this.toastrService.info('Preencha os dados do veículo manualmente nas abas correspondentes.');
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
      owner: {
        id: this.dataForm?.ownerId || '',
        name: this.dataForm?.ownerName || '',
      },
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
      fuelType: this.dataForm!.fuelType || '', // Tipo de combustível
      optionalIds: this.dataForm!.optionals ? this.dataForm!.optionals.map((opt) => opt.optionalId) : [], // Opcionais do veículo
      origin: this.dataForm!.origin || 'NACIONAL',
      valorVendaSugerido: this.dataForm!.valorVendaSugerido || '',
      fipeValue: this.dataForm!.fipeValue || '',
      observation: this.dataForm!.observation || '',
      entryDate: this.dataForm!.entryDate ? this.dataForm!.entryDate.toString().substring(0, 16) : '',
      exitDate: this.dataForm!.exitDate ? this.dataForm!.exitDate.toString().substring(0, 16) : '',
    });

    this.isFillingForm = false;

    // Marca que o formulário foi preenchido
    this.formFilled = true;

    // Se houver uma marca selecionada, carrega os modelos (híbrido loja + FIPE)
    if (selectedBrand && (selectedBrand.id || selectedBrand.name)) {
      this.loadModels();
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
  private mapFuelTypeToBackend(frontendValue: string | string[]): string {
    const valueToCheck = Array.isArray(frontendValue) ? frontendValue[0] : frontendValue;
    if (!valueToCheck) return '';

    const upperValue = valueToCheck.toUpperCase();

    // Mapeamento Direto (Nomes dos Enums do Backend)
    const directMatch = Object.keys(FuelType).find((key) => key === upperValue);
    if (directMatch) return directMatch;

    // Mapeamento por Descrição (FIPE / Labels)
    if (upperValue.includes('ALCOOL/GASOLINA') || upperValue === 'FLEX' || upperValue === 'ALCOOL/GASOL') {
      return 'FLEX';
    }
    if (
      upperValue === 'GASOLINA/ALCOOL/GAS NATURAL VEICULAR' ||
      (upperValue.includes('FLEX') && upperValue.includes('GNV'))
    ) {
      return 'FLEX_GNV';
    }
    if (upperValue === 'GASOLINA/ELETRICO' || upperValue === 'HIBRIDO') {
      return 'HIBRIDO';
    }
    if (upperValue === 'ALCOOL' || upperValue === 'ETANOL') return 'ALCOOL';
    if (upperValue === 'GASOLINA') return 'GASOLINA';
    if (upperValue === 'DIESEL') return 'DIESEL';
    if (upperValue.includes('GNV') || upperValue.includes('GAS NATURAL VEICULAR')) return 'GNV';
    if (upperValue.includes('ELETRICO')) return 'ELETRICO_FONTE_INTERNA';

    // Fallback: Tenta normalizar e ver se bate com algum enum
    const normalized = valueToCheck
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/\s+/g, '_');

    const normalizedMatch = Object.keys(FuelType).find((key) => key === normalized);
    return normalizedMatch ? normalizedMatch : '';
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
