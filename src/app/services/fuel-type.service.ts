import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { first, Observable, of, tap } from 'rxjs';

import { CreateFuelType, FuelType } from '@interfaces/vehicle';

@Injectable({
  providedIn: 'root',
})
export class FuelTypeService {
  private cache: FuelType[] | null = null;

  // private cache: FuelType[] | null = [
  //   { id: '1', description: 'Gasolina' },
  //   { id: '2', description: 'Etanol' },
  //   { id: '3', description: 'Diesel' },
  //   { id: '4', description: 'Flex' },
  //   { id: '5', description: 'Elétrico' },
  //   { id: '6', description: 'Híbrido' },
  //   { id: '7', description: 'GNV' },
  // ];

  private readonly apiUrl: string = 'api/v1/vehicles/fuel-types';

  constructor(private http: HttpClient) {}

  getFuelTypes(): Observable<FuelType[]> {
    if (this.cache) {
      return of(this.cache);
    }
    return this.http.get<FuelType[]>(`${this.apiUrl}`).pipe(
      first(),
      tap((response) => {
        this.cache = response;
      })
    );
  }

  create(data: CreateFuelType) {
    return this.http.post<string>(`${this.apiUrl}`, data).pipe(
      tap((response: string) => {
        console.log('Formulário enviado com sucesso!', response);
        this.clearCache();
      })
    );
  }

  update(data: FuelType, id: string) {
    return this.http.put<string>(`${this.apiUrl}/${id}`, data).pipe(
      tap((response: string) => {
        console.log('Formulário enviado com sucesso!', response);
        this.clearCache();
      })
    );
  }

  delete(id: string) {
    return this.http.delete<string>(`${this.apiUrl}/${id}`).pipe(
      tap((response: string) => {
        console.log('Combustivel deletado com sucesso!', response);
        this.clearCache();
      })
    );
  }

  private clearCache() {
    this.cache = null;
  }
}
