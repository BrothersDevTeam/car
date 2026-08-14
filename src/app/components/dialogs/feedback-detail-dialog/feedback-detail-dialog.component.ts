import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';

import { FeedbackService } from '@services/feedback.service';
import { Feedback, FeedbackStatus, FeedbackType } from '@interfaces/feedback';

export interface FeedbackDetailDialogData {
  feedback: Feedback;
}

@Component({
  selector: 'app-feedback-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './feedback-detail-dialog.component.html',
  styleUrl: './feedback-detail-dialog.component.scss',
})
export class FeedbackDetailDialogComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<FeedbackDetailDialogComponent>);
  private feedbackService = inject(FeedbackService);
  private toastr = inject(ToastrService);

  feedback: Feedback;
  selectedStatus: FeedbackStatus;
  adminNotes: string;
  saving = signal<boolean>(false);
  isZoomedImage = signal<boolean>(false);

  statusOptions: { label: string; value: FeedbackStatus; color: string }[] = [
    { label: 'Novo', value: 'NEW', color: '#8b5cf6' },
    { label: 'Em Análise', value: 'UNDER_REVIEW', color: '#3b82f6' },
    { label: 'Em Andamento', value: 'IN_PROGRESS', color: '#f59e0b' },
    { label: 'Resolvido', value: 'RESOLVED', color: '#22c55e' },
    { label: 'Descartado', value: 'DISCARDED', color: '#64748b' },
  ];

  constructor(@Inject(MAT_DIALOG_DATA) public data: FeedbackDetailDialogData) {
    this.feedback = data.feedback;
    this.selectedStatus = data.feedback.status;
    this.adminNotes = data.feedback.adminNotes || '';
  }

  ngOnInit(): void {}

  toggleImageZoom(): void {
    this.isZoomedImage.set(!this.isZoomedImage());
  }

  onSave(): void {
    this.saving.set(true);

    const payload = {
      status: this.selectedStatus,
      adminNotes: this.adminNotes,
    };

    this.feedbackService.updateStatus(this.feedback.id, payload).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.toastr.success('Status do feedback e resposta salvos com sucesso!');
        this.feedbackService.notifyFeedbackUpdated();
        this.dialogRef.close(updated);
      },
      error: (err) => {
        console.error('Erro ao atualizar status:', err);
        this.toastr.error('Erro ao atualizar o feedback.');
        this.saving.set(false);
      },
    });
  }

  onClose(): void {
    this.dialogRef.close();
  }

  getStatusBadgeClass(status: FeedbackStatus): string {
    switch (status) {
      case 'NEW':
        return 'badge-new';
      case 'UNDER_REVIEW':
        return 'badge-review';
      case 'IN_PROGRESS':
        return 'badge-progress';
      case 'RESOLVED':
        return 'badge-resolved';
      case 'DISCARDED':
        return 'badge-discarded';
      default:
        return 'badge-default';
    }
  }

  getTypeLabel(type: FeedbackType): string {
    switch (type) {
      case 'BUG':
        return 'Erro / Bug';
      case 'SUGGESTION':
        return 'Sugestão';
      case 'IMPROVEMENT':
        return 'Melhoria de UI';
      case 'CRITICISM':
        return 'Crítica';
      default:
        return type;
    }
  }
}
