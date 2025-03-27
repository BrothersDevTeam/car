import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CnpjValidatorService {
  constructor() {}

  isValid(cnpj: string): boolean {
    cnpj = cnpj.replace(/\D/g, '');

    if (cnpj.length !== 14) return false;

    if (/^(\d)\1+$/.test(cnpj)) return false;

    let length = 12;
    let numbers = cnpj.substring(0, length);
    let digits = cnpj.substring(length);
    let sum = 0;
    let position = length - 7;

    for (let i = length; i >= 1; i--) {
      sum += +numbers[length - i] * position--;
      if (position < 2) position = 9;
    }

    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== +digits[0]) return false;

    length = 13;
    numbers = cnpj.substring(0, length);
    sum = 0;
    position = length - 7;

    for (let i = length; i >= 1; i--) {
      sum += +numbers[length - i] * position--;
      if (position < 2) position = 9;
    }

    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return result === +digits[1];
  }
}
