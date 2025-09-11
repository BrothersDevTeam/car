import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function minLengthArray(min: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (Array.isArray(value) && value.length >= min) {
      return null;
    }
    return {
      minLengthArray: { requiredLength: min, actualLength: value?.length || 0 },
    };
  };
}
