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
  private readonly employeeApiUrl: string = '/api/employees';

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

  /**
   * Cria um usuário de acesso ao sistema para uma pessoa já cadastrada.
   * Endpoint: POST /api/employees/{personId}/create-user
   * Requer: 'edit:store' ou 'root:admin'
   */
  createUserForPerson(
    personId: string,
    data: { username: string; password: string; authorizations: string[] }
  ): Observable<any> {
    return this.http.post<any>(
      `${this.employeeApiUrl}/${personId}/create-user`,
      data
    );
  }

  /**
   * Desvincula o usuário de uma pessoa (revoga o acesso ao sistema).
   * A pessoa continua no cadastro como CLIENTE.
   * Endpoint: DELETE /api/employees/unlink-user/{userId}
   * Requer: 'edit:store'
   */
  unlinkUser(userId: string): Observable<any> {
    return this.http.delete<any>(
      `${this.employeeApiUrl}/unlink-user/${userId}`
    );
  }

  /**
   * Altera o tipo de vínculo (relationship) de um funcionário.
   * Endpoint: PUT /api/employees/{personId}/relationship?type=...
   */
  updateRelationship(personId: string, type: string): Observable<any> {
    return this.http.put<any>(
      `${this.employeeApiUrl}/${personId}/relationship`,
      {},
      { params: new HttpParams().set('type', type) }
    );
  }
}
