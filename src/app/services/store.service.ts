import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Store, StorePageResponse, StoreSearchFilters } from '@interfaces/store';

@Injectable({
  providedIn: 'root',
})
export class StoreService {
  private readonly apiUrl: string = '/api/stores';

  constructor(private http: HttpClient) {}

  getAll(filters?: StoreSearchFilters): Observable<StorePageResponse> {
    let params = new HttpParams();

    if (filters) {
      if (filters.name) params = params.set('name', filters.name);
      if (filters.tradeName) params = params.set('tradeName', filters.tradeName);
      if (filters.cnpj) params = params.set('cnpj', filters.cnpj);
      if (filters.email) params = params.set('email', filters.email);
      if (filters.storeType) params = params.set('storeType', filters.storeType);
      if (filters.storeStatus) params = params.set('storeStatus', filters.storeStatus);
      if (filters.mainStoreId) params = params.set('mainStoreId', filters.mainStoreId);
      if (filters.page !== undefined) params = params.set('page', filters.page.toString());
      if (filters.size !== undefined) params = params.set('size', filters.size.toString());
      if (filters.sort) params = params.set('sort', filters.sort);
    }

    return this.http.get<StorePageResponse>(this.apiUrl, { params });
  }

  getBranches(filters?: StoreSearchFilters): Observable<StorePageResponse> {
    let params = new HttpParams();

    if (filters) {
      if (filters.name) params = params.set('name', filters.name);
      if (filters.storeStatus) params = params.set('storeStatus', filters.storeStatus);
      if (filters.page !== undefined) params = params.set('page', filters.page.toString());
      if (filters.size !== undefined) params = params.set('size', filters.size.toString());
    }

    return this.http.get<StorePageResponse>(`${this.apiUrl}/branches`, { params });
  }

  getById(storeId: string): Observable<Store> {
    return this.http.get<Store>(`${this.apiUrl}/${storeId}`);
  }

  createMainStore(data: any): Observable<Store> {
    return this.http.post<Store>(`${this.apiUrl}/mainstore`, data);
  }

  createBranch(data: any): Observable<Store> {
    return this.http.post<Store>(this.apiUrl, data);
  }

  update(storeId: string, data: any): Observable<Store> {
    return this.http.put<Store>(`${this.apiUrl}/${storeId}`, data);
  }

  updateMainStore(storeId: string, data: any): Observable<Store> {
    return this.http.put<Store>(`${this.apiUrl}/mainstore/${storeId}`, data);
  }

  updateImage(storeId: string, imageUrl: string): Observable<Store> {
    return this.http.put<Store>(`${this.apiUrl}/${storeId}/image`, { imageUrl });
  }

  delete(storeId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${storeId}`);
  }

  setOwner(storeId: string, personId: string): Observable<Store> {
    return this.http.post<Store>(`${this.apiUrl}/owner`, { storeId, personId });
  }

  /**
   * Vincula uma pessoa como proprietária da loja
   * @param storeId ID da loja
   * @param personId ID da pessoa que será o proprietário
   * @returns Observable com a Store atualizada
   */
  setStoreOwner(storeId: string, personId: string): Observable<Store> {
    return this.setOwner(storeId, personId);
  }
}
