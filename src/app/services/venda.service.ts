import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, first, Observable, of, tap } from 'rxjs';

import { PaginationResponse } from '@interfaces/pagination';
import { VendaResponseDto, VendaRequestDto } from '@interfaces/venda';
import { MessageResponse } from '@interfaces/message-response';
import { StoreContextService } from './store-context.service';

@Injectable({
  providedIn: 'root',
})
export class VendaService {
  private cache: PaginationResponse<VendaResponseDto> | null = null;

  // Subject para notificar mudanças no cache
  private cacheUpdated$ =
    new BehaviorSubject<PaginationResponse<VendaResponseDto> | null>(null);

  constructor(
    private http: HttpClient,
    private storeContextService: StoreContextService
  ) {}

  /**
   * Obtém a URL base para as chamadas de venda, injetando o storeId atual.
   * Lança erro se não houver um storeId definido no contexto.
   */
  private getBaseUrl(): string {
    const storeId = this.storeContextService.currentStoreId;
    if (!storeId) {
      throw new Error('Store ID não definido no contexto da aplicação.');
    }
    return `/api/stores/${storeId}/vendas`;
  }

  // Observable público para componentes se inscreverem
  get cacheUpdated(): Observable<PaginationResponse<VendaResponseDto> | null> {
    return this.cacheUpdated$.asObservable();
  }

  getPaginatedData(
    pageIndex: number,
    pageSize: number,
    searchParams?: { search?: string; storeId?: string }
  ): Observable<PaginationResponse<VendaResponseDto>> {
    const hasSearchParams =
      searchParams && (searchParams.search?.trim() || searchParams.storeId);

    // Só usa cache se não houver busca ou filtro de loja ativo
    if (this.cache && !hasSearchParams) {
      return of(this.cache);
    }

    let url = `${this.getBaseUrl()}?page=${pageIndex}&size=${pageSize}`;

    if (searchParams?.search?.trim()) {
      url += `&search=${encodeURIComponent(searchParams.search.trim())}`;
    }

    return this.http.get<PaginationResponse<VendaResponseDto>>(url).pipe(
      first(),
      tap((response) => {
        // Só atualiza o cache geral se não for uma busca
        if (!hasSearchParams) {
          this.cache = response;
          this.cacheUpdated$.next({ ...this.cache });
        }
      })
    );
  }

  getVendaById(id: string): Observable<VendaResponseDto> {
    return this.http
      .get<VendaResponseDto>(`${this.getBaseUrl()}/${id}`)
      .pipe(first());
  }

  gerarNfe(vendaId: string): Observable<VendaResponseDto> {
    return this.http.post<VendaResponseDto>(`${this.getBaseUrl()}/${vendaId}/gerar-nfe`, {});
  }

  create(data: VendaRequestDto): Observable<VendaResponseDto> {
    return this.http.post<VendaResponseDto>(`${this.getBaseUrl()}`, data).pipe(
      tap((response) => {
        console.log('Venda registrada com sucesso!', response);
        this.clearCache();
      })
    );
  }

  update(
    id: string,
    data: Partial<VendaRequestDto>
  ): Observable<VendaResponseDto> {
    return this.http
      .put<VendaResponseDto>(`${this.getBaseUrl()}/${id}`, data)
      .pipe(
        tap((response) => {
          console.log('Venda atualizada com sucesso!', response);
          this.clearCache();
        })
      );
  }

  cancelVenda(id: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.getBaseUrl()}/${id}`).pipe(
      tap((response) => {
        console.log('Venda cancelada com sucesso!', response.message);
        this.clearCache();
      })
    );
  }

  public clearCache() {
    this.cache = null;
    this.cacheUpdated$.next(null);
  }
}
