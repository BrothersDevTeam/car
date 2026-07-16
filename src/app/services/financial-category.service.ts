import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, first, map } from 'rxjs';
import { IFinancialCategory, IFinancialCategoryRecord } from '@interfaces/financial-category';
import { PaginationResponse } from '@interfaces/pagination';
import { StoreContextService } from './store-context.service';

@Injectable({
  providedIn: 'root',
})
export class FinancialCategoryService {
  private readonly apiUrl: string = '/api/financial/financial-categories';

  constructor(
    private http: HttpClient,
    private storeContextService: StoreContextService,
  ) {}

  getFinancialCategories(
    pageIndex: number,
    pageSize: number,
    searchParams?: { name?: string; storeId?: string; type?: 'EXPENSE' | 'REVENUE' },
  ): Observable<PaginationResponse<IFinancialCategory>> {
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

    return this.http.get<PaginationResponse<IFinancialCategory>>(url).pipe(first());
  }

  getAllFinancialCategories(storeId?: string, type?: 'EXPENSE' | 'REVENUE'): Observable<PaginationResponse<IFinancialCategory>> {
    return this.getFinancialCategories(0, 9999, { storeId, type });
  }

  createFinancialCategory(data: IFinancialCategoryRecord): Observable<IFinancialCategory> {
    return this.http.post<IFinancialCategory>(this.apiUrl, data).pipe(first());
  }

  updateFinancialCategory(id: string, data: IFinancialCategoryRecord): Observable<IFinancialCategory> {
    return this.http.put<IFinancialCategory>(`${this.apiUrl}/${id}`, data).pipe(first());
  }

  deleteFinancialCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(first());
  }

  // Aliases para o CriateElementConfirmDialog (usado no custom-select)
  create(data: { description: string }): Observable<any> {
    return this.createFinancialCategory({
      name: data.description,
      type: 'EXPENSE', // Fallback padrão
      storeId: this.storeContextService.currentStoreId!,
    }).pipe(
      map((res) => ({
        id: res.financialCategoryId,
        description: res.name,
      })),
    );
  }

  update(data: { id: string; description: string }): Observable<any> {
    return this.updateFinancialCategory(data.id, {
      name: data.description,
      type: 'EXPENSE', // Mantém o tipo existente ou padrão
      storeId: this.storeContextService.currentStoreId!,
    }).pipe(
      map((res) => ({
        id: res.financialCategoryId,
        description: res.name,
      })),
    );
  }

  delete(id: string): Observable<any> {
    return this.deleteFinancialCategory(id);
  }
}
