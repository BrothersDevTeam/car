import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ViaCepResponse } from '@interfaces/address';

@Injectable({
  providedIn: 'root',
})
export class CepService {
  constructor(private http: HttpClient) {}

  getAddressByCep(cep: string): Observable<ViaCepResponse> {
    return this.http.get<ViaCepResponse>(
      `https://viacep.com.br/ws/${cep}/json/`
    );
  }
}
