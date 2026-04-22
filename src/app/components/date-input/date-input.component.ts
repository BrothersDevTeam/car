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
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  DateAdapter,
  MAT_DATE_LOCALE,
  MatNativeDateModule,
} from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { LOCALE_ID } from '@angular/core';

@Component({
  selector: 'app-date-input',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
  ],
  templateUrl: './date-input.component.html',
  styleUrl: './date-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateInputComponent),
      multi: true,
    },
    { provide: MAT_DATE_LOCALE, useValue: 'pt-BR' },
    { provide: LOCALE_ID, useValue: 'pt-BR' },
  ],
})
export class DateInputComponent implements ControlValueAccessor {
  constructor(private _adapter: DateAdapter<any>) {
    this._adapter.setLocale('pt-BR');
  }

  @Input() label: string = '';
  @Input() placeholder: string = 'dd/mm/aaaa';
  @Input() required: boolean = false;
  @Input() readonly: boolean = false;
  @Input() hint: string = '';

  // Valor interno (Date ou null)
  value = signal<Date | null>(null);

  // Callbacks para o Angular Forms
  onChange: any = () => {};
  onTouched: any = () => {};

  // --- ControlValueAccessor Implementation ---

  writeValue(val: any): void {
    if (val) {
      this.value.set(new Date(val));
    } else {
      this.value.set(null);
    }
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

  onDateChange(event: any): void {
    const selectedDate = event.value;
    this.value.set(selectedDate);
    this.onChange(selectedDate);
  }

  onBlur(): void {
    this.onTouched();
  }
}
