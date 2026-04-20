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

  private readonly apiUrl: string = '/api/vendas';

  constructor(
    private http: HttpClient,
    private storeContextService: StoreContextService
  ) {}

  // Observable público para componentes se inscreverem
  get cacheUpdated(): Observable<PaginationResponse<VendaResponseDto> | null> {
    return this.cacheUpdated$.asObservable();
  }

  getPaginatedData(
    pageIndex: number,
    pageSize: number,
    searchParams?: { search?: string; storeId?: string; status?: string }
  ): Observable<PaginationResponse<VendaResponseDto>> {
    // Se não houver storeId passado nos parâmetros, tenta pegar do contexto
    const currentStoreId =
      searchParams?.storeId || this.storeContextService.currentStoreId;

    const hasSearchParams =
      searchParams && (searchParams.search?.trim() || searchParams.status);

    // Só usa cache se não houver busca e se a loja solicitada for a mesma do contexto
    // (A limpeza de cache é garantida pelo componente ao mudar de loja)
    if (this.cache && !hasSearchParams) {
      return of(this.cache);
    }

    let url = `${this.apiUrl}?page=${pageIndex}&size=${pageSize}`;

    // Injeta storeId se presente (se for null, o backend busca pela rede do usuário)
    if (currentStoreId) {
      url += `&storeId=${encodeURIComponent(currentStoreId)}`;
    }

    if (searchParams?.search?.trim()) {
      url += `&search=${encodeURIComponent(searchParams.search.trim())}`;
    }

    if (searchParams?.status?.trim()) {
      url += `&vendaStatus=${encodeURIComponent(searchParams.status.trim())}`;
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
    return this.http.get<VendaResponseDto>(`${this.apiUrl}/${id}`).pipe(first());
  }

  gerarNfe(vendaId: string, storeId: string): Observable<VendaResponseDto> {
    return this.http.post<VendaResponseDto>(
      `${this.apiUrl}/${vendaId}/gerar-nfe?storeId=${storeId}`,
      {}
    );
  }

  create(data: VendaRequestDto): Observable<VendaResponseDto> {
    const storeId = this.storeContextService.currentStoreId;
    return this.http
      .post<VendaResponseDto>(`${this.apiUrl}?storeId=${storeId}`, data)
      .pipe(
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
    return this.http.put<VendaResponseDto>(`${this.apiUrl}/${id}`, data).pipe(
      tap((response) => {
        console.log('Venda atualizada com sucesso!', response);
        this.clearCache();
      })
    );
  }

  cancelVenda(vendaId: string, storeId: string): Observable<MessageResponse> {
    return this.http
      .delete<MessageResponse>(`${this.apiUrl}/${vendaId}?storeId=${storeId}`)
      .pipe(
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
