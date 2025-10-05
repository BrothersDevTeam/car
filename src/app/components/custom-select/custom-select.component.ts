import {
  Component,
  HostListener,
  Input,
  OnChanges,
  OnInit,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';
import { BrandFormDialogComponent } from '@components/dialogs/brand-form-dialog/brand-form-dialog.component';
import { ModelFormDialogComponent } from '@components/dialogs/model-form-dialog/model-form-dialog.component';
import { CriateElementConfirmDialogComponent } from '@components/dialogs/criate-element-dialog/criate-element-dialog.component';

import { FuelTypeService } from '@services/fuel-type.service';
import { BrandService } from '@services/brand.service';
import { ModelService } from '@services/model.service';
import { ColorService } from '@services/color.service';

@Component({
  selector: 'app-custom-select',
  imports: [ReactiveFormsModule, FormsModule, MatIcon, MatTooltipModule],
  templateUrl: './custom-select.component.html',
  styleUrls: ['./custom-select.component.scss'],
})
export class CustomSelectComponent implements OnInit, OnChanges {
  @Input() label: string = 'Selecione uma opção';
  @Input() options: { id: string; name: string }[] = [];
  @Input() control!: FormControl | FormGroup;
  @Input() listType!: 'brand' | 'model' | 'colorDto' | 'fuelTypeDto';
  @Input() selectedBrand: { id: string; name: string } = { id: '', name: '' }; // Necessário para carregar modelos com base na marca selecionada
  @Input() matTooltip: string = '';
  @Input() placeholder: string = '';
  @Input() disabled: boolean = false;

  selectedOption: { id: string; name: string } | null = null;
  isOpen: boolean = false;
  searchTerm: string = '';
  filteredOptions: { id: string; name: string }[] = [];
  isLoading: boolean = false;

  private serviceMap: { [key: string]: any } = {};

  constructor(
    private brandService: BrandService,
    private modelService: ModelService,
    private colorService: ColorService,
    private fuelTypeService: FuelTypeService,
    private toastrService: ToastrService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.serviceMap = {
      brand: this.brandService,
      model: this.modelService,
      colorDto: this.colorService,
      fuelTypeDto: this.fuelTypeService,
    };
  }

  ngOnChanges(): void {
    if (this.options.length > 0) {
      this.filteredOptions = [...this.options];
      this.setSelectedOption();
    } else {
      setTimeout(() => {
        this.filteredOptions = [...this.options];
        this.setSelectedOption();
      }, 0);
    }
  }

  private setSelectedOption() {
    if (this.control instanceof FormControl && this.control.value) {
      this.selectedOption =
        this.options.find((option) => option.id === this.control.value.id) ||
        null;
    } else if (this.control instanceof FormGroup) {
      const value = this.control.value;
      if (value && value.id) {
        this.selectedOption =
          this.options.find((option) => option.id === value.id) || null;
      }
    }
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.searchTerm = '';
      this.filteredOptions = [...this.options];
    }
  }

  selectOption(option: { id: string; name: string }) {
    this.selectedOption = option;

    this.control.setValue({
      id: option.id,
      name: option.name,
    });

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
    colorDto: {
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
    fuelTypeDto: {
      create: 'Adicionar novo tipo de combustível',
      update: 'Editar tipo de combustível',
      delete: 'Deletar tipo de combustível',
      message: 'Digite o nome do tipo de combustível',
      deleteMessage:
        'Você tem certeza que deseja deletar este tipo de combustível?',
      successCreateMessage: 'Tipo de combustível adicionado com sucesso!',
      successUpdateMessage: 'Tipo de combustível editado com sucesso!',
      successDeleteMessage: 'Tipo de combustível deletado com sucesso!',
      errorMessage: 'Erro ao adicionar tipo de combustível. Tente novamente.',
    },
  };

  /**
   * Cria um novo item baseado no tipo (brand, model, color, fuelType)
   */
  createNewItem() {
    const service = this.serviceMap[this.listType];

    if (!service) {
      console.error(`Serviço não encontrado para o tipo: ${this.listType}`);
      return;
    }

    // Para Brand e Model, usar dialogs específicos
    if (this.listType === 'brand') {
      this.openBrandDialog('create');
    } else if (this.listType === 'model') {
      this.openModelDialog('create');
    } else {
      // Para Color e FuelType, usar dialog simples
      this.openSimpleDialog('create', service);
    }
  }

  /**
   * Edita um item existente
   */
  editItem(option: { id: string; name: string }, event: Event) {
    event.stopPropagation();

    const service = this.serviceMap[this.listType];

    if (!service) {
      console.error(`Serviço não encontrado para o tipo: ${this.listType}`);
      return;
    }

    // Para Brand e Model, precisamos buscar os dados completos
    if (this.listType === 'brand') {
      // Para brand, buscar dados completos
      this.loadFullBrandData(option.id).then((fullBrand) => {
        this.openBrandDialog('edit', fullBrand);
      });
    } else if (this.listType === 'model') {
      // Para model, buscar dados completos
      this.loadFullModelData(option.id).then((fullModel) => {
        this.openModelDialog('edit', fullModel);
      });
    } else {
      // Para Color e FuelType, usar dialog simples
      this.openSimpleDialog('edit', service, option);
    }
  }

  /**
   * Deleta um item
   */
  deleteItem(option: { id: string; name: string }, event: Event) {
    event.stopPropagation();

    const service = this.serviceMap[this.listType];

    if (!service) {
      console.error(`Serviço não encontrado para o tipo: ${this.listType}`);
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: this.typeListTexts[this.listType].delete + ` ${option.name}`,
        message: this.typeListTexts[this.listType].deleteMessage,
        confirmText: 'Deletar',
        cancelText: 'Cancelar',
      },
    });

    dialogRef.afterClosed().subscribe((confirm) => {
      if (confirm) {
        service.delete(option.id).subscribe({
          next: () => {
            this.options = this.options.filter((item) => item.id !== option.id);
            this.toastrService.success(
              this.typeListTexts[this.listType].successDeleteMessage
            );
          },
          error: (error: any) => {
            console.error('Erro ao deletar:', error);
            this.toastrService.error(
              `Erro ao deletar ${this.listType}. Tente novamente.`
            );
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
          mode === 'create'
            ? this.typeListTexts.brand.create
            : `${this.typeListTexts.brand.update}: ${option?.name}`,
        mode: mode,
        brand: mode === 'edit' ? option : undefined,
      },
    });

    dialogRef.afterClosed().subscribe((payload) => {
      if (payload) {
        if (mode === 'create') {
          this.brandService.create(payload).subscribe({
            next: (response: any) => {
              // Recarrega as marcas
              this.reloadBrands();
              this.toastrService.success(
                this.typeListTexts.brand.successCreateMessage
              );
            },
            error: (error: any) => {
              console.error('Erro ao criar marca:', error);
              this.toastrService.error(this.typeListTexts.brand.errorMessage);
            },
          });
        } else {
          this.brandService.update(payload).subscribe({
            next: (response: any) => {
              // Recarrega as marcas
              this.reloadBrands();
              this.toastrService.success(
                this.typeListTexts.brand.successUpdateMessage
              );
            },
            error: (error: any) => {
              console.error('Erro ao editar marca:', error);
              this.toastrService.error(
                'Erro ao editar marca. Tente novamente.'
              );
            },
          });
        }
      }
    });
  }

  /**
   * Abre o dialog específico para Model
   */
  private openModelDialog(mode: 'create' | 'edit', option?: any) {
    if (mode === 'create' && !this.selectedBrand) {
      this.toastrService.warning('Selecione uma marca primeiro!');
      return;
    }

    const dialogRef = this.dialog.open(ModelFormDialogComponent, {
      width: '650px',
      data: {
        title:
          mode === 'create'
            ? this.typeListTexts.model.create
            : `${this.typeListTexts.model.update}: ${option?.name}`,
        mode: mode,
        model: mode === 'edit' ? option : undefined,
        brandId: this.selectedBrand.id,
        brandName: this.options.find((o) => o.id === this.selectedBrand.id)
          ?.name,
      },
    });

    dialogRef.afterClosed().subscribe((payload) => {
      if (payload) {
        console.log('Payload do modelo:', payload);
        if (mode === 'create') {
          this.modelService.create(payload).subscribe({
            next: (response: any) => {
              // Recarrega os modelos
              this.reloadModels();
              this.toastrService.success(
                this.typeListTexts.model.successCreateMessage
              );
            },
            error: (error: any) => {
              console.error('Erro ao criar modelo:', error);
              this.toastrService.error(this.typeListTexts.model.errorMessage);
            },
          });
        } else {
          this.modelService.update(payload.modelId, payload).subscribe({
            next: (response: any) => {
              // Recarrega os modelos
              this.reloadModels();
              this.toastrService.success(
                this.typeListTexts.model.successUpdateMessage
              );
            },
            error: (error: any) => {
              console.error('Erro ao editar modelo:', error);
              this.toastrService.error(
                'Erro ao editar modelo. Tente novamente.'
              );
            },
          });
        }
      }
    });
  }

  /**
   * Abre o dialog simples para Color e FuelType
   */
  private openSimpleDialog(
    mode: 'create' | 'edit',
    service: any,
    option?: any
  ) {
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
          // Para criar cor
          const createPayload = this.listType === 'colorDto' 
            ? { name: inputValue } 
            : { description: inputValue };
          
          service.create(createPayload).subscribe({
            next: (response: any) => {
              // Adicionar cor à lista
              const newOption = {
                id: response.colorId || response.id,
                name: response.name || response.description
              };
              this.options.push(newOption);
              this.filteredOptions = [...this.options];
              this.toastrService.success(
                this.typeListTexts[this.listType].successCreateMessage
              );
            },
            error: (error: any) => {
              console.error('Erro ao criar:', error);
              this.toastrService.error(
                `Erro ao criar ${this.listType}. Tente novamente.`
              );
            },
          });
        } else {
          // Para editar cor
          const updatePayload = this.listType === 'colorDto'
            ? { colorId: option.id, name: inputValue }
            : { id: option.id, description: inputValue };
          
          if (this.listType === 'colorDto') {
            service.update(option.id, updatePayload).subscribe({
              next: (response: any) => {
                const index = this.options.findIndex((o) => o.id === option.id);
                if (index !== -1) {
                  this.options[index] = {
                    id: response.colorId,
                    name: response.name
                  };
                  this.filteredOptions = [...this.options];
                }
                this.toastrService.success(
                  this.typeListTexts[this.listType].successUpdateMessage
                );
              },
              error: (error: any) => {
                console.error('Erro ao editar:', error);
                this.toastrService.error(
                  `Erro ao editar ${this.listType}. Tente novamente.`
                );
              },
            });
          } else {
            service.update(updatePayload).subscribe({
              next: (response: any) => {
                const index = this.options.findIndex((o) => o.id === option.id);
                if (index !== -1) {
                  this.options[index] = {
                    id: response.id,
                    name: response.description
                  };
                  this.filteredOptions = [...this.options];
                }
                this.toastrService.success(
                  this.typeListTexts[this.listType].successUpdateMessage
                );
              },
              error: (error: any) => {
                console.error('Erro ao editar:', error);
                this.toastrService.error(
                  `Erro ao editar ${this.listType}. Tente novamente.`
                );
              },
            });
          }
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
        },
        error: (error) => {
          console.error('Erro ao recarregar modelos:', error);
        },
      });
    }
  }

  /**
   * Carrega dados completos de uma marca
   */
  private loadFullBrandData(brandId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.brandService.getBrands().subscribe({
        next: (response) => {
          const fullBrand = response.content.find((b: any) => b.brandId === brandId);
          if (fullBrand) {
            resolve(fullBrand);
          } else {
            reject('Marca não encontrada');
          }
        },
        error: (error) => {
          console.error('Erro ao carregar dados da marca:', error);
          reject(error);
        },
      });
    });
  }

  /**
   * Carrega dados completos de um modelo
   */
  private loadFullModelData(modelId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.selectedBrand?.id) {
        this.modelService.getModelsByBrand(this.selectedBrand.id).subscribe({
          next: (response) => {
            const fullModel = response.content.find((m: any) => m.modelId === modelId);
            if (fullModel) {
              resolve(fullModel);
            } else {
              reject('Modelo não encontrado');
            }
          },
          error: (error) => {
            console.error('Erro ao carregar dados do modelo:', error);
            reject(error);
          },
        });
      } else {
        reject('Nenhuma marca selecionada');
      }
    });
  }

  /**
   * Filtra opções baseado no termo de busca
   */
  onSearch(): void {
    const term = this.searchTerm.toLowerCase().trim();
    
    if (!term) {
      this.filteredOptions = [...this.options];
      return;
    }

    this.filteredOptions = this.options.filter(option =>
      option.name.toLowerCase().includes(term)
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
   * Fecha apenas se o mouse sair completamente do dropdown (incluindo campo de busca)
   */
  onMouseLeaveDropdown(event: MouseEvent): void {
    const target = event.relatedTarget as HTMLElement;
    const dropdown = (event.currentTarget as HTMLElement);
    
    // Verifica se o mouse está indo para dentro do próprio dropdown
    if (target && dropdown.contains(target)) {
      return; // Não fecha se o mouse está dentro do dropdown
    }
    
    // Fecha apenas se o mouse realmente saiu do dropdown
    this.closeDropdown();
  }
}
