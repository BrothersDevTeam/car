/**
 * Utilitários para formatação de documentos (CPF, CNPJ) e telefone.
 */

/**
 * Formata CPF ou CNPJ de acordo com a quantidade de dígitos.
 * - CPF: 000.000.000-00 (11 dígitos)
 * - CNPJ: 00.000.000/0000-00 (14 dígitos)
 */
export function formatCpfCnpj(value: string | null | undefined): string {
  if (!value) return '-';
  const clean = value.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
}

/**
 * Formata CPF: 000.000.000-00
 */
export function formatCpf(value: string | null | undefined): string {
  if (!value) return '-';
  const clean = value.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return value;
}

/**
 * Formata CNPJ: 00.000.000/0000-00
 */
export function formatCnpj(value: string | null | undefined): string {
  if (!value) return '-';
  const clean = value.replace(/\D/g, '');
  if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
}

/**
 * Formata Telefone: (00) 00000-0000 ou (00) 0000-0000
 */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return '-';
  const clean = value.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (clean.length === 10) {
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return value;
}
