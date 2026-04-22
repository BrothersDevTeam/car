import { Component, forwardRef, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-currency-input',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './currency-input.component.html',
  styleUrl: './currency-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CurrencyInputComponent),
      multi: true,
    },
  ],
})
export class CurrencyInputComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() placeholder: string = '0,00';
  @Input() required: boolean = false;
  @Input() readonly: boolean = false;
  @Input() hint: string = '';

  // Valor interno exibido no input (formatado como string BRL)
  displayValue = signal<string>('');

  // Valor numérico real
  private numericValue: number = 0;

  // Callbacks para o Angular Forms
  onChange: any = () => {};
  onTouched: any = () => {};

  // --- ControlValueAccessor Implementation ---

  writeValue(value: any): void {
    const val = this.parseToNumber(value);
    this.numericValue = val;
    this.displayValue.set(this.formatBRL(val));
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    // Implementar se necessário
  }

  // --- Event Handlers ---

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    // Remove tudo que não é número
    const digits = value.replace(/\D/g, '');

    // Converte para centavos (ex: "1050" -> 10.50)
    const rawValue = parseFloat(digits) / 100;

    this.numericValue = rawValue || 0;

    // Atualiza o display durante a digitação para manter a máscara "viva"
    // ou podemos formatar apenas no blur. Para "Premium", máscara viva é melhor.
    input.value = this.formatBRL(this.numericValue);
    this.displayValue.set(input.value);

    this.onChange(this.numericValue);
  }

  onBlur(): void {
    this.onTouched();
    // Garante a formatação final
    this.displayValue.set(this.formatBRL(this.numericValue));
  }

  // --- Helper Methods ---

  private formatBRL(value: number): string {
    if (isNaN(value)) return '0,00';
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private parseToNumber(value: any): number {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return value;

    // Se vier como string, tenta limpar
    const clean = value.toString().replace(/\D/g, '');
    return parseFloat(clean) / 100 || 0;
  }
}
