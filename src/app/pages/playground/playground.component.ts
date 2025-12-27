import { Component } from '@angular/core';
import { NfeComponent } from '../nfe/nfe.component';
import { NfeService } from '../../services/nfe.service';
import { of } from 'rxjs';

@Component({
  selector: 'app-playground',
  standalone: true,
  imports: [NfeComponent],
  providers: [
    {
      provide: NfeService,
      useValue: {
        getPaginatedData: () =>
          of({
            content: [
              {
                nfeNumero: '12345',
                nfeStatus: 'Em digitacao',
                nfeItens: [{ itemCfop: '5102' }],
                nfeNaturezaOperacao: 'Venda de Mercadoria',
                createdAt: new Date().toISOString(),
                nfeDataEmissao: new Date().toISOString(),
                status: 'Em digitacao',
                nfeTipoDocumento: 'Venda',
                valorTotal: 1500.0,
              },
            ],
            page: {
              totalElements: 1,
              totalPages: 1,
              size: 10,
              number: 0,
            },
          }),
      },
    },
  ],
  template: `
    <div
      style="justify-content: center align-items: center; padding: 0rem; background-color: #323232; height: 100vh; overflow: auto;"
    >
      <!-- Componente em teste -->
      <app-nfe></app-nfe>
    </div>
  `,
})
export class PlaygroundComponent {}
