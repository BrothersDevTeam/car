export interface ICostCenter {
  costCenterId: string;
  storeId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface ICostCenterRecord {
  name: string;
  description?: string;
  storeId: string;
}
