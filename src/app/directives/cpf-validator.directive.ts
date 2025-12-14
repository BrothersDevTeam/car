import { Directive } from '@angular/core';
import { CpfValidatorService } from '@services/cpf-validator.service';
import {
  NG_VALIDATORS,
  Validator,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';

@Directive({
  selector: '[appCpfValidator]',
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: CpfValidatorDirective,
      multi: true,
    },
  ],
})
export class CpfValidatorDirective implements Validator {
  constructor(private cpfValidatorService: CpfValidatorService) {}

  validate(control: AbstractControl): ValidationErrors | null {
    const cpf = control.value;
    return cpf && !this.cpfValidatorService.isValid(cpf)
      ? { invalidCpf: true }
      : null;
  }
}
