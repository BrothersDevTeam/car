import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, first, Observable, of, tap } from 'rxjs';

import { PaginationResponse } from '@interfaces/pagination';
import { CreateVehicle, GetVehicle, Vehicle } from '@interfaces/vehicle';

@Injectable({
  providedIn: 'root',
})
export class VehicleService {
  private cache: PaginationResponse<GetVehicle> | null = null;

  // Subject para notificar mudanças no cache
  private cacheUpdated$ =
    new BehaviorSubject<PaginationResponse<GetVehicle> | null>(null);

  private readonly apiUrl: string = '/api/vehicles';

  constructor(private http: HttpClient) {}

  // Observable público para componentes se inscreverem
  get cacheUpdated(): Observable<PaginationResponse<GetVehicle> | null> {
    return this.cacheUpdated$.asObservable();
  }

  getPaginatedData(
    pageIndex: number,
    pageSize: number
  ): Observable<PaginationResponse<GetVehicle>> {
    if (this.cache) {
      return of(this.cache);
    }
    return this.http
      .get<PaginationResponse<GetVehicle>>(
        `${this.apiUrl}?page=${pageIndex}&size=${pageSize}`
      )
      .pipe(
        first(),
        tap((response) => {
          this.cache = response;

          // Notifica sobre o carregamento inicial com uma nova referência
          this.cacheUpdated$.next({ ...this.cache });
        })
      );
  }

  create(data: CreateVehicle) {
    return this.http.post<string>(`${this.apiUrl}`, data).pipe(
      tap((response: string) => {
        console.log('Formulário enviado com sucesso!', response);
        this.clearCache();
      })
    );
  }

  update(data: Vehicle) {
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
        console.log('Cliente deletado com sucesso!', response);
        this.clearCache();
      })
    );
  }

  private clearCache() {
    this.cache = null;
    this.cacheUpdated$.next(null);
  }
}
