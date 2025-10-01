import {
  Component,
  forwardRef,
  Input,
  HostListener,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RelationshipTypes } from '../../enums/relationshipTypes';
import { AuthService } from '@services/auth/auth.service';

export interface SelectOption {
  value: any;
  label: string;
}

@Component({
  selector: 'app-primary-select',
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PrimarySelectComponent),
      multi: true,
    },
  ],
  templateUrl: './primary-select.component.html',
  styleUrl: './primary-select.component.scss',
})
export class PrimarySelectComponent implements ControlValueAccessor, OnInit, OnChanges {
  @Input() placeholder: string = 'Selecione uma opção';
  @Input() label: string = '';
  @Input() inputName: string = '';
  @Input() error?: boolean = false;
  @Input() allowMultiple: boolean = false;
  @Input() options: any[] = [];
  @Input() optionValue: string = 'value'; // propriedade que contém o valor
  @Input() optionLabel: string | ((item: any) => string) = 'label'; // propriedade ou função que retorna o label

  value: any = null;
  isOpen: boolean = false;
  onChange: any = () => {};
  onTouched: any = () => {};

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.loadOptions();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Recarrega as opções quando houver mudanças nos inputs
    if (changes['options'] || changes['inputName']) {
      this.loadOptions();
    }
  }

  private loadOptions() {
    // Se não houver opções E o campo for relationshipTypes, carrega as opções do enum
    if (this.options.length === 0 && this.inputName === 'relationshipTypes') {
      this.options = this.getRelationshipTypeOptions();
    }
  }

  private getRelationshipTypeOptions(): SelectOption[] {
    const userRoles = this.authService.getRoles();
    const isCarAdmin = userRoles.includes('CAR_ADMIN');

    return Object.values(RelationshipTypes)
      .filter((value) => {
        if (value === RelationshipTypes.PROPRIETARIO && !isCarAdmin) {
          return false;
        }
        return true;
      })
      .map((value) => ({
        value: value,
        label: value,
      }));
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.onTouched();
    }
  }

  selectSingleOption(option: any) {
    // Extrai o valor correto baseado no optionValue
    const optionVal = this.getOptionValue(option);
    this.value = optionVal;
    this.onChange(this.value);
    this.isOpen = false;
  }

  toggleOption(option: any) {
    if (!this.allowMultiple) {
      this.selectSingleOption(option);
      return;
    }

    if (!Array.isArray(this.value)) {
      this.value = [];
    }

    const optionVal = this.getOptionValue(option);
    const index = this.value.indexOf(optionVal);
    
    if (index > -1) {
      this.value = this.value.filter((v: any) => v !== optionVal);
    } else {
      this.value = [...this.value, optionVal];
    }

    this.onChange(this.value);
  }

  isSelected(option: any): boolean {
    const optionVal = this.getOptionValue(option);
    
    if (this.allowMultiple && Array.isArray(this.value)) {
      return this.value.includes(optionVal);
    }
    return this.value === optionVal;
  }

  getDisplayValue(): string {
    if (!this.value) {
      return '';
    }

    if (this.allowMultiple && Array.isArray(this.value)) {
      if (this.value.length === 0) {
        return '';
      }

      const selectedLabels = this.value.map((val: any) => {
        const option = this.options.find(
          (opt) => this.getOptionValue(opt) === val
        );
        return option ? this.getOptionLabel(option) : val;
      });

      return selectedLabels.length > 1
        ? `${selectedLabels.length} itens selecionados`
        : selectedLabels[0];
    }

    const option = this.options.find(
      (opt) => this.getOptionValue(opt) === this.value
    );
    return option ? this.getOptionLabel(option) : this.value;
  }

  // Helper para extrair o valor de uma opção
  private getOptionValue(option: any): any {
    if (typeof option === 'object' && this.optionValue) {
      return option[this.optionValue];
    }
    return option.value !== undefined ? option.value : option;
  }

  // Helper para extrair o label de uma opção
  getOptionLabel(option: any): string {
    if (typeof this.optionLabel === 'function') {
      return this.optionLabel(option);
    }
    
    if (typeof option === 'object' && typeof this.optionLabel === 'string') {
      return option[this.optionLabel] || option.label || String(option);
    }
    
    return option.label !== undefined ? option.label : String(option);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.input-wrapper')) {
      this.isOpen = false;
    }
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    if (this.allowMultiple) {
      this.value = Array.isArray(value) ? value : [];
    } else {
      this.value = value;
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Implementar se necessário
  }
}
