import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { BehaviorSubject, first, Observable, of, tap } from 'rxjs';

import { Brand, CreateBrand } from '@interfaces/vehicle';
import { PaginationResponse } from '@interfaces/pagination';

@Injectable({
  providedIn: 'root',
})
export class BrandService {
  private cache: PaginationResponse<Brand> | null = null;

  // Subject para notificar mudanças no cache
  private cacheUpdated$ = new BehaviorSubject<PaginationResponse<Brand> | null>(
    null
  );

  private readonly apiUrl: string = '/api/vehicle-brands';

  constructor(private http: HttpClient) {}

  // Observable público para componentes se inscreverem
  get cacheUpdated(): Observable<PaginationResponse<Brand> | null> {
    return this.cacheUpdated$.asObservable();
  }

  getBrands(): Observable<PaginationResponse<Brand>> {
    if (this.cache) {
      return of(this.cache);
    }
    // Busca todos os registros (size=1000)
    return this.http
      .get<PaginationResponse<Brand>>(`${this.apiUrl}?size=1000`)
      .pipe(
        first(),
        tap((response) => {
          console.log('Brands fetched:', response);
          this.cache = response;
        })
      );
  }

  create(data: CreateBrand) {
    return this.http.post<Brand>(`${this.apiUrl}`, data).pipe(
      tap((response: Brand) => {
        console.log('Marca criada com sucesso!', response);
        this.clearCache();
        // Notifica mudança no cache
        this.getBrands().subscribe();
      })
    );
  }

  update(data: any) {
    const brandId = data.brandId;
    return this.http.put<Brand>(`${this.apiUrl}/${brandId}`, data).pipe(
      tap((response: Brand) => {
        console.log('Marca atualizada com sucesso!', response);
        this.clearCache();
        // Notifica mudança no cache
        this.getBrands().subscribe();
      })
    );
  }

  delete(id: string) {
    return this.http.delete<string>(`${this.apiUrl}/${id}`).pipe(
      tap((response: string) => {
        console.log('Marca deletada com sucesso!', response);
        this.clearCache();
      })
    );
  }

  private clearCache() {
    this.cache = null;
  }
}
