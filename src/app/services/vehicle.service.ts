import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PaginationResponse } from '@interfaces/pagination';
import { Vehicle } from '@interfaces/vehicle';
import { first, Observable, of, tap } from 'rxjs';

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
    // return this.http
    //   .get<PaginationResponse<Vehicle>>(
    //     `${this.apiUrl}?page=${pageIndex}&size=${pageSize}`
    //   )
    //   .pipe(
    //     first(),
    //     tap((response) => {
    //       this.cache = response;
    //     })
    //   );

    // Mock
    return of(
      (this.cache = {
        content: [
          {
            id: '1',
            vehicle: {
              plate: 'ABC-1234',
              brand: 'Volkswagen',
              model: 'Fusca',
              year: '1970',
              color: 'Azul',
              active: true,
              imported: false,
            },
          },
          {
            id: '2',
            vehicle: {
              plate: 'DEF-5678',
              model: 'Gol',
              brand: 'Volkswagen',
              year: '2000',
              color: 'Azul',
              active: true,
              imported: false,
            },
          },
          {
            id: '3',
            vehicle: {
              plate: 'GHI-9012',
              model: 'Uno',
              brand: 'Fiat',
              year: '1990',
              color: 'Azul',
              active: true,
              imported: false,
            },
          },
        ],
        page: 0,
        size: 1000,
        totalElements: 3,
        totalPages: 1,
      })
    );
  }
}
