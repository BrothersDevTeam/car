import { Directive } from '@angular/core';
import { CnpjValidatorService } from '@services/cnpj-validator.service';
import {
  AbstractControl,
  NG_VALIDATORS,
  ValidationErrors,
  Validator,
} from '@angular/forms';

@Directive({
  selector: '[appCnpjValidator]',
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: CnpjValidatorDirective,
      multi: true,
    },
  ],
})
export class CnpjValidatorDirective implements Validator {
  constructor(private cnpjValidatorService: CnpjValidatorService) {}
  validate(control: AbstractControl): ValidationErrors | null {
    const cnpj = control.value;
    return cnpj && !this.cnpjValidatorService.isValid(cnpj)
      ? { invalidCnpj: true }
      : null;
  }
}
