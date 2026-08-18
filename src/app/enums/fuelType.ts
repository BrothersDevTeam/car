/**
 * Enum para Tipos de Combustível
 * Corresponde ao enum FuelType do backend
 */
export enum FuelType {
  // Combustíveis Simples
  ALCOOL = 'ÁLCOOL', // 01
  GASOLINA = 'GASOLINA', // 02
  DIESEL = 'DIESEL', // 03
  GASOGENIO = 'GASOGÊNIO', // 04
  GAS_METANO = 'GÁS METANO', // 05

  // Elétricos
  ELETRICO_FONTE_INTERNA = 'ELÉTRICO/FONTE INTERNA', // 06
  ELETRICO_FONTE_EXTERNA = 'ELÉTRICO/FONTE EXTERNA', // 07

  // Combinações com Gás Natural Combustível (GNC)
  GASOLINA_GNC = 'GASOLINA/GÁS NATURAL COMBUSTÍVEL', // 08
  ALCOOL_GNC = 'ÁLCOOL/GÁS NATURAL COMBUSTÍVEL', // 09
  DIESEL_GNC = 'DIESEL/GÁS NATURAL COMBUSTÍVEL', // 10

  // Observação
  VIDE_OBSERVACAO = 'VIDE/CAMPO/OBSERVAÇÃO', // 11

  // Combinações com Gás Natural Veicular (GNV)
  ALCOOL_GNV = 'ÁLCOOL/GÁS NATURAL VEICULAR', // 12
  GASOLINA_GNV = 'GASOLINA/GÁS NATURAL VEICULAR', // 13
  DIESEL_GNV = 'DIESEL/GÁS NATURAL VEICULAR', // 14
  GNV = 'GÁS NATURAL VEICULAR', // 15

  // Flex e Híbridos
  FLEX = 'ÁLCOOL/GASOLINA', // 16 (Flex Fuel)
  FLEX_GNV = 'GASOLINA/ÁLCOOL/GÁS NATURAL VEICULAR', // 17
  HIBRIDO = 'GASOLINA/ELÉTRICO', // 18
}

/**
 * Labels amigáveis para exibição no select
 */
export const FuelTypeLabels: Record<FuelType, string> = {
  // Combustíveis Simples
  [FuelType.ALCOOL]: 'Álcool',
  [FuelType.GASOLINA]: 'Gasolina',
  [FuelType.DIESEL]: 'Diesel',
  [FuelType.GASOGENIO]: 'Gasogênio',
  [FuelType.GAS_METANO]: 'Gás Metano',

  // Elétricos
  [FuelType.ELETRICO_FONTE_INTERNA]: 'Elétrico (Fonte Interna)',
  [FuelType.ELETRICO_FONTE_EXTERNA]: 'Elétrico (Fonte Externa)',

  // Combinações com GNC
  [FuelType.GASOLINA_GNC]: 'Gasolina / GNC',
  [FuelType.ALCOOL_GNC]: 'Álcool / GNC',
  [FuelType.DIESEL_GNC]: 'Diesel / GNC',

  // Observação
  [FuelType.VIDE_OBSERVACAO]: 'Vide Observação',

  // Combinações com GNV
  [FuelType.ALCOOL_GNV]: 'Álcool / GNV',
  [FuelType.GASOLINA_GNV]: 'Gasolina / GNV',
  [FuelType.DIESEL_GNV]: 'Diesel / GNV',
  [FuelType.GNV]: 'GNV',

  // Flex e Híbridos
  [FuelType.FLEX]: 'Flex (Álcool/Gasolina)',
  [FuelType.FLEX_GNV]: 'Flex + GNV',
  [FuelType.HIBRIDO]: 'Híbrido (Gasolina/Elétrico)',
};

/**
 * Códigos RENAVAM para cada tipo de combustível
 * Útil para integração com NF-e e sistemas externos
 */
export const FuelTypeRenavamCode: Record<FuelType, string> = {
  [FuelType.ALCOOL]: '01',
  [FuelType.GASOLINA]: '02',
  [FuelType.DIESEL]: '03',
  [FuelType.GASOGENIO]: '04',
  [FuelType.GAS_METANO]: '05',
  [FuelType.ELETRICO_FONTE_INTERNA]: '06',
  [FuelType.ELETRICO_FONTE_EXTERNA]: '07',
  [FuelType.GASOLINA_GNC]: '08',
  [FuelType.ALCOOL_GNC]: '09',
  [FuelType.DIESEL_GNC]: '10',
  [FuelType.VIDE_OBSERVACAO]: '11',
  [FuelType.ALCOOL_GNV]: '12',
  [FuelType.GASOLINA_GNV]: '13',
  [FuelType.DIESEL_GNV]: '14',
  [FuelType.GNV]: '15',
  [FuelType.FLEX]: '16',
  [FuelType.FLEX_GNV]: '17',
  [FuelType.HIBRIDO]: '18',
};
