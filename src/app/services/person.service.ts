import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { first, Observable, tap } from 'rxjs';
import {
  CreateLegalEntity,
  CreateNaturalPerson,
  Person,
} from '@interfaces/entity';
import { PaginationResponse } from '@interfaces/pagination';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root',
})
export class PersonService {
  private readonly apiUrl =
    'http://controleautorevenda.duckdns.org/api/v1/clients';

  constructor(private http: HttpClient, private toastr: ToastrService) {}

  getPaginatedData(
    page: number,
    size: number
  ): Observable<PaginationResponse<Person>> {
    return this.http
      .get<PaginationResponse<Person>>(
        `${this.apiUrl}?page=${page}&size=${size}`
      )
      .pipe(
        first(),
        tap((response) => {
          console.log('PersonService response: ', response);

          //Filtrar retorno no back enquanto não estiver vindo filtrado da api.

          // response.content = response.content.filter(
          //   (element) =>
          //     element.person.active &&
          //     (!!element.person.cnpj || !!element.person.cpf)
          // );
        })
      );
  }

  create(data: CreateNaturalPerson | CreateLegalEntity) {
    return this.http.post<string>(`${this.apiUrl}`, data).pipe(
      tap((response: string) => {
        console.log('Formulário enviado com sucesso!', response);
      })
    );
  }

  update(data: CreateNaturalPerson | CreateLegalEntity, id: string) {
    return this.http.post<string>(`${this.apiUrl}/${id}`, data).pipe(
      tap((response: string) => {
        console.log('Formulário enviado com sucesso!', response);
      })
    );
  }

  delete(id: string) {
    return this.http.delete<string>(id).pipe(
      tap((response: string) => {
        console.log('Cliente deletado com sucesso!', response);
      })
    );
  }
}
