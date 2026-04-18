import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Interface espelho do DTO ParametroFiscalRecordDto do backend.
 */
export interface ParametroFiscal {
  // Opcional no submit de creation
  parametroFiscalId?: string;

  // Obrigatórios
  parametroFiscalRegimeTributario: string;
  parametroFiscalCalculoAutomaticoImpostos: boolean;

  // Opcionais comuns
  parametroFiscalUtilizarCreditoIcms?: boolean;
  parametroFiscalUtilizarCreditoPisCofins?: boolean;
  parametroFiscalObservacoes?: string;
  parametroFiscalHabilitaNfe?: boolean;
  parametroFiscalHabilitaNfce?: boolean;

  // Certificado
  parametroFiscalCertificadoBase64?: string;
  parametroFiscalSenhaCertificado?: string;

  // Controle interno Focus NFe (Apenas leitura)
  parametroFiscalCadastradoFocusNfe?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ParametroFiscalService {
  private readonly apiUrl: string = '/api/fiscal/parametros';

  constructor(private http: HttpClient) {}

  /**
   * Busca os parâmetros fiscais de uma loja específica.
   */
  getByStoreId(storeId: string): Observable<ParametroFiscal> {
    return this.http.get<ParametroFiscal>(`${this.apiUrl}/${storeId}`);
  }

  /**
   * Cria os parâmetros fiscais para uma loja específica.
   */
  create(storeId: string, data: ParametroFiscal): Observable<ParametroFiscal> {
    return this.http.post<ParametroFiscal>(`${this.apiUrl}/${storeId}`, data);
  }

  /**
   * Atualiza os parâmetros fiscais de uma loja específica.
   */
  update(storeId: string, data: ParametroFiscal): Observable<ParametroFiscal> {
    return this.http.put<ParametroFiscal>(`${this.apiUrl}/${storeId}`, data);
  }
}
