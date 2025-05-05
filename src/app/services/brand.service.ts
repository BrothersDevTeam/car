import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { first, Observable, of, tap } from 'rxjs';

import { Brand, CreateBrand } from '@interfaces/vehicle';

@Injectable({
  providedIn: 'root',
})
export class BrandService {
  private cache: Brand[] | null = null;

  // private cache: Brand[] | null = [
  //   { id: '1', description: 'HONDA' },
  //   { id: '2', description: 'FIAT' },
  //   { id: '3', description: 'FORD' },
  //   { id: '4', description: 'CHEVROLET' },
  //   { id: '5', description: 'TOYOTA' },
  //   { id: '6', description: 'HYUNDAI' },
  //   { id: '7', description: 'NISSAN' },
  //   { id: '8', description: 'RENAULT' },
  // ];

  private readonly apiUrl: string = 'api/v1/vehicles/brands';

  constructor(private http: HttpClient) {}

  getBrands(): Observable<Brand[]> {
    if (this.cache) {
      return of(this.cache);
    }
    return this.http.get<Brand[]>(`${this.apiUrl}`).pipe(
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
    return this.http.put<string>(`${this.apiUrl}`, data).pipe(
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
