import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { first, Observable, of, tap } from 'rxjs';

import { Color, CreateColor, UpdateColor } from '@interfaces/vehicle';
import { PaginationResponse } from '@interfaces/pagination';

@Injectable({
  providedIn: 'root',
})
export class ColorService {
  private cache: PaginationResponse<Color> | null = null;

  private readonly apiUrl: string = '/api/vehicle-colors';

  constructor(private http: HttpClient) {}

  getColors(): Observable<PaginationResponse<Color>> {
    if (this.cache) {
      return of(this.cache);
    }
    // Busca todos os registros (size=1000)
    return this.http
      .get<PaginationResponse<Color>>(`${this.apiUrl}?size=1000`)
      .pipe(
        first(),
        tap((response) => {
          console.log('Colors fetched:', response);
          this.cache = response;
        })
      );
  }

  create(data: CreateColor) {
    return this.http.post<Color>(`${this.apiUrl}`, data).pipe(
      tap((response: Color) => {
        console.log('Cor criada com sucesso!', response);
        this.clearCache();
        // Recarrega o cache
        this.getColors().subscribe();
      })
    );
  }

  update(colorId: string, data: UpdateColor) {
    return this.http.put<Color>(`${this.apiUrl}/${colorId}`, data).pipe(
      tap((response: Color) => {
        console.log('Cor atualizada com sucesso!', response);
        this.clearCache();
        // Recarrega o cache
        this.getColors().subscribe();
      })
    );
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        console.log('Cor deletada com sucesso!');
        this.clearCache();
      })
    );
  }

  private clearCache() {
    this.cache = null;
  }
}
