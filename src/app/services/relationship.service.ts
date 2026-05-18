import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { first, Observable } from 'rxjs';
import { RelationshipResponse, RelationshipRequest } from '@interfaces/relationship';

@Injectable({
  providedIn: 'root',
})
export class RelationshipService {
  private readonly apiUrl: string = '/api/relationships';

  constructor(private http: HttpClient) {}

  /**
   * Retorna todos os relacionamentos disponíveis para o tenant logado (globais + customizados)
   */
  getAll(): Observable<RelationshipResponse[]> {
    return this.http.get<RelationshipResponse[]>(this.apiUrl).pipe(first());
  }

  /**
   * Busca um relacionamento pelo seu ID
   */
  getById(id: string): Observable<RelationshipResponse> {
    return this.http.get<RelationshipResponse>(`${this.apiUrl}/${id}`).pipe(first());
  }

  /**
   * Cadastra um novo relacionamento para uma loja específica
   */
  create(storeId: string, data: RelationshipRequest): Observable<RelationshipResponse> {
    return this.http.post<RelationshipResponse>(`${this.apiUrl}/store/${storeId}`, data).pipe(first());
  }

  /**
   * Atualiza um relacionamento existente
   */
  update(id: string, data: RelationshipRequest): Observable<RelationshipResponse> {
    return this.http.put<RelationshipResponse>(`${this.apiUrl}/${id}`, data).pipe(first());
  }

  /**
   * Exclui um relacionamento
   */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(first());
  }
}
