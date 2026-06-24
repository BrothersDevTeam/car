import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, first, Observable, of, tap } from 'rxjs';

import { PaginationResponse } from '@interfaces/pagination';
import { Compra } from '@interfaces/compra';
import { MessageResponse } from '@interfaces/message-response';
import { StoreContextService } from './store-context.service';

@Injectable({
  providedIn: 'root',
})
export class CompraService {
  private cache: PaginationResponse<Compra> | null = null;
  private cacheUpdated$ = new BehaviorSubject<PaginationResponse<Compra> | null>(null);

  private readonly apiUrl: string = '/api/compras';

  constructor(
    private http: HttpClient,
    private storeContextService: StoreContextService,
  ) {}

  get cacheUpdated(): Observable<PaginationResponse<Compra> | null> {
    return this.cacheUpdated$.asObservable();
  }

  getPaginatedData(
    pageIndex: number,
    pageSize: number,
    searchParams?: { search?: string; storeId?: string },
  ): Observable<PaginationResponse<Compra>> {
    const currentStoreId = searchParams?.storeId || this.storeContextService.currentStoreId;
    const hasSearchParams = searchParams && searchParams.search?.trim();

    if (this.cache && !hasSearchParams) {
      return of(this.cache);
    }

    let url = `${this.apiUrl}?page=${pageIndex}&size=${pageSize}`;

    if (currentStoreId) {
      url += `&storeId=${encodeURIComponent(currentStoreId)}`;
    }

    if (searchParams?.search?.trim()) {
      url += `&search=${encodeURIComponent(searchParams.search.trim())}`;
    }

    return this.http.get<PaginationResponse<Compra>>(url).pipe(
      first(),
      tap((response) => {
        if (!hasSearchParams) {
          this.cache = response;
          this.cacheUpdated$.next({ ...this.cache });
        }
      }),
    );
  }

  getCompraById(id: string): Observable<Compra> {
    return this.http.get<Compra>(`${this.apiUrl}/${id}`).pipe(first());
  }

  create(data: Compra): Observable<Compra> {
    const storeId = this.storeContextService.currentStoreId;
    return this.http.post<Compra>(`${this.apiUrl}?storeId=${storeId}`, data).pipe(
      tap((response) => {
        console.log('Compra registrada com sucesso!', response);
        this.clearCache();
      }),
    );
  }

  update(id: string, data: Compra): Observable<Compra> {
    return this.http.put<Compra>(`${this.apiUrl}/${id}`, data).pipe(
      tap((response) => {
        console.log('Compra atualizada com sucesso!', response);
        this.clearCache();
      }),
    );
  }

  excluirCompra(compraId: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.apiUrl}/${compraId}`).pipe(
      tap((response) => {
        console.log('Compra excluída com sucesso!', response.message);
        this.clearCache();
      }),
    );
  }

  gerarRascunhoNfe(compraId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${compraId}/gerar-rascunho-nfe`, {}).pipe(
      tap(() => {
        this.clearCache();
      })
    );
  }

  public clearCache() {
    this.cache = null;
    this.cacheUpdated$.next(null);
  }
}
