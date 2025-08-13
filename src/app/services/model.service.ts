import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { first, Observable, of, tap } from 'rxjs';

import { CreateModel, Model } from '@interfaces/vehicle';

@Injectable({
  providedIn: 'root',
})
export class ModelService {
  private cache: Model[] | null = null;
  private cacheBrandId: string = '';

  // private cache: Model[] | null = [
  //   { id: '1', description: 'ES', brand: { id: '1', description: 'HONDA' } },
  //   { id: '2', description: 'CIVIC', brand: { id: '1', description: 'HONDA' } },
  //   { id: '3', description: 'CR-V', brand: { id: '1', description: 'HONDA' } },
  //   { id: '4', description: 'FIESTA', brand: { id: '2', description: 'FIAT' } },
  //   { id: '5', description: 'PALIO', brand: { id: '2', description: 'FIAT' } },
  //   { id: '6', description: 'FUSION', brand: { id: '3', description: 'FORD' } },
  //   {
  //     id: '7',
  //     description: 'COROLLA',
  //     brand: { id: '5', description: 'TOYOTA' },
  //   },
  //   {
  //     id: '8',
  //     description: 'HB20',
  //     brand: { id: '6', description: 'HYUNDAI' },
  //   },
  // ];

  private readonly apiUrl: string = '/api/vehicles/models';

  constructor(private http: HttpClient) {}

  getModels(id: string): Observable<Model[]> {
    if (this.cache && this.cacheBrandId === id) {
      return of(this.cache);
    }
    this.cacheBrandId = id;
    return this.http.get<Model[]>(`${this.apiUrl}?brandId=${id}`).pipe(
      first(),
      tap((response) => {
        this.cache = response;
      })
    );
  }

  create(data: CreateModel) {
    return this.http.post<string>(`${this.apiUrl}`, data).pipe(
      tap((response: string) => {
        console.log('Formulário enviado com sucesso!', response);
        this.clearCache();
      })
    );
  }

  update(data: Model) {
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
        console.log('Modelo deletado com sucesso!', response);
        this.clearCache();
      })
    );
  }

  private clearCache() {
    this.cache = null;
  }
}
