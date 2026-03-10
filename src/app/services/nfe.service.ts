import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Nfe } from '@interfaces/nfe';
import { PaginationResponse } from '@interfaces/pagination';
import { BehaviorSubject, first, Observable, of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NfeService {
  private cache: PaginationResponse<Nfe> | null = null;

  // Subject para notificar mudanças no cache
  private cacheUpdated$ = new BehaviorSubject<PaginationResponse<Nfe> | null>(
    null
  );

  private readonly apiUrl: string = '/api/nfes';

  constructor(private http: HttpClient) {}

  // Observable público para componentes se inscreverem
  get cacheUpdated(): Observable<PaginationResponse<Nfe> | null> {
    return this.cacheUpdated$.asObservable();
  }

  getPaginatedData(
    pageIndex: number,
    pageSize: number,
    searchParams?: { search?: string }
  ): Observable<PaginationResponse<Nfe>> {
    // Only use cache if there are no search params
    if (this.cache && (!searchParams || !searchParams.search)) {
      return of(this.cache);
    }
    
    let url = `${this.apiUrl}?page=${pageIndex}&size=${pageSize}`;
    
    if (searchParams?.search) {
      url += `&search=${searchParams.search}`;
    }
    
    return this.http
      .get<PaginationResponse<Nfe>>(url)
      .pipe(
        first(),
        tap((response) => {
          // Only update general cache if it's not a search result
          if (!searchParams || !searchParams.search) {
            this.cache = response;
            this.cache.page.totalElements = this.cache.content.length;
            this.cacheUpdated$.next({ ...this.cache });
          } else {
             response.page.totalElements = response.content.length;
          }
        })
      );
  }

  getNfe(id: string): Observable<Nfe> {
    return this.http.get<Nfe>(`${this.apiUrl}?nfeId=${id}`).pipe(first());
  }

  create(data: Nfe) {
    return this.http.post<string>(`${this.apiUrl}`, data).pipe(
      tap((response: string) => {
        console.log('Formulário enviado com sucesso!', response);
        this.clearCache();
      })
    );
  }

  update(data: Nfe) {
    return this.http.put<string>(`${this.apiUrl}/${data.nfeId}`, data).pipe(
      tap((response: string) => {
        console.log('Formulário enviado com sucesso!', response);
        this.clearCache();
      })
    );
  }

  // Verificar como lidaremos com o cancelamento de NFe
  delete(id: string) {
    return this.http.delete<string>(`${this.apiUrl}/${id}`).pipe(
      tap((response: string) => {
        console.log('NFe cancelada com sucesso!', response);
        this.clearCache();
      })
    );
  }

  public clearCache() {
    this.cache = null;
    this.cacheUpdated$.next(null);
  }
}
