export enum StoreType {
  MATRIZ = 'MATRIZ',
  BRANCH = 'BRANCH',
}

export enum StoreStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  BLOCKED = 'BLOCKED',
  INACTIVE = 'INACTIVE',
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
};

export const StoreStatusColors: Record<StoreStatus, string> = {
  [StoreStatus.ACTIVE]: '#28a745',
  [StoreStatus.CANCELLED]: '#6c757d',
  [StoreStatus.BLOCKED]: '#ffc107',
  [StoreStatus.INACTIVE]: '#dc3545',
};
