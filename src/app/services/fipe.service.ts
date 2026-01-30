import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface FipeReference {
  codigo: string;
  nome: string;
}

export interface FipeModelResponse {
  modelos: FipeReference[];
  anos: FipeReference[];
}

export interface FipeVehicleDetails {
  TipoVeiculo: number;
  Valor: string;
  Marca: string;
  Modelo: string;
  AnoModelo: number;
  Combustivel: string;
  CodigoFipe: string;
  MesReferencia: string;
  SiglaCombustivel: string;
}

@Injectable({
  providedIn: 'root',
})
export class FipeService {
  private readonly API_URL = 'https://parallelum.com.br/fipe/api/v1';

  constructor(private http: HttpClient) { }

  getMarcas(type: string): Observable<FipeReference[]> {
    return this.http.get<FipeReference[]>(`${this.API_URL}/${type}/marcas`);
  }

  getModelos(type: string, marcaId: string): Observable<FipeModelResponse> {
    return this.http.get<FipeModelResponse>(
      `${this.API_URL}/${type}/marcas/${marcaId}/modelos`
    );
  }

  getAnos(type: string, marcaId: string, modeloId: string): Observable<FipeReference[]> {
    return this.http.get<FipeReference[]>(
      `${this.API_URL}/${type}/marcas/${marcaId}/modelos/${modeloId}/anos`
    );
  }

  getVehicleDetails(
    type: string,
    marcaId: string,
    modeloId: string,
    anoId: string
  ): Observable<FipeVehicleDetails> {
    return this.http.get<FipeVehicleDetails>(
      `${this.API_URL}/${type}/marcas/${marcaId}/modelos/${modeloId}/anos/${anoId}`
    );
  }
}
