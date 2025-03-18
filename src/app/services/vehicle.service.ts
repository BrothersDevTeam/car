import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { first, Observable, of, tap } from 'rxjs';

import { PaginationResponse } from '@interfaces/pagination';
import { CreateVehicle, GetVehicle, Vehicle } from '@interfaces/vehicle';

@Injectable({
  providedIn: 'root',
})
export class VehicleService {
  private cache: PaginationResponse<GetVehicle> | null = null;
  private readonly apiUrl: string = 'api/v1/vehicles';

  constructor(private http: HttpClient) {}

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
        })
      );

    // Mock
    // return of(
    //   (this.cache = {
    //     content: [
    //       {
    //         id: '1',
    //         licensePlate: 'ABC-1234',
    //         brand: { id: '1', name: 'Volkswagen' },
    //         model: { id: '1', name: 'Fusca' },
    //         yearModel: '1970',
    //         color: 'Azul',
    //         origin: 'nacional',
    //       },
    //       {
    //         id: '2',
    //         licensePlate: 'DEF-5678',
    //         model: { id: '2', name: 'Gol' },
    //         brand: { id: '1', name: 'Volkswagen' },
    //         yearModel: '2000',
    //         color: 'Azul',
    //         origin: 'nacional',
    //       },
    //     ],
    //     page: 0,
    //     size: 1000,
    //     totalElements: 3,
    //     totalPages: 1,
    //   })
    // );
  }

  create(data: CreateVehicle) {
    return this.http.post<string>(`${this.apiUrl}`, data).pipe(
      tap((response: string) => {
        console.log('Formulário enviado com sucesso!', response);
        this.clearCache();
      })
    );
  }

  update(data: Vehicle, id: string) {
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
        console.log('Cliente deletado com sucesso!', response);
        this.clearCache();
      })
    );
  }

  private clearCache() {
    this.cache = null;
  }
}
