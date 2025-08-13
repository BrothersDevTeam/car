import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { first, tap } from 'rxjs';

import { GenericClient } from '@interfaces/person';

@Injectable({
  providedIn: 'root',
})
export class IssuerService {
  private cache: GenericClient[] | null = null;
  private readonly apiUrl: string = '/api/issuer';

  constructor(private http: HttpClient) {}

  getIssuers() {
    if (this.cache) {
      return this.cache;
    }
    return this.http.get<GenericClient[]>(this.apiUrl).pipe(
      first(),
      tap((response) => {
        this.cache = response;
      })
    );
  }

  create() {
    return this.http.post<string>(this.apiUrl, {}).pipe(
      tap((response: string) => {
        console.log('Formulário enviado com sucesso!', response);
        this.clearCache();
      })
    );
  }

  update(data: GenericClient, id: string) {
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
        console.log('Emissor deletado com sucesso!', response);
        this.clearCache();
      })
    );
  }

  private clearCache() {
    this.cache = null;
  }
}
