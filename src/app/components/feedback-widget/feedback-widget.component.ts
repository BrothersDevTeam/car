import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';

import { FeedbackService } from '@services/feedback.service';
import { FeedbackDialogComponent } from '../dialogs/feedback-dialog/feedback-dialog.component';

@Component({
  selector: 'app-feedback-widget',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatBadgeModule, MatTooltipModule],
  templateUrl: './feedback-widget.component.html',
  styleUrl: './feedback-widget.component.scss',
})
export class FeedbackWidgetComponent implements OnInit, OnDestroy {
  private dialog = inject(MatDialog);
  private feedbackService = inject(FeedbackService);
  private destroy$ = new Subject<void>();

  unreadResponsesCount = signal<number>(0);

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

  openFeedbackDialog(): void {
    const dialogRef = this.dialog.open(FeedbackDialogComponent, {
      width: '740px',
      maxHeight: '92vh',
      panelClass: 'feedback-dialog-panel',
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.checkUnreadResponses();
      }
    });
  }
}
