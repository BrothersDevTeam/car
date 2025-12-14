/**
 * Enum para Tipos de Combustível
 * Corresponde ao enum FuelTypes do backend
 */
export enum FuelTypes {
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
  HIBRIDO = 'GASOLINA/ELÉTRICO' // 18
}

/**
 * Labels amigáveis para exibição no select
 */
export const FuelTypesLabels: Record<FuelTypes, string> = {
  // Combustíveis Simples
  [FuelTypes.ALCOOL]: 'Álcool',
  [FuelTypes.GASOLINA]: 'Gasolina',
  [FuelTypes.DIESEL]: 'Diesel',
  [FuelTypes.GASOGENIO]: 'Gasogênio',
  [FuelTypes.GAS_METANO]: 'Gás Metano',
  
  // Elétricos
  [FuelTypes.ELETRICO_FONTE_INTERNA]: 'Elétrico (Fonte Interna)',
  [FuelTypes.ELETRICO_FONTE_EXTERNA]: 'Elétrico (Fonte Externa)',
  
  // Combinações com GNC
  [FuelTypes.GASOLINA_GNC]: 'Gasolina / GNC',
  [FuelTypes.ALCOOL_GNC]: 'Álcool / GNC',
  [FuelTypes.DIESEL_GNC]: 'Diesel / GNC',
  
  // Observação
  [FuelTypes.VIDE_OBSERVACAO]: 'Vide Observação',
  
  // Combinações com GNV
  [FuelTypes.ALCOOL_GNV]: 'Álcool / GNV',
  [FuelTypes.GASOLINA_GNV]: 'Gasolina / GNV',
  [FuelTypes.DIESEL_GNV]: 'Diesel / GNV',
  [FuelTypes.GNV]: 'GNV',
  
  // Flex e Híbridos
  [FuelTypes.FLEX]: 'Flex (Álcool/Gasolina)',
  [FuelTypes.FLEX_GNV]: 'Flex + GNV',
  [FuelTypes.HIBRIDO]: 'Híbrido (Gasolina/Elétrico)'
};

/**
 * Códigos RENAVAM para cada tipo de combustível
 * Útil para integração com NF-e e sistemas externos
 */
export const FuelTypesRenavamCode: Record<FuelTypes, string> = {
  [FuelTypes.ALCOOL]: '01',
  [FuelTypes.GASOLINA]: '02',
  [FuelTypes.DIESEL]: '03',
  [FuelTypes.GASOGENIO]: '04',
  [FuelTypes.GAS_METANO]: '05',
  [FuelTypes.ELETRICO_FONTE_INTERNA]: '06',
  [FuelTypes.ELETRICO_FONTE_EXTERNA]: '07',
  [FuelTypes.GASOLINA_GNC]: '08',
  [FuelTypes.ALCOOL_GNC]: '09',
  [FuelTypes.DIESEL_GNC]: '10',
  [FuelTypes.VIDE_OBSERVACAO]: '11',
  [FuelTypes.ALCOOL_GNV]: '12',
  [FuelTypes.GASOLINA_GNV]: '13',
  [FuelTypes.DIESEL_GNV]: '14',
  [FuelTypes.GNV]: '15',
  [FuelTypes.FLEX]: '16',
  [FuelTypes.FLEX_GNV]: '17',
  [FuelTypes.HIBRIDO]: '18'
};
