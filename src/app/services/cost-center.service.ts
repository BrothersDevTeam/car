import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, first, map } from 'rxjs';
import { ICostCenter, ICostCenterRecord } from '@interfaces/cost-center';
import { PaginationResponse } from '@interfaces/pagination';
import { StoreContextService } from './store-context.service';

@Injectable({
  providedIn: 'root',
})
export class CostCenterService {
  private readonly apiUrl: string = '/api/financial/cost-centers';

  constructor(
    private http: HttpClient,
    private storeContextService: StoreContextService,
  ) {}

  getCostCenters(
    pageIndex: number,
    pageSize: number,
    searchParams?: { name?: string; storeId?: string; type?: 'EXPENSE' | 'REVENUE' },
  ): Observable<PaginationResponse<ICostCenter>> {
    const currentStoreId = searchParams?.storeId || this.storeContextService.currentStoreId;
    let url = `${this.apiUrl}?page=${pageIndex}&size=${pageSize}`;

    if (currentStoreId) {
      url += `&storeId=${encodeURIComponent(currentStoreId)}`;
    }
    if (searchParams?.name?.trim()) {
      url += `&name=${encodeURIComponent(searchParams.name.trim())}`;
    }
    if (searchParams?.type) {
      url += `&type=${encodeURIComponent(searchParams.type)}`;
    }

    return this.http.get<PaginationResponse<ICostCenter>>(url).pipe(first());
  }

  getAllCostCenters(storeId?: string, type?: 'EXPENSE' | 'REVENUE'): Observable<PaginationResponse<ICostCenter>> {
    return this.getCostCenters(0, 9999, { storeId, type });
  }

  createCostCenter(data: ICostCenterRecord): Observable<ICostCenter> {
    return this.http.post<ICostCenter>(this.apiUrl, data).pipe(first());
  }

  updateCostCenter(id: string, data: ICostCenterRecord): Observable<ICostCenter> {
    return this.http.put<ICostCenter>(`${this.apiUrl}/${id}`, data).pipe(first());
  }

  deleteCostCenter(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(first());
  }

  // Aliases para o CriateElementConfirmDialog (usado no custom-select)
  create(data: { description: string }): Observable<any> {
    return this.createCostCenter({
      name: data.description,
      type: 'EXPENSE', // Fallback padrão
      storeId: this.storeContextService.currentStoreId!,
    }).pipe(
      map((res) => ({
        id: res.costCenterId,
        description: res.name,
      })),
    );
  }

  update(data: { id: string; description: string }): Observable<any> {
    return this.updateCostCenter(data.id, {
      name: data.description,
      type: 'EXPENSE', // Mantém o tipo existente ou padrão
      storeId: this.storeContextService.currentStoreId!,
    }).pipe(
      map((res) => ({
        id: res.costCenterId,
        description: res.name,
      })),
    );
  }

  delete(id: string): Observable<any> {
    return this.deleteCostCenter(id);
  }
}
