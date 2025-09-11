import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, first, Observable, of, tap } from 'rxjs';

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

  // Subject para notificar mudanças no cache
  private cacheUpdated$ =
    new BehaviorSubject<PaginationResponse<Person> | null>(null);

  private readonly apiUrl: string = '/api/persons';

  constructor(private http: HttpClient) { }

  // Observable público para componentes se inscreverem
  get cacheUpdated(): Observable<PaginationResponse<Person> | null> {
    return this.cacheUpdated$.asObservable();
  }

  filterByActive(array: Person[]) {
    return array.filter((person) => person.active);
  }

  // Método para atualizar o cache
  private updatePersonOnCache(person: Person) {
    if (this.cache?.content) {
      // Remove a pessoa antiga do cache
      const filteredCache = this.cache.content.filter(
        (personCache) => personCache.personId !== person.personId
      );

      // Adiciona a pessoa atualizada no início
      const updatedContent = [person, ...filteredCache];

      // Cria uma nova referência para o cache para garantir que o @Input() seja detectado
      this.cache = { ...this.cache, content: updatedContent };

      // Notifica os componentes sobre a mudança com a nova referência
      this.cacheUpdated$.next(this.cache);
    }
  }

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
          console.log('✅ Resposta original do backend:', response);
          this.cache = response;
          this.cache.content = this.filterByActive(this.cache.content);
          this.cache.page.totalElements = this.cache.content.length;

          // Notifica sobre o carregamento inicial com uma nova referência
          this.cacheUpdated$.next({ ...this.cache });
        })
      );
  }

  create(data: Partial<Person>) {
    return this.http.post<string>(`${this.apiUrl}`, data).pipe(
      tap((response: string) => {
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
    this.cacheUpdated$.next(null);
  }

  getUserRole(): string | null {
    return sessionStorage.getItem('car-user-role');
  }
}
