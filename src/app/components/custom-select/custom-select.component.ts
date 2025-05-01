import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  Input,
  OnChanges,
  OnInit,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

import { CriateElementConfirmDialogComponent } from '@components/dialogs/criate-element-dialog/criate-element-dialog.component';

import { FuelTypeService } from '@services/fuel-type.service';
import { BrandService } from '@services/brand.service';
import { ModelService } from '@services/model.service';
import { ColorService } from '@services/color.service';

@Component({
  selector: 'app-custom-select',
  imports: [CommonModule, ReactiveFormsModule, MatIcon, MatTooltipModule],
  templateUrl: './custom-select.component.html',
  styleUrls: ['./custom-select.component.scss'],
})
export class CustomSelectComponent implements OnInit, OnChanges {
  @Input() label: string = 'Selecione uma opção';
  @Input() options: { id: string; description: string }[] = [];
  @Input() control!: FormControl | FormGroup;
  @Input() listType!: 'brandDto' | 'modelDto' | 'colorDto' | 'fuelTypeDto';
  @Input() selectedBrand: string = '';
  @Input() matTooltip: string = '';
  @Input() placeholder: string = '';
  @Input() disabled: boolean = false;

  selectedOption: { id: string; description: string } | null = null;
  isOpen: boolean = false;

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
      brandDto: this.brandService,
      modelDto: this.modelService,
      colorDto: this.colorService,
      fuelTypeDto: this.fuelTypeService,
    };
  }

  ngOnChanges(): void {
    if (this.options.length > 0) {
      this.setSelectedOption();
    } else {
      setTimeout(() => {
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
  }

  selectOption(option: { id: string; description: string }) {
    // this.selectedOption = { id: option.id, description: option.description };
    this.selectedOption = option;

    this.control.setValue({
      id: option.id,
      description: option.description,
    });

    this.isOpen = false;
  }

  editOption(option: { id: string; description: string }, event: Event) {
    event.stopPropagation(); // Evita que o clique feche o dropdown

    const service = this.serviceMap[this.listType];
    if (service) {
      service.update(option.id).subscribe({
        next: () => {
          this.toastrService.success('Edição realizada com sucesso!');
        },
        error: () => {
          this.toastrService.error('Erro ao editar. Tente novamente.');
        },
      });
    } else {
      console.error(
        `Nenhum serviço configurado para o tipo de lista: ${this.listType}`
      );
    }
  }

  closeDropdown() {
    this.isOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    const isInsideDropdown = target.closest('.custom-dropdown');
    if (!isInsideDropdown) {
      this.closeDropdown(); // Fecha o menu se o clique for fora do dropdown
    }
  }

  typeListTexts = {
    brandDto: {
      title: 'Adicionar nova marca',
      message: 'Digite o nome da marca',
      successMessage: 'Marca adicionada com sucesso!',
      errorMessage: 'Erro ao adicionar marca. Tente novamente.',
    },
    modelDto: {
      title: 'Adicionar novo modelo',
      message: 'Digite o nome do modelo',
      successMessage: 'Modelo adicionado com sucesso!',
      errorMessage: 'Erro ao adicionar modelo. Tente novamente.',
    },
    colorDto: {
      title: 'Adicionar nova cor',
      message: 'Digite o nome da cor',
      successMessage: 'Cor adicionada com sucesso!',
      errorMessage: 'Erro ao adicionar cor. Tente novamente.',
    },
    fuelTypeDto: {
      title: 'Adicionar novo tipo de combustível',
      message: 'Digite o nome do tipo de combustível',
      successMessage: 'Tipo de combustível adicionado com sucesso!',
      errorMessage: 'Erro ao adicionar tipo de combustível. Tente novamente.',
    },
  };

  createNewItem() {
    const service = this.serviceMap[this.listType];

    if (service) {
      const dialogRef = this.dialog.open(CriateElementConfirmDialogComponent, {
        width: '400px',
        data: {
          title: this.typeListTexts[this.listType].title,
          message: this.typeListTexts[this.listType].message,
          confirmText: 'Salvar',
          cancelText: 'Cancelar',
        },
      });

      dialogRef.afterClosed().subscribe((newItem) => {
        if (newItem) {
          let payload: any = { description: newItem };
          if (this.listType === 'modelDto') {
            if (this.selectedBrand) {
              payload = {
                ...payload,
                brandDto: this.selectedBrand,
              };
            }
          }

          service.create(payload).subscribe({
            next: (response: { id: string; description: string }) => {
              this.options.push(response);
              this.toastrService.success(
                this.typeListTexts[this.listType].successMessage
              );
            },
            error: () => {
              this.toastrService.error(
                `Erro ao criar ${this.listType}. Tente novamente.`
              );
            },
          });
        }
      });
    } else {
      console.error(`Serviço não encontrado para o tipo: ${this.listType}`);
    }
  }
}
