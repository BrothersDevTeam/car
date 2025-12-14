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
    pageSize: number
  ): Observable<PaginationResponse<Nfe>> {
    if (this.cache) {
      return of(this.cache);
    }
    return this.http
      .get<
        PaginationResponse<Nfe>
      >(`${this.apiUrl}?page=${pageIndex}&size=${pageSize}`)
      .pipe(
        first(),
        tap((response) => {
          this.cache = response;

          this.cache.page.totalElements = this.cache.content.length;
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
    return this.http.put<string>(`${this.apiUrl}`, data).pipe(
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

  private clearCache() {
    this.cache = null;
  }
}
