import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { first, Observable, of, tap } from 'rxjs';

import {
  CreateLegalEntity,
  CreateNaturalPerson,
  Person,
} from '@interfaces/person';
import { PaginationResponse } from '@interfaces/pagination';

@Injectable({
  providedIn: 'root',
})
export class PersonService {
  private cache: PaginationResponse<Person> | null = null;

  // private cache: PaginationResponse<Person> | null = {
  //   content: [
  //     {
  //       id: '1',
  //       person: {
  //         id: '1',
  //         fullName: 'Usumaki Naruto',
  //         legalName: '',
  //         tradeName: '',
  //         cpf: '123.456.789-00',
  //         cnpj: '',
  //         ie: '',
  //         crt: '',
  //         address: {
  //           street: 'Rua A',
  //           city: 'São Paulo',
  //           number: '123',
  //           complement: 'Apto 1',
  //           state: 'SP',
  //           zipcode: '12345-678',
  //           neighborhood: 'Centro',
  //         },
  //         contact: {
  //           email: 'email@email.com',
  //           phone: '123456789',
  //         },
  //         active: true,
  //       },
  //     },
  //     {
  //       id: '1',
  //       person: {
  //         id: '2',
  //         fullName: 'Obito Uchiha',
  //         legalName: '',
  //         tradeName: '',
  //         cpf: '',
  //         cnpj: '123.456.789/0001-00',
  //         ie: '',
  //         crt: '',
  //         address: {
  //           street: 'Rua A',
  //           city: 'São Paulo',
  //           number: '123',
  //           complement: 'Apto 1',
  //           state: 'SP',
  //           zipcode: '12345-678',
  //           neighborhood: 'Centro',
  //         },
  //         contact: {
  //           email: 'email@email.com',
  //           phone: '123456789',
  //         },
  //         active: true,
  //       },
  //     },
  //   ],
  //   page: 0,
  //   size: 1000,
  //   totalElements: 3,
  //   totalPages: 1,
  // };

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
