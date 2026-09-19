import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { Cfop, CfopSearchFilters } from '@interfaces/cfop';
import { PaginationResponse } from '@interfaces/pagination';
import { NaturezaOperacao } from '@interfaces/nfe';

@Injectable({
  providedIn: 'root',
})
export class CfopService {
  private readonly apiUrl = '/api/fiscal/cfop';
  private cache = new Map<string, Cfop>();

  constructor(private http: HttpClient) {}

  /**
   * Lista CFOPs com filtros e paginação.
   */
  getAll(filters?: CfopSearchFilters): Observable<PaginationResponse<Cfop>> {
    let params = new HttpParams();

    if (filters) {
      if (filters.codigo) params = params.set('codigo', filters.codigo.replace(/\D/g, ''));
      if (filters.descricao) params = params.set('descricao', filters.descricao);
      if (filters.tipoOperacao) params = params.set('tipoOperacao', filters.tipoOperacao);
      if (filters.localDestino) params = params.set('localDestino', filters.localDestino);
      if (filters.ativo !== undefined) params = params.set('ativo', filters.ativo.toString());
      if (filters.page !== undefined) params = params.set('page', filters.page.toString());
      if (filters.size !== undefined) params = params.set('size', filters.size.toString());
      if (filters.sort) params = params.set('sort', filters.sort);
    }

    return this.http.get<PaginationResponse<Cfop>>(this.apiUrl, { params }).pipe(
      tap((response: any) => {
        const items: Cfop[] =
          response?.content ||
          response?._embedded?.cfopModelList ||
          response?._embedded?.cfopModels ||
          (Array.isArray(response) ? response : []);
        items.forEach((item) => {
          if (item?.cfopCodigo) {
            this.cache.set(item.cfopCodigo, item);
          }
        });
      }),
    );
  }

  /**
   * Busca CFOP diretamente pelo código de 4 dígitos.
   */
  getByCodigo(codigo: string): Observable<Cfop> {
    const cleanCodigo = codigo.replace(/\D/g, '');
    if (this.cache.has(cleanCodigo)) {
      return of(this.cache.get(cleanCodigo)!);
    }

    return this.http.get<Cfop>(`${this.apiUrl}/codigo/${cleanCodigo}`).pipe(
      tap((cfop) => {
        if (cfop?.cfopCodigo) {
          this.cache.set(cfop.cfopCodigo, cfop);
        }
      }),
    );
  }

  /**
   * Formata o código CFOP para exibição (ex: '1102' -> '1.102').
   */
  formatCfop(codigo: string | null | undefined): string {
    if (!codigo) return '';
    const clean = codigo.replace(/\D/g, '');
    if (clean.length === 4) {
      return `${clean.charAt(0)}.${clean.substring(1)}`;
    }
    return clean;
  }

  /**
   * Desformata o código CFOP para envio (ex: '1.102' -> '1102').
   */
  cleanCfop(codigo: string | null | undefined): string {
    if (!codigo) return '';
    return codigo.replace(/\D/g, '');
  }

  /**
   * Retorna o CFOP sugerido de acordo com a Natureza da Operação e destino (Estadual vs Interestadual).
   */
  getSuggestedCfop(
    natureza: NaturezaOperacao | string | null | undefined,
    isInterestadual: boolean,
    tipoOperacao: 'E' | 'S',
  ): string {
    if (!natureza) {
      return tipoOperacao === 'E' ? (isInterestadual ? '2102' : '1102') : (isInterestadual ? '6102' : '5102');
    }

    if (tipoOperacao === 'E') {
      switch (natureza) {
        case NaturezaOperacao.COMPRA_VEICULO_PARA_ESTOQUE:
        case 'COMPRA DE VEÍCULO USADO':
        case 'COMPRA DE VEICULO USADO':
          return isInterestadual ? '2102' : '1102';
        case NaturezaOperacao.ENTRADA_CONSIGNACAO:
          return isInterestadual ? '2917' : '1917';
        case NaturezaOperacao.COMPRA_DEFINITIVA_CONSIGNACAO:
        case 'COMPRA DEFINITIVA DE VEICULO EM CONSIGNAÇÃO':
        case 'COMPRA DEFINITIVA':
          return isInterestadual ? '2113' : '1113';
        case NaturezaOperacao.DEVOLUCAO_VENDA:
          return isInterestadual ? '2202' : '1202';
        case NaturezaOperacao.ENTRADA_CONTRATO_COMISSAO:
          return isInterestadual ? '2949' : '1949';
        default:
          return isInterestadual ? '2102' : '1102';
      }
    } else {
      switch (natureza) {
        case NaturezaOperacao.VENDA_VEICULO_USADO:
          return isInterestadual ? '6102' : '5102';
        case NaturezaOperacao.VENDA_CONSIGNACAO:
          return isInterestadual ? '6115' : '5115';
        case NaturezaOperacao.DEVOLUCAO_CONSIGNACAO:
          return isInterestadual ? '6918' : '5918';
        case NaturezaOperacao.DEVOLUCAO_SIMBOLICA_CONSIGNACAO:
          return isInterestadual ? '6919' : '5919';
        case NaturezaOperacao.DEVOLUCAO_COMPRA:
          return isInterestadual ? '6202' : '5202';
        case NaturezaOperacao.SAIDA_CONTRATO_COMISSAO:
          return isInterestadual ? '6949' : '5949';
        case NaturezaOperacao.TRANSFERENCIA_MERCADORIA:
          return isInterestadual ? '6152' : '5152';
        default:
          return isInterestadual ? '6102' : '5102';
      }
    }
  }
}
