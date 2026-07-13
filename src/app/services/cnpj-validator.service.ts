import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CnpjValidatorService {
  constructor() {}

  isValid(cnpj: string): boolean {
    if (!cnpj) return false;

    // Remove caracteres especiais de máscara (mantém letras e números)
    cnpj = cnpj.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    if (cnpj.length !== 14) return false;

    // Padrão: 12 caracteres alfanuméricos e os 2 últimos numéricos (DVs)
    const cnpjPattern = /^[A-Z0-9]{12}[0-9]{2}$/;
    if (!cnpjPattern.test(cnpj)) return false;

    // Rejeita sequências repetidas
    if (/^([A-Z0-9])\1+$/.test(cnpj)) return false;

    // Primeiro dígito verificador
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum1 = 0;
    for (let i = 0; i < 12; i++) {
      const charValue = cnpj.charCodeAt(i) - 48; // Módulo 11 adaptado da Receita Federal
      sum1 += charValue * weights1[i];
    }
    const mod1 = sum1 % 11;
    const dv1 = mod1 < 2 ? 0 : 11 - mod1;

    if (dv1 !== parseInt(cnpj.charAt(12), 10)) return false;

    // Segundo dígito verificador
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum2 = 0;
    for (let i = 0; i < 13; i++) {
      const charValue = cnpj.charCodeAt(i) - 48; // Módulo 11 adaptado da Receita Federal
      sum2 += charValue * weights2[i];
    }
    const mod2 = sum2 % 11;
    const dv2 = mod2 < 2 ? 0 : 11 - mod2;

    return dv2 === parseInt(cnpj.charAt(13), 10);
  }
}
