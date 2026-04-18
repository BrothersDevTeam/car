// Configuração de uma badge individual: label exibido e classe CSS aplicada
export interface BadgeConfig {
  label: string;
  cssClass: string;
}

export interface ColumnConfig<T> {
  key: string;
  header: string;
  format?: (value: any, row: T) => string;
  showEditIcon?: (row: T) => boolean;
  showDeleteIcon?: (row: T) => boolean;
  showNfeIcon?: (row: T) => boolean;
  showCheckbox?: (row: T) => boolean;
  // Mapa de valor → BadgeConfig. Se definido, renderiza uma badge no lugar do texto puro.
  badgeConfig?: { [key: string]: BadgeConfig };
}
