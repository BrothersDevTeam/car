export enum StoreType {
  MATRIZ = 'MATRIZ',
  BRANCH = 'BRANCH',
}

export enum StoreStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  BLOCKED = 'BLOCKED',
}

export const StoreTypeLabels: Record<StoreType, string> = {
  [StoreType.MATRIZ]: 'Matriz',
  [StoreType.BRANCH]: 'Filial',
};

export const StoreStatusLabels: Record<StoreStatus, string> = {
  [StoreStatus.ACTIVE]: 'Ativa',
  [StoreStatus.CANCELLED]: 'Cancelada',
  [StoreStatus.BLOCKED]: 'Bloqueada',
};

export const StoreTypeIcons: Record<StoreType, string> = {
  [StoreType.MATRIZ]: 'domain',
  [StoreType.BRANCH]: 'store',
};

export const StoreStatusIcons: Record<StoreStatus, string> = {
  [StoreStatus.ACTIVE]: 'check_circle',
  [StoreStatus.CANCELLED]: 'cancel',
  [StoreStatus.BLOCKED]: 'block',
};

export const StoreStatusColors: Record<StoreStatus, string> = {
  [StoreStatus.ACTIVE]: 'success',
  [StoreStatus.CANCELLED]: 'danger',
  [StoreStatus.BLOCKED]: 'warning',
};
