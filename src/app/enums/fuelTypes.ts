/**
 * Enum para Tipos de Combustível
 * Corresponde ao enum FuelTypes do backend
 */
export enum FuelTypes {
  GASOLINA = 'GASOLINA',
  ALCOOL = 'ALCOOL',
  DIESEL = 'DIESEL',
  GNV = 'GNV',
  ELETRICO = 'ELETRICO'
}

/**
 * Labels amigáveis para exibição
 */
export const FuelTypesLabels: Record<FuelTypes, string> = {
  [FuelTypes.GASOLINA]: 'Gasolina',
  [FuelTypes.ALCOOL]: 'Álcool/Etanol',
  [FuelTypes.DIESEL]: 'Diesel',
  [FuelTypes.GNV]: 'GNV (Gás Natural)',
  [FuelTypes.ELETRICO]: 'Elétrico'
};
