import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, first } from 'rxjs';
import { IRecurringTransaction, IRecurringTransactionRecord } from '@interfaces/recurring-transaction';
import { PaginationResponse } from '@interfaces/pagination';
import { StoreContextService } from './store-context.service';

@Injectable({
  providedIn: 'root',
})
export class RecurringTransactionService {
  private readonly apiUrl: string = '/api/financial/recurring';

  constructor(
    private http: HttpClient,
    private storeContextService: StoreContextService,
  ) {}

  getRecurringTransactions(
    pageIndex: number,
    pageSize: number,
    searchParams?: { description?: string; storeId?: string; type?: string; status?: string; costCenterId?: string },
  ): Observable<PaginationResponse<IRecurringTransaction>> {
    const currentStoreId = searchParams?.storeId || this.storeContextService.currentStoreId;
    let url = `${this.apiUrl}?page=${pageIndex}&size=${pageSize}`;

    if (currentStoreId) {
      url += `&storeId=${encodeURIComponent(currentStoreId)}`;
    }
    if (searchParams?.description?.trim()) {
      url += `&description=${encodeURIComponent(searchParams.description.trim())}`;
    }
    if (searchParams?.type) {
      url += `&type=${encodeURIComponent(searchParams.type)}`;
    }
    if (searchParams?.status) {
      url += `&status=${encodeURIComponent(searchParams.status)}`;
    }
    if (searchParams?.costCenterId) {
      url += `&costCenterId=${encodeURIComponent(searchParams.costCenterId)}`;
    }

    return this.http.get<PaginationResponse<IRecurringTransaction>>(url).pipe(first());
  }

  create(data: IRecurringTransactionRecord): Observable<IRecurringTransaction> {
    return this.http.post<IRecurringTransaction>(this.apiUrl, data).pipe(first());
  }

  update(id: string, data: IRecurringTransactionRecord): Observable<IRecurringTransaction> {
    return this.http.put<IRecurringTransaction>(`${this.apiUrl}/${id}`, data).pipe(first());
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(first());
  }
}
