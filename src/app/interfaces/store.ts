import { StoreType, StoreStatus } from '../enums/storeTypes';

export interface Store {
  storeId?: string;
  mainStoreId: string | null;
  name: string;
  tradeName?: string;
  cnpj: string;
  email: string;
  phone?: string;
  storeType: StoreType;
  storeStatus: StoreStatus;
  imageUrl?: string;
  owner?: string | any;
  inscricaoEstadual?: string;
  regimeTributario?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  version?: number;
  _links?: any;
}

export type CreateMainStore = {
  name: string;
  tradeName?: string;
  cnpj: string;
  email: string;
  phoneNumber?: string;
};

export type CreateBranchStore = {
  mainStoreId: string;
  name: string;
  tradeName?: string;
  cnpj: string;
  email: string;
  phoneNumber?: string;
};

export type UpdateStore = {
  name?: string;
  tradeName?: string;
  cnpj?: string;
  email?: string;
  phoneNumber?: string;
};

export interface StoreSearchFilters {
  name?: string;
  tradeName?: string;
  cnpj?: string;
  email?: string;
  storeType?: StoreType;
  storeStatus?: StoreStatus;
  mainStoreId?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface StorePageResponse {
  content: Store[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      sorted: boolean;
      unsorted: boolean;
      empty: boolean;
    };
  };
  totalPages: number;
  totalElements: number;
  last: boolean;
  first: boolean;
  size: number;
  number: number;
  numberOfElements: number;
  empty: boolean;
}
