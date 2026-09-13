import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { Subject, takeUntil } from 'rxjs';

import { FeedbackService } from '@services/feedback.service';
import { FeedbackType } from '@interfaces/feedback';
import { FeedbackDialogComponent } from '../dialogs/feedback-dialog/feedback-dialog.component';

@Component({
  selector: 'app-feedback-widget',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
  ],
  templateUrl: './feedback-widget.component.html',
  styleUrl: './feedback-widget.component.scss',
})
export class FeedbackWidgetComponent implements OnInit, OnDestroy {
  private dialog = inject(MatDialog);
  private feedbackService = inject(FeedbackService);
  private destroy$ = new Subject<void>();

  unreadResponsesCount = signal<number>(0);

  readonly feedbackTypes: {
    label: string;
    value: FeedbackType;
    icon: string;
    color: string;
    description: string;
  }[] = [
    {
      label: 'Erro / Bug',
      value: 'BUG',
      icon: 'bug_report',
      color: '#ef4444',
      description: 'Relatar uma falha ou problema no sistema',
    },
    {
      label: 'Sugestão',
      value: 'SUGGESTION',
      icon: 'lightbulb',
      color: '#3b82f6',
      description: 'Sugerir uma nova funcionalidade ou ideia',
    },
    {
      label: 'Elogios',
      value: 'PRAISE',
      icon: 'sentiment_very_satisfied',
      color: '#10b981',
      description: 'Compartilhar elogios e pontos positivos',
    },
    {
      label: 'Melhoria de UI',
      value: 'IMPROVEMENT',
      icon: 'auto_awesome',
      color: '#8b5cf6',
      description: 'Ajuste de layout, visual ou usabilidade',
    },
    {
      label: 'Crítica',
      value: 'CRITICISM',
      icon: 'feedback',
      color: '#f59e0b',
      description: 'Apontar algo que precisa ser revisto',
    },
    {
      label: 'Outro',
      value: 'OTHER',
      icon: 'more_horiz',
      color: '#6b7280',
      description: 'Qualquer outro assunto ou observação',
    },
  ];

  ngOnInit(): void {
    this.checkUnreadResponses();

    // Escuta atualizações de feedbacks para atualizar contador
    this.feedbackService.feedbackUpdated$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.checkUnreadResponses();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  checkUnreadResponses(): void {
    this.feedbackService.getMyUnreadCount().subscribe({
      next: (res) => this.unreadResponsesCount.set(res.unreadCount || 0),
      error: () => this.unreadResponsesCount.set(0),
    });
  }

  selectTagAndOpen(type: FeedbackType): void {
    const dialogRef = this.dialog.open(FeedbackDialogComponent, {
      width: '99vw',
      maxWidth: '99vw',
      height: '98vh',
      maxHeight: '98vh',
      panelClass: 'feedback-dialog-panel',
      data: { initialType: type },
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.checkUnreadResponses();
      }
    });
  }

  openMyFeedbacks(): void {
    const dialogRef = this.dialog.open(FeedbackDialogComponent, {
      width: '99vw',
      maxWidth: '99vw',
      height: '98vh',
      maxHeight: '98vh',
      panelClass: 'feedback-dialog-panel',
      data: { openMyFeedbacks: true },
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.checkUnreadResponses();
      }
    });
  }
}
