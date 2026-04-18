import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Person } from '@interfaces/person';
import { PaginationResponse } from '@interfaces/pagination';

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  private readonly apiUrl: string = '/api/persons/employees';

  constructor(private http: HttpClient) {}

  getPaginatedEmployees(
    pageIndex: number,
    pageSize: number,
    searchParams?: {
      storeId?: string;
      search?: string;
      includeInactive?: boolean;
    }
  ): Observable<PaginationResponse<Person>> {
    let params = new HttpParams()
      .set('page', pageIndex.toString())
      .set('size', pageSize.toString());

    if (searchParams) {
      if (searchParams.storeId) {
        params = params.set('storeId', searchParams.storeId);
      }
      if (searchParams.search) {
        params = params.set('search', searchParams.search);
      }
      // Aqui não precisamos mais passar os relationshipTypes (PROPRIETARIO, GERENTE, VENDEDOR)
      // pois o backend já resolve quem é funcionário baseado nas Authorizations do usuário logado.
    }

    return this.http
      .get<PaginationResponse<Person>>(this.apiUrl, { params })
      .pipe(
        map((response) => {
          if (!searchParams?.includeInactive) {
            response.content = response.content.filter(
              (person) => person.active
            );
            response.page.totalElements = response.content.length;
          }
          return response;
        })
      );
  }
}
