import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CepService {
  constructor() {}

  getAddressByCep(cep: string) {
    return fetch(`https://viacep.com.br/ws/${cep}/json/`)
      .then((response) => response.json())
      .then((data) => {
        return data;
      })
      .catch((error) => {
        console.error('Erro ao buscar endereço pelo CEP', error);
        return null;
      });
  }
}
