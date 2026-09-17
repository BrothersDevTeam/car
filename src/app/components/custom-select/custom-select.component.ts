import {
  Component,
  HostListener,
  HostBinding,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  OnInit,
  OnDestroy,
  SimpleChanges,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

import { Subscription, firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';
import { BrandFormDialogComponent } from '@components/dialogs/brand-form-dialog/brand-form-dialog.component';
import { ModelFormDialogComponent } from '@components/dialogs/model-form-dialog/model-form-dialog.component';
import { ColorFormDialogComponent } from '@components/dialogs/color-form-dialog/color-form-dialog.component';
import { CriateElementConfirmDialogComponent } from '@components/dialogs/criate-element-dialog/criate-element-dialog.component';

import { BrandService } from '@services/brand.service';
import { ModelService } from '@services/model.service';
import { ColorService } from '@services/color.service';
import { PersonService } from '@services/person.service';
import { VehicleService } from '@services/vehicle.service';
import { FinancialCategoryService } from '@services/financial-category.service';

export interface CustomSelectOption {
  id: string;
  name: string;
  isCustom?: boolean;
  raw?: any;
}

@Component({
  selector: 'app-custom-select',
  imports: [ReactiveFormsModule, FormsModule, MatIcon, MatTooltipModule],
  templateUrl: './custom-select.component.html',
  styleUrls: ['./custom-select.component.scss'],
})
export class CustomSelectComponent implements OnInit, OnChanges, OnDestroy {
  @Input() label: string = 'Selecione uma opção';
  @Input() options: CustomSelectOption[] = [];
  @Input() control!: FormControl | FormGroup;
  @Input() listType!: 'brand' | 'model' | 'color' | 'person' | 'vehicle' | 'financial_category';
  @Input() selectedBrand: { id: string; name: string } = { id: '', name: '' };
  @Input() matTooltip: string = '';
  @Input() placeholder: string = '';
  @Input() disabled: boolean = false;
  @Input() showAddButton: boolean = true;
  @Output() onCreateNew = new EventEmitter<void>();
  @Output() onEdit = new EventEmitter<string>(); // Emite o ID da pessoa a editar
  @Output() onDelete = new EventEmitter<string>(); // Emite o ID do item excluído
  @Output() itemChanged = new EventEmitter<void>(); // Notifica que um item foi criado/editado/deletado
  @Output() optionSelected = new EventEmitter<any>();
  @Input() error: boolean = false;

  selectedOption: CustomSelectOption | null = null;
  isOpen: boolean = false;

  @HostBinding('class.dropdown-open')
  get isDropdownOpen(): boolean {
    return this.isOpen;
  }

  searchTerm: string = '';
  filteredOptions: CustomSelectOption[] = [];
  isLoading: boolean = false;

  @ViewChild('searchInput') searchInput!: ElementRef;

  private serviceMap: { [key: string]: any } = {};
  private valueSub?: Subscription;

  constructor(
    private brandService: BrandService,
    private modelService: ModelService,
    private colorService: ColorService,
    private personService: PersonService,
    private vehicleService: VehicleService,
    private financialCategoryService: FinancialCategoryService,
    private toastrService: ToastrService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private elementRef: ElementRef,
  ) {}

  ngOnInit() {
    this.serviceMap = {
      brand: this.brandService,
      model: this.modelService,
      color: this.colorService,
      person: this.personService,
      vehicle: this.vehicleService,
      financial_category: this.financialCategoryService,
    };

    if (this.control) {
      this.valueSub = this.control.valueChanges.subscribe(() => {
        this.setSelectedOption();
        this.cdr.detectChanges();
      });
    }
  }

  ngOnDestroy() {
    if (this.valueSub) {
      this.valueSub.unsubscribe();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['control']) {
      if (this.valueSub) {
        this.valueSub.unsubscribe();
      }
      if (this.control) {
        this.valueSub = this.control.valueChanges.subscribe(() => {
          this.setSelectedOption();
          this.cdr.detectChanges();
        });
      }
    }

    this.filteredOptions = [...this.options];
    this.setSelectedOption();
    this.cdr.detectChanges();
  }

  private setSelectedOption() {
    if (!this.control) {
      this.selectedOption = null;
      return;
    }

    if (this.control instanceof FormControl) {
      if (!this.control.value) {
        this.selectedOption = null;
      } else {
        const val = this.control.value;
        const targetId = typeof val === 'object' ? val.id : val;
        this.selectedOption = this.options.find((option) => option.id === targetId) || null;
      }
      this.cdr.detectChanges();
      return;
    }

    if (this.control instanceof FormGroup) {
      const value = this.control.value;
      const hasId = value?.id !== null && value?.id !== undefined && value?.id !== '';
      const hasName = value?.name !== null && value?.name !== undefined && value?.name !== '';

      // Se o valor está vazio (id e name vazios ou nulos), limpa a seleção
      if (!value || (!hasId && !hasName)) {
        this.selectedOption = null;
        this.cdr.detectChanges();
        return;
      }

      if (hasId) {
        const found = this.options.find((option) => option.id === value.id);
        this.selectedOption = found || (hasName ? { id: value.id, name: value.name } : null);
      } else if (hasName) {
        // Se só tem name, busca pelo name
        const found = this.options.find((option) => option.name === value.name);
        this.selectedOption = found || { id: '', name: value.name };
      } else {
        this.selectedOption = null;
      }

      this.cdr.detectChanges();

      // Log final
      if (this.selectedOption) {
        console.log(`[${this.listType}] ✅ selectedOption SETADO:`, this.selectedOption);
      }
    }
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.searchTerm = '';
      this.filteredOptions = [...this.options];
      setTimeout(() => {
        if (this.searchInput) {
          this.searchInput.nativeElement.focus();
        }
      }, 100);

      // Rola suavemente para garantir que o dropdown e o respiro fiquem visíveis na tela
      // Aguarda 320ms para a animação do scaleY do menu se completar
      setTimeout(() => {
        const dropdownElement = this.elementRef.nativeElement.querySelector('.dropdown-menu');
        if (dropdownElement) {
          dropdownElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
        }
      }, 320);
    }
  }

  selectOption(option: CustomSelectOption) {
    this.selectedOption = option;

    this.control.setValue({
      id: option.id,
      name: option.name,
    });

    this.optionSelected.emit(option);
    this.isOpen = false;
  }

  closeDropdown() {
    this.isOpen = false;
    this.searchTerm = '';
    this.filteredOptions = [...this.options];
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    const isInsideDropdown = target.closest('.custom-dropdown');
    if (!isInsideDropdown) {
      this.closeDropdown();
    }
  }

  typeListTexts = {
    person: {
      create: 'Adicionar novo proprietário',
      update: 'Editar proprietário',
      delete: 'Deletar proprietário',
      message: 'Digite o nome do proprietário',
      deleteMessage: 'Você tem certeza que deseja deletar este proprietário?',
      successCreateMessage: 'Proprietário adicionado com sucesso!',
      successUpdateMessage: 'Proprietário editado com sucesso!',
      successDeleteMessage: 'Proprietário deletado com sucesso!',
      errorMessage: 'Erro ao adicionar proprietário. Tente novamente.',
    },
    brand: {
      create: 'Adicionar nova marca',
      update: 'Editar marca',
      delete: 'Deletar marca',
      message: 'Digite o nome da marca',
      deleteMessage: 'Você tem certeza que deseja deletar esta marca?',
      successCreateMessage: 'Marca adicionada com sucesso!',
      successUpdateMessage: 'Marca editada com sucesso!',
      successDeleteMessage: 'Marca deletada com sucesso!',
      errorMessage: 'Erro ao adicionar marca. Tente novamente.',
    },
    model: {
      create: 'Adicionar novo modelo',
      update: 'Editar modelo',
      delete: 'Deletar modelo',
      message: 'Digite o nome do modelo',
      deleteMessage: 'Você tem certeza que deseja deletar este modelo?',
      successCreateMessage: 'Modelo adicionado com sucesso!',
      successUpdateMessage: 'Modelo editado com sucesso!',
      successDeleteMessage: 'Modelo deletado com sucesso!',
      errorMessage: 'Erro ao adicionar modelo. Tente novamente.',
    },
    color: {
      create: 'Adicionar nova cor',
      update: 'Editar cor',
      delete: 'Deletar cor',
      message: 'Digite o nome da cor',
      deleteMessage: 'Você tem certeza que deseja deletar esta cor?',
      successCreateMessage: 'Cor adicionada com sucesso!',
      successUpdateMessage: 'Cor editada com sucesso!',
      successDeleteMessage: 'Cor deletada com sucesso!',
      errorMessage: 'Erro ao adicionar cor. Tente novamente.',
    },
    vehicle: {
      create: 'Adicionar novo veículo',
      update: 'Editar veículo',
      delete: 'Deletar veículo',
      message: 'Digite a placa do veículo',
      deleteMessage: 'Você tem certeza que deseja deletar este veículo?',
      successCreateMessage: 'Veículo adicionado com sucesso!',
      successUpdateMessage: 'Veículo editado com sucesso!',
      successDeleteMessage: 'Veículo deletado com sucesso!',
      errorMessage: 'Erro ao adicionar veículo. Tente novamente.',
    },
    financial_category: {
      create: 'Adicionar nova Categoria Financeira',
      update: 'Editar Categoria Financeira',
      delete: 'Deletar Categoria Financeira',
      message: 'Digite o nome da Categoria Financeira',
      deleteMessage: 'Você tem certeza que deseja deletar esta Categoria Financeira?',
      successCreateMessage: 'Categoria Financeira adicionada com sucesso!',
      successUpdateMessage: 'Categoria Financeira editada com sucesso!',
      successDeleteMessage: 'Categoria Financeira deletada com sucesso!',
      errorMessage: 'Erro ao adicionar Categoria Financeira. Tente novamente.',
    },
  };

  /**
   * Cria um novo item baseado no tipo (brand, model, color, person)
   */
  createNewItem() {
    const service = this.serviceMap[this.listType];

    if (!service) {
      console.error(`Serviço não encontrado para o tipo: ${this.listType}`);
      return;
    }

    // Para person e vehicle, emite evento para o componente pai abrir o drawer/página
    if (this.listType === 'person' || this.listType === 'vehicle') {
      this.onCreateNew.emit();
      this.closeDropdown();
      return;
    }

    // Para Brand, Model e Color, usar dialogs específicos
    if (this.listType === 'brand') {
      this.openBrandDialog('create');
    } else if (this.listType === 'model') {
      this.openModelDialog('create');
    } else if (this.listType === 'color') {
      this.openColorDialog('create');
    } else {
      this.openSimpleDialog('create', service);
    }
  }

  /**
   * Edita um item existente
   */
  editItem(option: CustomSelectOption, event: Event) {
    event.stopPropagation();

    // Apenas itens customizados da loja (ou color/person) podem ser editados
    if ((this.listType === 'brand' || this.listType === 'model') && !option.isCustom) {
      return;
    }

    const service = this.serviceMap[this.listType];

    if (!service) {
      console.error(`Serviço não encontrado para o tipo: ${this.listType}`);
      return;
    }

    // Para person e vehicle, emite evento para o componente pai abrir o drawer/página
    if (this.listType === 'person' || this.listType === 'vehicle') {
      this.onEdit.emit(option.id);
      this.closeDropdown();
      return;
    }

    // Para Brand, Model e Color, precisamos buscar os dados completos
    if (this.listType === 'brand') {
      this.loadFullBrandData(option.id).then((fullBrand) => {
        this.openBrandDialog('edit', fullBrand);
      });
    } else if (this.listType === 'model') {
      this.loadFullModelData(option.id).then((fullModel) => {
        this.openModelDialog('edit', fullModel);
      });
    } else if (this.listType === 'color') {
      this.loadFullColorData(option.id).then((fullColor) => {
        this.openColorDialog('edit', fullColor);
      });
    } else {
      this.openSimpleDialog('edit', service, option);
    }
  }

  /**
   * Exclui um item existente (apenas itens personalizados da loja)
   */
  deleteItem(option: CustomSelectOption, event: Event) {
    event.stopPropagation();

    const service = this.serviceMap[this.listType];
    if (!service) {
      console.error(`Serviço não encontrado para o tipo: ${this.listType}`);
      return;
    }

    const itemLabel = this.listType === 'brand' ? 'a marca' : this.listType === 'model' ? 'o modelo' : 'este item';

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirmar Exclusão',
        message: `Tem certeza que deseja excluir ${itemLabel} <strong>${option.name}</strong>?`,
        confirmText: 'Sim, Excluir',
        cancelText: 'Cancelar',
        icon: 'delete_forever',
        type: 'danger',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        service.delete(option.id).subscribe({
          next: () => {
            this.toastrService.success(`${option.name} excluído com sucesso!`);
            if (this.selectedOption?.id === option.id) {
              this.selectedOption = null;
              if (this.control instanceof FormControl) {
                this.control.reset();
              } else if (this.control instanceof FormGroup) {
                this.control.reset({ id: '', name: '' });
              }
            }
            this.onDelete.emit(option.id);
            this.itemChanged.emit();
          },
          error: (error: any) => {
            console.error(`Erro ao excluir ${this.listType}:`, error);
            this.toastrService.error(`Erro ao excluir ${option.name}. Pode estar vinculado a outros registros.`);
          },
        });
      }
    });
  }

  /**
   * Abre o dialog específico para Brand
   */
  private openBrandDialog(mode: 'create' | 'edit', option?: any) {
    const dialogRef = this.dialog.open(BrandFormDialogComponent, {
      width: '600px',
      data: {
        title:
          mode === 'create' ? this.typeListTexts.brand.create : `${this.typeListTexts.brand.update}: ${option?.name}`,
        mode: mode,
        brand: mode === 'edit' ? option : undefined,
      },
    });

    dialogRef.afterClosed().subscribe((payload) => {
      if (payload) {
        if (mode === 'create') {
          this.brandService.create(payload).subscribe({
            next: (response: any) => {
              this.toastrService.success(this.typeListTexts.brand.successCreateMessage);
              const newOption: CustomSelectOption = {
                id: response.brandId || response.id,
                name: response.name,
                isCustom: true,
                raw: response,
              };
              this.options.push(newOption);
              this.filteredOptions = [...this.options];
              this.selectOption(newOption);
              this.itemChanged.emit();
            },
            error: (error: any) => {
              console.error('Erro ao criar marca:', error);
              this.toastrService.error(this.typeListTexts.brand.errorMessage);
            },
          });
        } else {
          this.brandService.update(payload).subscribe({
            next: (response: any) => {
              this.toastrService.success(this.typeListTexts.brand.successUpdateMessage);
              this.itemChanged.emit();
            },
            error: (error: any) => {
              console.error('Erro ao editar marca:', error);
              this.toastrService.error('Erro ao editar marca. Tente novamente.');
            },
          });
        }
      }
    });
  }

  /**
   * Garante que uma marca exista no banco de dados local da loja para obter um UUID válido
   */
  private async ensureBrandInDatabase(brandName: string): Promise<string> {
    const response = await firstValueFrom(this.brandService.getBrands());
    const existing = response?.content?.find(
      (b) => b.name?.trim().toUpperCase() === brandName?.trim().toUpperCase(),
    );
    if (existing) {
      return existing.brandId;
    }

    const created = await firstValueFrom(
      this.brandService.create({
        name: brandName.trim().toUpperCase(),
        isGlobal: false,
        storeId: null,
      }),
    );
    return created.brandId;
  }

  /**
   * Abre o dialog específico para Model
   */
  private async openModelDialog(mode: 'create' | 'edit', option?: any) {
    if (mode === 'create' && !this.selectedBrand?.id && !this.selectedBrand?.name) {
      this.toastrService.warning('Selecione uma marca primeiro!');
      return;
    }

    const brandName = this.selectedBrand?.name || this.options.find((o) => o.id === this.selectedBrand?.id)?.name || '';

    let effectiveBrandId = this.selectedBrand?.id;

    if (mode === 'create') {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(effectiveBrandId || '');
      if (!isUuid) {
        if (!brandName) {
          this.toastrService.warning('Selecione uma marca primeiro!');
          return;
        }
        try {
          this.isLoading = true;
          effectiveBrandId = await this.ensureBrandInDatabase(brandName);
        } catch (error) {
          console.error('Erro ao sincronizar marca localmente:', error);
          this.toastrService.error('Erro ao vincular marca no sistema. Tente novamente.');
          return;
        } finally {
          this.isLoading = false;
        }
      }
    }

    const dialogRef = this.dialog.open(ModelFormDialogComponent, {
      width: '650px',
      data: {
        title:
          mode === 'create' ? this.typeListTexts.model.create : `${this.typeListTexts.model.update}: ${option?.name}`,
        mode: mode,
        model: mode === 'edit' ? option : undefined,
        brandId: effectiveBrandId,
        brandName: brandName,
      },
    });

    dialogRef.afterClosed().subscribe((payload) => {
      if (payload) {
        console.log('Payload do modelo:', payload);
        if (mode === 'create') {
          this.modelService.create(payload).subscribe({
            next: (response: any) => {
              this.toastrService.success(this.typeListTexts.model.successCreateMessage);
              const newOption: CustomSelectOption = {
                id: response.modelId || response.id,
                name: response.name,
                isCustom: true,
                raw: response,
              };
              this.selectOption(newOption);
              this.itemChanged.emit();
            },
            error: (error: any) => {
              console.error('Erro ao criar modelo:', error);
              this.toastrService.error(this.typeListTexts.model.errorMessage);
            },
          });
        } else {
          this.modelService.update(payload.modelId, payload).subscribe({
            next: (response: any) => {
              this.toastrService.success(this.typeListTexts.model.successUpdateMessage);
              this.itemChanged.emit();
            },
            error: (error: any) => {
              console.error('Erro ao editar modelo:', error);
              this.toastrService.error('Erro ao editar modelo. Tente novamente.');
            },
          });
        }
      }
    });
  }

  /**
   * Abre o dialog específico para Color
   */
  private openColorDialog(mode: 'create' | 'edit', option?: any) {
    const dialogRef = this.dialog.open(ColorFormDialogComponent, {
      width: '600px',
      data: {
        title:
          mode === 'create' ? this.typeListTexts.color.create : `${this.typeListTexts.color.update}: ${option?.name}`,
        mode: mode,
        color: mode === 'edit' ? option : undefined,
      },
    });

    dialogRef.afterClosed().subscribe((payload) => {
      if (payload) {
        console.log('Color payload:', payload);
        if (mode === 'create') {
          this.colorService.create(payload).subscribe({
            next: (response: any) => {
              this.reloadColors();
              this.toastrService.success(this.typeListTexts.color.successCreateMessage);
            },
            error: (error: any) => {
              console.error('Erro ao criar cor:', error);
              this.toastrService.error(this.typeListTexts.color.errorMessage);
            },
          });
        } else {
          this.colorService.update(payload.colorId, payload).subscribe({
            next: (response: any) => {
              this.reloadColors();
              this.toastrService.success(this.typeListTexts.color.successUpdateMessage);
            },
            error: (error: any) => {
              console.error('Erro ao editar cor:', error);
              this.toastrService.error('Erro ao editar cor. Tente novamente.');
            },
          });
        }
      }
    });
  }

  /**
   * Abre o dialog simples para FuelType
   */
  private openSimpleDialog(mode: 'create' | 'edit', service: any, option?: any) {
    const dialogRef = this.dialog.open(CriateElementConfirmDialogComponent, {
      width: '400px',
      data: {
        title:
          mode === 'create'
            ? this.typeListTexts[this.listType].create
            : `${this.typeListTexts[this.listType].update}: ${option?.name}`,
        message: this.typeListTexts[this.listType].message,
        confirmText: 'Salvar',
        cancelText: 'Cancelar',
      },
    });

    dialogRef.afterClosed().subscribe((inputValue) => {
      if (inputValue) {
        if (mode === 'create') {
          const createPayload = { description: inputValue };

          service.create(createPayload).subscribe({
            next: (response: any) => {
              const newOption = {
                id: response.id,
                name: response.description,
              };
              this.options.push(newOption);
              this.filteredOptions = [...this.options];
              this.toastrService.success(this.typeListTexts[this.listType].successCreateMessage);
              this.itemChanged.emit();
            },
            error: (error: any) => {
              console.error('Erro ao criar:', error);
              this.toastrService.error(`Erro ao criar ${this.listType}. Tente novamente.`);
            },
          });
        } else {
          const updatePayload = { id: option.id, description: inputValue };

          service.update(updatePayload).subscribe({
            next: (response: any) => {
              const index = this.options.findIndex((o) => o.id === option.id);
              if (index !== -1) {
                this.options[index] = {
                  id: response.id,
                  name: response.description,
                };
                this.filteredOptions = [...this.options];
              }
              this.toastrService.success(this.typeListTexts[this.listType].successUpdateMessage);
              this.itemChanged.emit();
            },
            error: (error: any) => {
              console.error('Erro ao editar:', error);
              this.toastrService.error(`Erro ao editar ${this.listType}. Tente novamente.`);
            },
          });
        }
      }
    });
  }

  /**
   * Recarrega a lista de marcas
   */
  private reloadBrands() {
    this.brandService.getBrands().subscribe({
      next: (response) => {
        this.options = response.content.map((brand: any) => ({
          id: brand.brandId,
          name: brand.name,
        }));
        this.filteredOptions = [...this.options];
        this.itemChanged.emit();
      },
      error: (error) => {
        console.error('Erro ao recarregar marcas:', error);
      },
    });
  }

  /**
   * Recarrega a lista de modelos
   */
  private reloadModels() {
    if (this.selectedBrand) {
      this.modelService.getModelsByBrand(this.selectedBrand.id).subscribe({
        next: (response) => {
          this.options = response.content.map((model: any) => ({
            id: model.modelId,
            name: model.name,
          }));
          this.filteredOptions = [...this.options];
          this.itemChanged.emit();
        },
        error: (error) => {
          console.error('Erro ao recarregar modelos:', error);
        },
      });
    }
  }

  /**
   * Recarrega a lista de cores
   */
  private reloadColors() {
    this.colorService.getColors().subscribe({
      next: (response) => {
        this.options = response.content.map((color: any) => ({
          id: color.colorId,
          name: color.name,
        }));
        this.filteredOptions = [...this.options];
        this.itemChanged.emit();
      },
      error: (error) => {
        console.error('Erro ao recarregar cores:', error);
      },
    });
  }

  /**
   * Carrega dados completos de uma marca
   */
  private loadFullBrandData(brandId: string): Promise<any> {
    const foundOpt = this.options.find((o) => o.id === brandId);
    if (foundOpt?.raw) {
      return Promise.resolve(foundOpt.raw);
    }
    return new Promise((resolve, reject) => {
      this.brandService.getBrands().subscribe({
        next: (response) => {
          const fullBrand = response.content.find((b: any) => b.brandId === brandId);
          if (fullBrand) {
            resolve(fullBrand);
          } else {
            resolve({ brandId, name: foundOpt?.name || '' });
          }
        },
        error: (error) => {
          console.error('Erro ao carregar dados da marca:', error);
          resolve({ brandId, name: foundOpt?.name || '' });
        },
      });
    });
  }

  /**
   * Carrega dados completos de um modelo
   */
  private loadFullModelData(modelId: string): Promise<any> {
    const foundOpt = this.options.find((o) => o.id === modelId);
    if (foundOpt?.raw) {
      return Promise.resolve(foundOpt.raw);
    }
    return new Promise((resolve, reject) => {
      if (this.selectedBrand?.id) {
        this.modelService.getModelsByBrand(this.selectedBrand.id).subscribe({
          next: (response) => {
            const fullModel = response.content.find((m: any) => m.modelId === modelId);
            if (fullModel) {
              resolve(fullModel);
            } else {
              resolve({ modelId, name: foundOpt?.name || '', brandId: this.selectedBrand.id });
            }
          },
          error: (error) => {
            console.error('Erro ao carregar dados do modelo:', error);
            resolve({ modelId, name: foundOpt?.name || '', brandId: this.selectedBrand.id });
          },
        });
      } else {
        resolve({ modelId, name: foundOpt?.name || '' });
      }
    });
  }

  /**
   * Carrega dados completos de uma cor
   */
  private loadFullColorData(colorId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.colorService.getColors().subscribe({
        next: (response) => {
          const fullColor = response.content.find((c: any) => c.colorId === colorId);
          if (fullColor) {
            resolve(fullColor);
          } else {
            reject('Cor não encontrada');
          }
        },
        error: (error) => {
          console.error('Erro ao carregar dados da cor:', error);
          reject(error);
        },
      });
    });
  }

  /**
   * Remove acentos de uma string para busca insensível a diacríticos
   */
  private removeAccents(str: string): string {
    return str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';
  }

  /**
   * Filtra opções baseado no termo de busca
   */
  onSearch(): void {
    const term = this.removeAccents(this.searchTerm.toLowerCase().trim());

    if (!term) {
      this.filteredOptions = [...this.options];
      return;
    }

    this.filteredOptions = this.options.filter((option) =>
      this.removeAccents(option.name.toLowerCase()).includes(term),
    );
  }

  /**
   * Limpa o campo de busca
   */
  clearSearch(): void {
    this.searchTerm = '';
    this.filteredOptions = [...this.options];
  }

  /**
   * Controla o fechamento do dropdown ao sair com o mouse
   */
  onMouseLeaveDropdown(event: MouseEvent): void {
    const target = event.relatedTarget as HTMLElement;
    const dropdown = event.currentTarget as HTMLElement;

    if (target && dropdown.contains(target)) {
      return;
    }

    this.closeDropdown();
  }
}
