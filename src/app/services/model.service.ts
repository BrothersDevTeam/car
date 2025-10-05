import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { BehaviorSubject, first, Observable, of, tap } from 'rxjs';

import { Model } from '@interfaces/vehicle';
import { PaginationResponse } from '@interfaces/pagination';

@Injectable({
  providedIn: 'root',
})
export class ModelService {
  private cache: Map<string, PaginationResponse<Model>> = new Map();

  // Subject para notificar mudanças no cache
  private cacheUpdated$ = new BehaviorSubject<PaginationResponse<Model> | null>(null);

  private readonly apiUrl: string = '/api/vehicle-models';

  constructor(private http: HttpClient) {}

  // Observable público para componentes se inscreverem
  get cacheUpdated(): Observable<PaginationResponse<Model> | null> {
    return this.cacheUpdated$.asObservable();
  }

  /**
   * Busca modelos de uma marca específica
   * @param brandId ID da marca
   * @returns Observable com a lista de modelos
   */
  getModelsByBrand(brandId: string): Observable<PaginationResponse<Model>> {
    const cacheKey = `brand_${brandId}`;
    
    if (this.cache.has(cacheKey)) {
      return of(this.cache.get(cacheKey)!);
    }

    // Busca todos os modelos da marca (size=1000)
    return this.http
      .get<PaginationResponse<Model>>(`${this.apiUrl}?brandId=${brandId}&status=ACTIVE&size=1000`)
      .pipe(
        first(),
        tap((response) => {
          console.log('Modelos carregados para marca:', brandId, response);
          this.cache.set(cacheKey, response);
        })
      );
  }

  /**
   * Busca todos os modelos
   * @returns Observable com a lista paginada de modelos
   */
  getModels(): Observable<PaginationResponse<Model>> {
    return this.http
      .get<PaginationResponse<Model>>(`${this.apiUrl}?status=ACTIVE`)
      .pipe(
        first(),
        tap((response) => {
          console.log('Todos os modelos carregados:', response);
        })
      );
  }

  /**
   * Cria um novo modelo
   * @param data Dados do modelo a ser criado
   * @returns Observable com o modelo criado
   */
  create(data: any) {
    return this.http.post<Model>(`${this.apiUrl}`, data).pipe(
      tap((response) => {
        console.log('Modelo criado com sucesso!', response);
        this.clearCache();
      })
    );
  }

  /**
   * Atualiza um modelo existente
   * @param modelId ID do modelo
   * @param data Dados atualizados
   * @returns Observable com o modelo atualizado
   */
  update(modelId: string, data: any) {
    return this.http.put<Model>(`${this.apiUrl}/${modelId}`, data).pipe(
      tap((response) => {
        console.log('Modelo atualizado com sucesso!', response);
        this.clearCache();
      })
    );
  }

  /**
   * Deleta um modelo
   * @param modelId ID do modelo a ser deletado
   * @returns Observable com a resposta
   */
  delete(modelId: string) {
    return this.http.delete<any>(`${this.apiUrl}/${modelId}`).pipe(
      tap((response) => {
        console.log('Modelo deletado com sucesso!', response);
        this.clearCache();
      })
    );
  }

  /**
   * Limpa o cache de modelos
   */
  private clearCache() {
    this.cache.clear();
    this.cacheUpdated$.next(null);
  }
}
