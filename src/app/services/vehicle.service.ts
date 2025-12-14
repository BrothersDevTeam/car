import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, first, Observable, of, tap } from 'rxjs';

import { PaginationResponse } from '@interfaces/pagination';
import { CreateVehicle, Vehicle } from '@interfaces/vehicle';
import { MessageResponse } from '@interfaces/message-response';

@Injectable({
  providedIn: 'root',
})
export class VehicleService {
  private cache: PaginationResponse<Vehicle> | null = null;

  // Subject para notificar mudanças no cache
  private cacheUpdated$ =
    new BehaviorSubject<PaginationResponse<Vehicle> | null>(null);

  private readonly apiUrl: string = '/api/vehicles';

  constructor(private http: HttpClient) {}

  // Observable público para componentes se inscreverem
  get cacheUpdated(): Observable<PaginationResponse<Vehicle> | null> {
    return this.cacheUpdated$.asObservable();
  }

  getPaginatedData(
    pageIndex: number,
    pageSize: number
  ): Observable<PaginationResponse<Vehicle>> {
    if (this.cache) {
      return of(this.cache);
    }
    return this.http
      .get<
        PaginationResponse<Vehicle>
      >(`${this.apiUrl}?page=${pageIndex}&size=${pageSize}`)
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
    return this.http.post<Vehicle>(`${this.apiUrl}`, data).pipe(
      tap((response) => {
        console.log('Veículo criado com sucesso!', response);
        this.clearCache();
      })
    );
  }

  update(data: Vehicle) {
    return this.http
      .put<Vehicle>(`${this.apiUrl}/${data.vehicleId}`, data)
      .pipe(
        tap((response) => {
          console.log('Veículo atualizado com sucesso!', response);
          this.clearCache();
        })
      );
  }

  delete(id: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.apiUrl}/${id}`).pipe(
      tap((response) => {
        console.log('Resposta do servidor:', response.message);
        this.clearCache();
      })
    );
  }

  private clearCache() {
    this.cache = null;
    this.cacheUpdated$.next(null);
  }
}
