export interface PaginationResponse<T> {
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  pageable: Pageable;
  size: number;
  content: T[];
  number: number;
  sort: Sort[];
}

export interface Pageable {
  paged: boolean;
  pageNumber: number;
  pageSize: number;
  offset: number;
  sort: Sort[];
  unpaged: boolean;
}

export interface Sort {
  direction: string;
  nullHandling: string;
  ascending: boolean;
  property: string;
  ignoreCase: boolean;
}
