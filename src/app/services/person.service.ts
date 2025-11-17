import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, first, Observable, of, tap } from 'rxjs';

import {
  CreateLegalEntity,
  CreateNaturalPerson,
  Person,
} from '@interfaces/person';
import { PaginationResponse } from '@interfaces/pagination';
import { AuthService } from './auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class PersonService {
  private cache: PaginationResponse<Person> | null = null;

  // Subject para notificar mudanças no cache
  private cacheUpdated$ =
    new BehaviorSubject<PaginationResponse<Person> | null>(null);

  private readonly apiUrl: string = '/api/persons';

  constructor(private http: HttpClient, private authService: AuthService) {}

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
  pageSize: number,
  searchParams?: {
    name?: string;
    cpf?: string;
    cnpj?: string;
    email?: string;
    storeId?: string;
    search?: string;
    relationshipTypes?: string[];  // Parâmetro para filtrar por tipos de relacionamento
    roleNames?: string[];  // NOVO: Parâmetro para filtrar por roles
  }
): Observable<PaginationResponse<Person>> {
  // Se houver parâmetros de busca, não usa cache
  // Verifica se há algum parâmetro de busca válido (string com conteúdo ou array não vazio)
  const hasSearchParams =
    searchParams &&
    Object.values(searchParams).some((value) => {
      if (Array.isArray(value)) {
        return value.length > 0; // Array não vazio
      }
      return value && typeof value === 'string' && value.trim(); // String com conteúdo
    });

  if (this.cache && !hasSearchParams) {
    return of(this.cache);
  }

  // Monta a URL com os parâmetros
  let url = `${this.apiUrl}?page=${pageIndex}&size=${pageSize}`;

  if (hasSearchParams && searchParams) {
    // NOVA LÓGICA: Se houver parâmetro "search", usa busca global
    if (searchParams.search?.trim()) {
      url += `&search=${encodeURIComponent(searchParams.search.trim())}`;
    } 
    // Caso contrário, usa busca específica por campo
    else {
      if (searchParams.name?.trim()) {
        url += `&name=${encodeURIComponent(searchParams.name.trim())}`;
      }
      if (searchParams.cpf?.trim()) {
        url += `&cpf=${encodeURIComponent(searchParams.cpf.trim())}`;
      }
      if (searchParams.cnpj?.trim()) {
        url += `&cnpj=${encodeURIComponent(searchParams.cnpj.trim())}`;
      }
      if (searchParams.email?.trim()) {
        url += `&email=${encodeURIComponent(searchParams.email.trim())}`;
      }
      if (searchParams.storeId?.trim()) {
        url += `&storeId=${encodeURIComponent(searchParams.storeId.trim())}`;
      }
    }
    
    // Adiciona o filtro de relationshipTypes se fornecido
    // O backend espera múltiplos valores no formato: ?relationshipTypes=CLIENTE&relationshipTypes=FUNCIONARIO
    if (searchParams.relationshipTypes && searchParams.relationshipTypes.length > 0) {
      searchParams.relationshipTypes.forEach(type => {
        url += `&relationshipTypes=${encodeURIComponent(type)}`;
      });
    }

    // NOVO: Adiciona o filtro de roleNames se fornecido
    // O backend espera múltiplos valores no formato: ?roleNames=ROLE_SELLER&roleNames=ROLE_MANAGER
    if (searchParams.roleNames && searchParams.roleNames.length > 0) {
      searchParams.roleNames.forEach(role => {
        url += `&roleNames=${encodeURIComponent(role)}`;
      });
    }
  }

  console.log('🔍 URL construída:', url);  // DEBUG: Ver a URL completa

  return this.http.get<PaginationResponse<Person>>(url).pipe(
    first(),
    tap((response) => {
      console.log('✅ Resposta original do backend:', response);

      // Só atualiza o cache se não houver busca
      if (!hasSearchParams) {
        this.cache = response;
        this.cache.content = this.filterByActive(this.cache.content);
        this.cache.page.totalElements = this.cache.content.length;

        // Notifica sobre o carregamento inicial com uma nova referência
        this.cacheUpdated$.next({ ...this.cache });
      } else {
        // Se houver busca, filtra mas não armazena em cache
        response.content = this.filterByActive(response.content);
        response.page.totalElements = response.content.length;
      }
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

  getById(id: string): Observable<Person> {
    return this.http.get<Person>(`${this.apiUrl}/${id}`).pipe(first());
  }

  getUserRole(): string | null {
    const roles = this.authService.getRoles();
    return roles && roles.length > 0 ? roles[0] : null;
  }

  hasRole(roleName: string): boolean {
    const roles = this.authService.getRoles();
    return roles.includes(roleName);
  }
}
