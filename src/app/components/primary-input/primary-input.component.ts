import { NgxMaskDirective } from 'ngx-mask';
import { Component, forwardRef, Input, Output, EventEmitter } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

type InputTypes = 'text' | 'email' | 'password' | 'number' | 'tel';

@Component({
  selector: 'app-primary-input',
  imports: [NgxMaskDirective],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PrimaryInputComponent),
      multi: true,
    },
  ],
  templateUrl: './primary-input.component.html',
  styleUrl: './primary-input.component.scss',
})
export class PrimaryInputComponent implements ControlValueAccessor {
  @Input() type: InputTypes = 'text';
  @Input() placeholder: string = '';
  @Input() label: string = '';
  @Input() inputName: string = '';
  @Input() error?: boolean = false;
  @Input() mask: string = '';
  @Input() uppercase?: boolean = true;
  @Input() maxlength?: string;
  @Input() required?: boolean = false;

  // Novo: Output para evento blur
  @Output() blur = new EventEmitter<FocusEvent>();

  value: string = '';
  onChange: any = () => {};
  onTouched: any = () => {};

  onInput(event: Event) {
    const inputElement = event.target as HTMLInputElement;

    const value = this.uppercase
      ? inputElement.value.toUpperCase()
      : inputElement.value;

    if (this.uppercase) inputElement.value = value;
    this.onChange(value);
  }

  // Novo: método para tratar blur
  onBlur(event: FocusEvent) {
    this.onTouched();
    this.blur.emit(event);
  }

  writeValue(value: any): void {
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
}
