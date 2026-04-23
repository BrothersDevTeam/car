// Configuração de uma badge individual: label exibido e classe CSS aplicada
export interface BadgeConfig {
  label: string;
  cssClass: string;
}

// Configuração para exibir alertas e tooltips em uma coluna
export interface AlertConfig<T> {
  // Função que retorna a mensagem de alerta se houver erro (null/undefined se não houver)
  getMessage: (row: T) => string | null | undefined;
  // Ícone opcional (default: warning_amber)
  icon?: string;
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
  // Configuração para exibir um indicador de alerta com tooltip se houver erro
  alertConfig?: AlertConfig<T>;
  // Ações customizadas para a coluna
  actions?: {
    label: string;
    icon: string;
    color?: string;
    action: (row: T) => void;
    hidden?: (row: T) => boolean;
    disabled?: (row: T) => boolean;
  }[];
}
