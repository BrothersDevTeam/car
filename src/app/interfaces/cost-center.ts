export interface ICostCenter {
  costCenterId: string;
  storeId: string;
  name: string;
  description?: string;
  type: 'EXPENSE' | 'REVENUE';
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface ICostCenterRecord {
  name: string;
  description?: string;
  type: 'EXPENSE' | 'REVENUE';
  parentId?: string;
  storeId: string;
}
