import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FeedbackStatus } from '@interfaces/feedback';

export interface StepItem {
  id: FeedbackStatus;
  label: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-feedback-stepper',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  templateUrl: './feedback-stepper.component.html',
  styleUrl: './feedback-stepper.component.scss',
})
export class FeedbackStepperComponent {
  @Input() status: FeedbackStatus = 'NEW';
  @Input() compact: boolean = false;
  @Input() adminNotes?: string;

  steps: StepItem[] = [
    { id: 'NEW', label: 'Recebido', description: 'Registrado na plataforma', icon: 'inbox' },
    { id: 'UNDER_REVIEW', label: 'Em Análise', description: 'Triagem e viabilidade técnica', icon: 'troubleshoot' },
    { id: 'IN_PROGRESS', label: 'Em Andamento', description: 'Em desenvolvimento / fila', icon: 'engineering' },
    { id: 'RESOLVED', label: 'Resolvido', description: 'Implementado ou respondido', icon: 'task_alt' },
  ];

  getStepIndex(status: FeedbackStatus): number {
    switch (status) {
      case 'NEW':
        return 0;
      case 'UNDER_REVIEW':
        return 1;
      case 'IN_PROGRESS':
        return 2;
      case 'RESOLVED':
        return 3;
      case 'DISCARDED':
        return -1;
      default:
        return 0;
    }
  }

  isStepCompleted(stepIndex: number): boolean {
    if (this.status === 'DISCARDED') return false;
    const currentIndex = this.getStepIndex(this.status);
    return stepIndex < currentIndex;
  }

  isStepActive(stepIndex: number): boolean {
    if (this.status === 'DISCARDED') return false;
    const currentIndex = this.getStepIndex(this.status);
    return stepIndex === currentIndex;
  }
}
