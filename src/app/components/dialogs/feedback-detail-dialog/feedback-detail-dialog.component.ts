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

import { MatMenuModule } from '@angular/material/menu';
import { FeedbackStepperComponent } from '@components/feedback-stepper/feedback-stepper.component';
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
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    FeedbackStepperComponent,
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
  transitioningTo = signal<FeedbackStatus | null>(null);
  isZoomedImage = signal<boolean>(false);

  constructor(@Inject(MAT_DIALOG_DATA) public data: FeedbackDetailDialogData) {
    this.feedback = data.feedback;
    this.selectedStatus = data.feedback.status;
    this.adminNotes = data.feedback.adminNotes || '';
  }

  ngOnInit(): void {}

  toggleImageZoom(): void {
    this.isZoomedImage.set(!this.isZoomedImage());
  }

  applyTransition(newStatus: FeedbackStatus): void {
    // Prevenção contra duplo clique
    if (this.saving()) {
      return;
    }

    // Regra estrita: não é permitido retroceder ou reabrir
    if (this.selectedStatus === 'RESOLVED' || this.selectedStatus === 'DISCARDED') {
      this.toastr.info('Este feedback já foi finalizado e não pode ter seu status alterado.');
      return;
    }

    if (newStatus === 'DISCARDED') {
      if (!this.adminNotes?.trim()) {
        this.toastr.warning(
          'Por favor, informe a justificativa do descarte no campo de resposta antes de salvar.',
          'Justificativa Obrigatória'
        );
        return;
      }
    }

    // NÃO atualiza selectedStatus antes do backend responder, apenas sinaliza a transição ativa
    this.transitioningTo.set(newStatus);
    this.saving.set(true);

    const payload = {
      status: newStatus,
      adminNotes: this.adminNotes,
    };

    this.feedbackService.updateStatus(this.feedback.id, payload).subscribe({
      next: (updated) => {
        this.selectedStatus = newStatus;
        this.saving.set(false);
        this.transitioningTo.set(null);
        this.toastr.success('Status do feedback e resposta salvos com sucesso!');
        this.feedbackService.notifyFeedbackUpdated();
        this.dialogRef.close(updated);
      },
      error: (err) => {
        console.error('Erro ao atualizar status:', err);
        this.toastr.error('Erro ao atualizar o feedback.');
        this.saving.set(false);
        this.transitioningTo.set(null);
      },
    });
  }

  onSave(): void {
    if (this.saving()) {
      return;
    }

    if (this.selectedStatus === 'DISCARDED' && !this.adminNotes?.trim()) {
      this.toastr.warning(
        'Por favor, informe a justificativa do descarte no campo de resposta antes de salvar.',
        'Justificativa Obrigatória'
      );
      return;
    }

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
