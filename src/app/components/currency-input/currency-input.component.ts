import { Component, forwardRef, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-currency-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MatFormFieldModule, MatInputModule, MatIconModule],
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
  @Input() error: boolean = false;
  @Input() inputName: string = '';
  @Input() errorMessage: string = 'Campo obrigatório';

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
    const value = input.value;

    // Guarda a posição do cursor em relação ao final do input
    const selectionStart = input.selectionStart || 0;
    const oldLength = value.length;
    const cursorOffsetFromEnd = oldLength - selectionStart;

    // Remove tudo que não é número
    const digits = value.replace(/\D/g, '');

    // Converte para centavos (ex: "1050" -> 10.50)
    const rawValue = parseFloat(digits) / 100;

    this.numericValue = rawValue || 0;

    // Atualiza o display durante a digitação para manter a máscara "viva"
    const formatted = this.formatBRL(this.numericValue);
    input.value = formatted;
    this.displayValue.set(formatted);

    // Restaura a posição do cursor relativa ao final
    const newLength = formatted.length;
    const newPosition = Math.max(0, newLength - cursorOffsetFromEnd);
    input.setSelectionRange(newPosition, newPosition);

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

    let stringValue = value.toString().trim();
    if (stringValue === '') return 0;

    // Se a string contiver vírgula, assume formato brasileiro (ex: 1.234,56 ou 1234,56)
    if (stringValue.includes(',')) {
      // Remove pontos de milhar e troca vírgula por ponto decimal
      const normalized = stringValue.replace(/\./g, '').replace(',', '.');
      return parseFloat(normalized) || 0;
    }

    // Se a string NÃO tiver vírgula mas tiver ponto, assume formato de banco/americano (ex: 1234.56)
    if (stringValue.includes('.')) {
      return parseFloat(stringValue) || 0;
    }

    // Se for uma string puramente numérica (ex: "99000"), assume que são reais inteiros
    return parseFloat(stringValue) || 0;
  }
}
