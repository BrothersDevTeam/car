import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { first, Observable, of, tap } from 'rxjs';

import { PaginationResponse } from '@interfaces/pagination';
import { Vehicle } from '@interfaces/vehicle';

@Injectable({
  providedIn: 'root',
})
export class VehicleService {
  private cache: PaginationResponse<Vehicle> | null = null;
  private readonly apiUrl: string = '/api/v1/vehicles';

  constructor(private http: HttpClient) {}

  getPaginatedData(
    pageIndex: number,
    pageSize: number
  ): Observable<PaginationResponse<Vehicle>> {
    if (this.cache) {
      return of(this.cache);
    }
    return this.http
      .get<PaginationResponse<Vehicle>>(
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
}
