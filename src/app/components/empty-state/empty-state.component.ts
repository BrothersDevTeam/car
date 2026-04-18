import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  @Input({ required: true }) icon: string = 'sentiment_dissatisfied';
  @Input({ required: true }) title: string = 'Nenhum dado encontrado';
  @Input({ required: false }) description: string =
    'Tente ajustar seus filtros ou realizar uma nova busca.';
}
