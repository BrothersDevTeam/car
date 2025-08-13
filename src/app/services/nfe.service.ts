import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { createNfe, Nfe, TipoNfe } from '@interfaces/nfe';
import { PaginationResponse } from '@interfaces/pagination';
import { first, Observable, of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NfeService {
  // private cache: PaginationResponse<Nfe> | null = null;

  // Mock cache
  private cache: PaginationResponse<Nfe> | null = {
    content: [
      {
        id: '1234lk1j234lkj',
        chaveAcesso: '',
        numero: 1,
        serie: 1,
        cfop: '5101',
        tipo: TipoNfe.COMPRA_VEICULO_USADO,
        dataEmissao: '22-08-2025',
        valorTotal: 100,
        status: 'Autorizada',
        emitente: {
          cnpj: '112341324',
          razaoSocial: 'RASÃO SOCIAL EXEMPLO LTDA',
          nomeFantasia: 'NOME FANTASIA EXEMPLO',
        },
        idDestinatario: '1',
        idVeiculo: '1',
      },
      {
        id: '2234lk1j234lkj',
        chaveAcesso: '',
        numero: 2,
        serie: 2,
        cfop: '5101',
        tipo: TipoNfe.COMPRA_VEICULO_USADO,
        dataEmissao: '22-08-2025',
        valorTotal: 100,
        status: 'Em digitacao',
        emitente: {
          cnpj: '112341324',
          razaoSocial: 'RASÃO SOCIAL EXEMPLO LTDA',
          nomeFantasia: 'NOME FANTASIA EXEMPLO',
        },
        idDestinatario: '1',
        idVeiculo: '2',
      },
    ],
    page: 0,
    size: 0,
    totalElements: 2,
    totalPages: 0,
  };

  private readonly apiUrl: string = '/api/nfe';

  constructor(private http: HttpClient) {}

  getPaginatedData(
    pageIndex: number,
    pageSize: number
  ): Observable<PaginationResponse<Nfe>> {
    if (this.cache) {
      return of(this.cache);
    }
    return this.http
      .get<PaginationResponse<Nfe>>(
        `${this.apiUrl}?page=${pageIndex}&size=${pageSize}`
      )
      .pipe(
        first(),
        tap((response) => {
          this.cache = response;

          this.cache.totalElements = this.cache.content.length;
        })
      );
  }

  getNfe(id: string): Observable<Nfe> {
    return this.http.get<Nfe>(`${this.apiUrl}?nfeId=${id}`).pipe(first());
  }

  create(data: createNfe) {
    return this.http.post<string>(`${this.apiUrl}`, data).pipe(
      tap((response: string) => {
        console.log('Formulário enviado com sucesso!', response);
        this.clearCache();
      })
    );
  }

  update(data: Nfe) {
    return this.http.put<string>(`${this.apiUrl}`, data).pipe(
      tap((response: string) => {
        console.log('Formulário enviado com sucesso!', response);
        this.clearCache();
      })
    );
  }

  // Verificar como lidaremos com o cancelamento de NFe
  delete(id: string) {
    return this.http.delete<string>(`${this.apiUrl}/${id}`).pipe(
      tap((response: string) => {
        console.log('NFe cancelada com sucesso!', response);
        this.clearCache();
      })
    );
  }

  private clearCache() {
    this.cache = null;
  }
}
