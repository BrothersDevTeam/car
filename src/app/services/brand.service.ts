import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { BehaviorSubject, first, Observable, of, tap } from 'rxjs';

import { Brand, CreateBrand } from '@interfaces/vehicle';
import { PaginationResponse } from '@interfaces/pagination';
import { BrandStatus } from '../enums/brandStatus';

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

  filterByActive(array: Brand[]) {
    return array.filter((brand) => brand.status === BrandStatus.ACTIVE);
  }

  getBrands(): Observable<PaginationResponse<Brand>> {
    if (this.cache) {
      return of(this.cache);
    }
    return this.http.get<PaginationResponse<Brand>>(`${this.apiUrl}`).pipe(
      first(),
      tap((response) => {
        console.log('Brands fetched:', response);
        this.cache = response;
      })
    );
  }

  create(data: CreateBrand) {
    return this.http.post<string>(`${this.apiUrl}`, data).pipe(
      tap((response: string) => {
        console.log('Formulário enviado com sucesso!', response);
        this.clearCache();
      })
    );
  }

  update(data: Brand) {
    return this.http.put<string>(`${this.apiUrl}/${data.brandId}`, data).pipe(
      tap((response: string) => {
        console.log('Formulário enviado com sucesso!', response);
        this.clearCache();
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
