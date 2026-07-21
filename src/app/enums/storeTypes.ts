export enum StoreType {
  MATRIZ = 'MATRIZ',
  BRANCH = 'BRANCH',
}

export enum StoreStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  BLOCKED = 'BLOCKED',
  INACTIVE = 'INACTIVE',
  SOFT_BLOCKED = 'SOFT_BLOCKED',
}

export const StoreTypeLabels: Record<StoreType, string> = {
  [StoreType.MATRIZ]: 'Matriz',
  [StoreType.BRANCH]: 'Filial',
};

export const StoreStatusLabels: Record<StoreStatus, string> = {
  [StoreStatus.ACTIVE]: 'Ativa',
  [StoreStatus.CANCELLED]: 'Cancelada',
  [StoreStatus.BLOCKED]: 'Bloqueada',
  [StoreStatus.INACTIVE]: 'Inativa',
  [StoreStatus.SOFT_BLOCKED]: 'Bloqueio Financeiro',
};

export const StoreTypeIcons: Record<StoreType, string> = {
  [StoreType.MATRIZ]: 'domain',
  [StoreType.BRANCH]: 'store',
};

export const StoreStatusIcons: Record<StoreStatus, string> = {
  [StoreStatus.ACTIVE]: 'check_circle',
  [StoreStatus.CANCELLED]: 'cancel',
  [StoreStatus.BLOCKED]: 'block',
  [StoreStatus.INACTIVE]: 'pause_circle',
  [StoreStatus.SOFT_BLOCKED]: 'warning_amber',
};

export const StoreStatusColors: Record<StoreStatus, string> = {
  [StoreStatus.ACTIVE]: '#28a745',
  [StoreStatus.CANCELLED]: '#6c757d',
  [StoreStatus.BLOCKED]: '#ffc107',
  [StoreStatus.INACTIVE]: '#dc3545',
  [StoreStatus.SOFT_BLOCKED]: '#fd7e14',
};
