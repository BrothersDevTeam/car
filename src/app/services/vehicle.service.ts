import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, first, Observable, of, tap } from 'rxjs';

import { PaginationResponse } from '@interfaces/pagination';
import { CreateVehicle, Vehicle, VehicleList } from '@interfaces/vehicle';
import { MessageResponse } from '@interfaces/message-response';

@Injectable({
  providedIn: 'root',
})
export class VehicleService {
  private cache: PaginationResponse<VehicleList> | null = null;

  // Subject para notificar mudanças no cache
  private cacheUpdated$ =
    new BehaviorSubject<PaginationResponse<VehicleList> | null>(null);

  private readonly apiUrl: string = '/api/vehicles';

  constructor(private http: HttpClient) {}

  // Observable público para componentes se inscreverem
  get cacheUpdated(): Observable<PaginationResponse<VehicleList> | null> {
    return this.cacheUpdated$.asObservable();
  }

  getPaginatedData(
    pageIndex: number,
    pageSize: number,
    searchParams?: {
      search?: string;
      storeId?: string;
      onlyInStock?: boolean;
      status?: 'DISPONIVEL' | 'VENDIDO' | 'TODOS';
    }
  ): Observable<PaginationResponse<VehicleList>> {
    const hasSearchParams =
      searchParams && Object.keys(searchParams).length > 0;

    // Only use cache if there are no search params
    if (this.cache && !hasSearchParams) {
      return of(this.cache);
    }

    let url = `${this.apiUrl}?page=${pageIndex}&size=${pageSize}`;

    if (searchParams) {
      if (searchParams.search?.trim()) {
        url += `&search=${encodeURIComponent(searchParams.search.trim())}`;
      }
      if (searchParams.storeId?.trim()) {
        url += `&storeId=${encodeURIComponent(searchParams.storeId.trim())}`;
      }

      // Prioritize the new 'status' filter
      if (searchParams.status === 'DISPONIVEL') {
        url += `&exitDate=true`; // is null (Available)
      } else if (searchParams.status === 'VENDIDO') {
        url += `&exitDate=false`; // is not null (Sold)
      } else if (searchParams.onlyInStock) {
        // Fallback for backward compatibility
        url += `&exitDate=true`;
      }
    }

    return this.http.get<PaginationResponse<VehicleList>>(url).pipe(
      first(),
      tap((response) => {
        // Only update general cache if it's not a search result
        if (!hasSearchParams) {
          this.cache = response;
          this.cacheUpdated$.next({ ...this.cache });
        }
      })
    );
  }

  getById(id: string): Observable<Vehicle> {
    return this.http.get<Vehicle>(`${this.apiUrl}/${id}`).pipe(first());
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

  public clearCache() {
    this.cache = null;
    this.cacheUpdated$.next(null);
  }
}
