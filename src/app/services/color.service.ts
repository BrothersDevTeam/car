import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { first, Observable, of, tap } from 'rxjs';

import { Color, CreateColor } from '@interfaces/vehicle';

@Injectable({
  providedIn: 'root',
})
export class ColorService {
  private cache: Color[] | null = null;

  // private cache: Color[] | null = [
  //   { id: '1', description: 'BRANCO' },
  //   { id: '2', description: 'PRETO' },
  //   { id: '3', description: 'AZUL' },
  //   { id: '4', description: 'VERDE' },
  //   { id: '5', description: 'VERMELHO' },
  //   { id: '6', description: 'AMARELO' },
  //   { id: '7', description: 'CINZA' },
  // ];

  private readonly apiUrl: string = '/api/vehicles/colors';

  constructor(private http: HttpClient) {}

  getColors(): Observable<Color[]> {
    if (this.cache) {
      return of(this.cache);
    }
    return this.http.get<Color[]>(`${this.apiUrl}`).pipe(
      first(),
      tap((response) => {
        this.cache = response;
      })
    );
  }

  create(data: CreateColor) {
    return this.http.post<string>(`${this.apiUrl}`, data).pipe(
      tap((response: string) => {
        console.log('Formulário enviado com sucesso!', response);
        this.clearCache();
      })
    );
  }

  update(data: Color) {
    return this.http.put<string>(`${this.apiUrl}`, data).pipe(
      tap((response: string) => {
        console.log('Formulário enviado com sucesso!', response);
        this.clearCache();
      })
    );
  }

  delete(id: string) {
    return this.http.delete<string>(`${this.apiUrl}/${id}`).pipe(
      tap((response: string) => {
        console.log('Cor deletada com sucesso!', response);
        this.clearCache();
      })
    );
  }

  private clearCache() {
    this.cache = null;
  }
}
