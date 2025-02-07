import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateLegalEntity, CreateNaturalPerson, Person } from '@interfaces/entity';
import { PaginationResponse } from '@interfaces/pagination';

@Injectable({
  providedIn: 'root'
})
export class PersonService {
  private apiUrl = 'http://controleautorevenda.duckdns.org/api/v1/clients'

  constructor(private http: HttpClient) { }

  getPaginatedData(page: number, size: number): Observable<PaginationResponse<Person>> {
    return this.http.get<PaginationResponse<Person>>(`${this.apiUrl}?page=${page}&size=${size}`);
  }

  create(data: CreateNaturalPerson | CreateLegalEntity) {
    return this.http.post<Person>(`${this.apiUrl}`, data);
  }
}
