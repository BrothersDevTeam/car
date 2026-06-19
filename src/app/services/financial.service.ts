import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, first } from 'rxjs';
import { FinancialSummary, FinancialTransaction, FinancialTransactionRecord } from '@interfaces/financial';
import { PaginationResponse } from '@interfaces/pagination';
import { StoreContextService } from './store-context.service';

@Injectable({
  providedIn: 'root',
})
export class FinancialService {
  private readonly apiUrl: string = '/api/financial';

  constructor(
    private http: HttpClient,
    private storeContextService: StoreContextService,
  ) {}

  getSummary(storeId?: string): Observable<FinancialSummary> {
    const currentStoreId = storeId || this.storeContextService.currentStoreId;
    let url = `${this.apiUrl}/summary`;
    if (currentStoreId) {
      url += `?storeId=${encodeURIComponent(currentStoreId)}`;
    }
    return this.http.get<FinancialSummary>(url).pipe(first());
  }

  getTransactions(
    pageIndex: number,
    pageSize: number,
    searchParams?: { type?: string; origin?: string; status?: string; description?: string; storeId?: string; costCenterId?: string },
  ): Observable<PaginationResponse<FinancialTransaction>> {
    const currentStoreId = searchParams?.storeId || this.storeContextService.currentStoreId;
    let url = `${this.apiUrl}/transactions?page=${pageIndex}&size=${pageSize}`;

    if (currentStoreId) {
      url += `&storeId=${encodeURIComponent(currentStoreId)}`;
    }
    if (searchParams?.type) {
      url += `&type=${encodeURIComponent(searchParams.type)}`;
    }
    if (searchParams?.origin) {
      url += `&origin=${encodeURIComponent(searchParams.origin)}`;
    }
    if (searchParams?.status) {
      url += `&status=${encodeURIComponent(searchParams.status)}`;
    }
    if (searchParams?.description?.trim()) {
      url += `&description=${encodeURIComponent(searchParams.description.trim())}`;
    }
    if (searchParams?.costCenterId) {
      url += `&costCenterId=${encodeURIComponent(searchParams.costCenterId)}`;
    }

    return this.http.get<PaginationResponse<FinancialTransaction>>(url).pipe(first());
  }

  createTransaction(data: FinancialTransactionRecord): Observable<FinancialTransaction> {
    return this.http.post<FinancialTransaction>(`${this.apiUrl}/transactions`, data).pipe(first());
  }

  markAsPaid(id: string): Observable<FinancialTransaction> {
    return this.http.put<FinancialTransaction>(`${this.apiUrl}/transactions/${id}/pay`, {}).pipe(first());
  }
}
