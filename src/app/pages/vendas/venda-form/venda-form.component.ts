import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ContentHeaderComponent } from '@components/content-header/content-header.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-venda-form',
  standalone: true,
  imports: [CommonModule, ContentHeaderComponent, MatButtonModule, MatIconModule],
  template: `
    <app-content-header [title]="title" [subtitle]="subtitle">
      <button mat-stroked-button (click)="goBack()">
        <mat-icon>arrow_back</mat-icon>
        Voltar para lista
      </button>
    </app-content-header>
    
    <div style="padding: 24px;">
      <p>Módulo de Vendas em desenvolvimento. Este é o formulário de <strong>{{ isEdit ? 'Edição' : 'Criação' }}</strong> de venda.</p>
      <p *ngIf="isEdit">Editando venda ID: <strong>{{ vendaId }}</strong></p>
    </div>
  `
})
export class VendaFormComponent implements OnInit {
  isEdit = false;
  vendaId: string | null = null;
  title = 'Nova Venda';
  subtitle = 'Registrar uma nova venda de veículo';

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.vendaId = this.route.snapshot.paramMap.get('id');
    if (this.vendaId) {
      this.isEdit = true;
      this.title = 'Editar Venda';
      this.subtitle = `Editando os detalhes da venda ID: ${this.vendaId}`;
    }
  }

  goBack() {
    this.router.navigate(['/vendas']);
  }
}
