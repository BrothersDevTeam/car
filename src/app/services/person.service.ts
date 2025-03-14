import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { first, Observable, of, tap } from 'rxjs';
import {
  CreateLegalEntity,
  CreateNaturalPerson,
  Person,
} from '@interfaces/entity';
import { PaginationResponse } from '@interfaces/pagination';

@Injectable({
  providedIn: 'root',
})
export class PersonService {
  private cache: PaginationResponse<Person> | null = null;
  private readonly apiUrl: string = '/api/v1/clients';

  constructor(private http: HttpClient) {}

  getPaginatedData(
    pageIndex: number,
    pageSize: number
  ): Observable<PaginationResponse<Person>> {
    if (this.cache) {
      return of(this.cache);
    }
    return this.http
      .get<PaginationResponse<Person>>(
        `${this.apiUrl}?page=${pageIndex}&size=${pageSize}`
      )
      .pipe(
        first(),
        tap((response) => {
          this.cache = response;

          this.cache.content = this.cache.content.filter(
            (element) =>
              element.person.active &&
              (!!element.person.cnpj || !!element.person.cpf)
          );

          this.cache.totalElements = this.cache.content.length;
        })
      );
  }

  create(data: CreateNaturalPerson | CreateLegalEntity) {
    return this.http.post<string>(`${this.apiUrl}`, data).pipe(
      tap((response: string) => {
        console.log('Formulário enviado com sucesso!', response);
        this.clearCache();
      })
    );
  }

  update(data: CreateNaturalPerson | CreateLegalEntity, id: string) {
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
