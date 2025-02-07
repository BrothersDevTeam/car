import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Person, ReqPerson } from '@interfaces/entity';
import { PaginationResponse } from '@interfaces/pagination';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PersonService {
  private apiUrl = 'http://controleautorevenda.duckdns.org/api/v1/clients'

  constructor(private http: HttpClient) { }

  getPaginatedData(page: number, size: number): Observable<PaginationResponse<Person>> {
    return this.http.get<PaginationResponse<Person>>(`${this.apiUrl}?page=${page}&size=${size}`);
  }

  create(data: ReqPerson) {
    return this.http.post<Person>(`${this.apiUrl}`, data);
  }
}
