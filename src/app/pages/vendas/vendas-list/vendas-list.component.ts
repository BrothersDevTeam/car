import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentHeaderComponent } from '@components/content-header/content-header.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
  selector: 'app-vendas-list',
  standalone: true,
  imports: [CommonModule, ContentHeaderComponent, MatButtonModule, MatIconModule],
  template: `
    <app-content-header title="Vendas" subtitle="Listagem de vendas de veículos">
      <button mat-flat-button color="primary" (click)="goToNewVenda()">
        <mat-icon>add</mat-icon>
        Registrar Venda
      </button>
    </app-content-header>
    
    <div style="padding: 24px;">
      <p>Módulo de Vendas em desenvolvimento. Esta é a listagem de vendas.</p>
    </div>
  `
})
export class VendasListComponent {
  constructor(private router: Router) {}

  goToNewVenda() {
    this.router.navigate(['/vendas/nova']);
  }
}
