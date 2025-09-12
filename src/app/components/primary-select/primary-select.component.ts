import {
  Component,
  forwardRef,
  Input,
  HostListener,
  OnInit,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RelationshipTypes } from '@interfaces/person';

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
export class PrimarySelectComponent implements ControlValueAccessor, OnInit {
  @Input() placeholder: string = 'Selecione uma opção';
  @Input() label: string = '';
  @Input() inputName: string = '';
  @Input() error?: boolean = false;
  @Input() allowMultiple: boolean = false;
  @Input() options: SelectOption[] = [];

  value: any = null;
  isOpen: boolean = false;
  onChange: any = () => {};
  onTouched: any = () => {};

  ngOnInit() {
    if (this.options.length === 0) {
      this.options = this.getRelationshipTypeOptions();
    }
  }

  private getRelationshipTypeOptions(): SelectOption[] {
    return Object.values(RelationshipTypes).map((value) => ({
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

  selectSingleOption(optionValue: any) {
    this.value = optionValue;
    this.onChange(this.value);
    this.isOpen = false;
  }

  toggleOption(optionValue: any) {
    if (!this.allowMultiple) {
      this.selectSingleOption(optionValue);
      return;
    }

    if (!Array.isArray(this.value)) {
      this.value = [];
    }

    const index = this.value.indexOf(optionValue);
    if (index > -1) {
      this.value = this.value.filter((v: any) => v !== optionValue);
    } else {
      this.value = [...this.value, optionValue];
    }

    this.onChange(this.value);
  }

  isSelected(optionValue: any): boolean {
    if (this.allowMultiple && Array.isArray(this.value)) {
      return this.value.includes(optionValue);
    }
    return this.value === optionValue;
  }

  getDisplayValue(): string {
    if (!this.value) {
      return '';
    }

    if (this.allowMultiple && Array.isArray(this.value)) {
      if (this.value.length === 0) {
        return '';
      }

      const selectedLabels = this.value.map((val) => {
        const option = this.options.find((opt) => opt.value === val);
        return option ? option.label : val;
      });

      return selectedLabels.length > 1
        ? `${selectedLabels.length} itens selecionados`
        : selectedLabels[0];
    }

    const option = this.options.find((opt) => opt.value === this.value);
    return option ? option.label : this.value;
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
