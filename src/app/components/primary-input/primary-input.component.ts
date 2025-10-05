import { NgxMaskDirective } from 'ngx-mask';
import { FormsModule } from '@angular/forms';
import { Component, forwardRef, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

type InputTypes = 'text' | 'email' | 'password' | 'number' | 'tel';

@Component({
  selector: 'app-primary-input',
  imports: [NgxMaskDirective, FormsModule],
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

  @Output() blur = new EventEmitter<FocusEvent>();

  value: string = '';
  onChange: any = () => {};
  onTouched: any = () => {};
  disabled: boolean = false;

  constructor(private cdr: ChangeDetectorRef) {}

  onInput(event: Event) {
    const inputElement = event.target as HTMLInputElement;

    let value = inputElement.value;
    
    if (this.uppercase) {
      value = value.toUpperCase();
      inputElement.value = value;
    }
    
    this.value = value;
    this.onChange(value);
  }

  onBlur(event: FocusEvent) {
    this.onTouched();
    this.blur.emit(event);
  }

  writeValue(value: any): void {
    this.value = value || '';
    this.cdr.detectChanges();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }
}
