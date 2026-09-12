import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';

import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { FeedbackService } from '@services/feedback.service';
import { StoreService } from '@services/store.service';
import { Feedback, FeedbackStatus, FeedbackType } from '@interfaces/feedback';
import { Store } from '@interfaces/store';
import { FeedbackDetailDialogComponent } from '@components/dialogs/feedback-detail-dialog/feedback-detail-dialog.component';
import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-feedback-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    DragDropModule,
  ],
  templateUrl: './feedback-management.component.html',
  styleUrl: './feedback-management.component.scss',
})
export class FeedbackManagementComponent implements OnInit {
  private feedbackService = inject(FeedbackService);
  private storeService = inject(StoreService);
  private dialog = inject(MatDialog);
  private toastr = inject(ToastrService);

  feedbacks = signal<Feedback[]>([]);
  loading = signal<boolean>(false);

  // Modo de visualização: Tabela ou Kanban
  viewMode = signal<'TABLE' | 'KANBAN'>('TABLE');

  // Colunas do Kanban
  kanbanNew = signal<Feedback[]>([]);
  kanbanReview = signal<Feedback[]>([]);
  kanbanProgress = signal<Feedback[]>([]);
  kanbanResolved = signal<Feedback[]>([]);
  kanbanDiscarded = signal<Feedback[]>([]);

  // Pagination & Filters
  totalElements = signal<number>(0);
  pageIndex = 0;
  pageSize = 15;

  selectedStatus: FeedbackStatus | 'ALL' = 'ALL';
  selectedType: FeedbackType | 'ALL' = 'ALL';
  selectedStoreId: string = 'ALL';

  stores = signal<Store[]>([]);

  // Stats Counters
  totalCount = signal<number>(0);
  newCount = signal<number>(0);
  inProgressCount = signal<number>(0);
  resolvedCount = signal<number>(0);

  displayedColumns: string[] = ['createdAt', 'type', 'userName', 'currentRoute', 'title', 'status', 'actions'];

  ngOnInit(): void {
    this.loadStores();
    this.loadFeedbacks();
    this.loadKanbanFeedbacks();
    this.loadStats();
    this.markFeedbacksAsReadByAdmin();
  }

  private markFeedbacksAsReadByAdmin(): void {
    this.feedbackService.markAdminRead().subscribe({
      next: () => {
        this.feedbackService.notifyFeedbackUpdated();
      },
      error: (err) => console.error('Erro ao marcar feedbacks como lidos pelo admin:', err),
    });
  }

  loadStores(): void {
    this.storeService.getAllMinimal({ size: 1000 }).subscribe({
      next: (res) => this.stores.set(res.content || []),
      error: () => this.stores.set([]),
    });
  }

  setViewMode(mode: 'TABLE' | 'KANBAN'): void {
    this.viewMode.set(mode);
    if (mode === 'KANBAN') {
      this.loadKanbanFeedbacks();
    } else {
      this.loadFeedbacks();
    }
  }

  loadKanbanFeedbacks(): void {
    const filters = {
      type: this.selectedType === 'ALL' ? undefined : (this.selectedType as FeedbackType),
      storeId: this.selectedStoreId === 'ALL' ? undefined : this.selectedStoreId,
      size: 300,
    };

    this.feedbackService.getAllFeedbacks(filters).subscribe({
      next: (res) => {
        const items = res.content || [];
        this.kanbanNew.set(items.filter((i) => i.status === 'NEW'));
        this.kanbanReview.set(items.filter((i) => i.status === 'UNDER_REVIEW'));
        this.kanbanProgress.set(items.filter((i) => i.status === 'IN_PROGRESS'));
        this.kanbanResolved.set(items.filter((i) => i.status === 'RESOLVED'));
        this.kanbanDiscarded.set(items.filter((i) => i.status === 'DISCARDED'));
      },
      error: (err) => console.error('Erro ao carregar dados do Kanban:', err),
    });
  }

  onCardDrop(event: CdkDragDrop<Feedback[]>, targetStatus: FeedbackStatus): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    const item = event.previousContainer.data[event.previousIndex];
    if (!item) return;

    // Regra de fluxo: Não é permitido retornar a um passo anterior ou mover itens finalizados
    if (!this.isValidKanbanTransition(item.status, targetStatus)) {
      this.toastr.warning('Não é permitido retroceder para uma etapa anterior no fluxo.');
      return;
    }

    // Move temporariamente para a coluna de destino para o efeito visual de arraste
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    // Abre imediatamente a tela para escrever a resposta e salvar
    const dialogRef = this.dialog.open(FeedbackDetailDialogComponent, {
      width: '840px',
      maxHeight: '92vh',
      panelClass: 'feedback-detail-dialog-panel',
      data: { feedback: item, targetStatus },
    });

    dialogRef.afterClosed().subscribe((updated) => {
      if (updated) {
        // Confirmado e salvo no backend com sucesso
        this.loadFeedbacks();
        this.loadKanbanFeedbacks();
        this.loadStats();
        this.feedbackService.notifyFeedbackUpdated();
      } else {
        // Cancelou: a task retorna para a coluna onde estava antes de ser arrastada
        this.loadKanbanFeedbacks();
      }
    });
  }

  isValidKanbanTransition(current: FeedbackStatus, target: FeedbackStatus): boolean {
    if (current === target) return true;
    if (current === 'RESOLVED' || current === 'DISCARDED') return false;
    if (current === 'NEW') {
      return target === 'UNDER_REVIEW';
    }
    if (current === 'UNDER_REVIEW') {
      return target === 'IN_PROGRESS' || target === 'DISCARDED';
    }
    if (current === 'IN_PROGRESS') {
      return target === 'RESOLVED';
    }
    return false;
  }

  loadFeedbacks(): void {
    this.loading.set(true);

    const filters = {
      status: this.selectedStatus === 'ALL' ? undefined : (this.selectedStatus as FeedbackStatus),
      type: this.selectedType === 'ALL' ? undefined : (this.selectedType as FeedbackType),
      storeId: this.selectedStoreId === 'ALL' ? undefined : this.selectedStoreId,
      page: this.pageIndex,
      size: this.pageSize,
    };

    this.feedbackService.getAllFeedbacks(filters).subscribe({
      next: (res) => {
        this.feedbacks.set(res.content || []);
        if (res.page) {
          this.totalElements.set(res.page.totalElements || 0);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erro ao carregar feedbacks:', err);
        this.toastr.error('Erro ao carregar lista de feedbacks.');
        this.loading.set(false);
      },
    });
  }

  loadStats(): void {
    this.feedbackService.getAllFeedbacks({ size: 1000 }).subscribe({
      next: (res) => {
        const items = res.content || [];
        this.totalCount.set(items.length);
        this.newCount.set(items.filter((i) => i.status === 'NEW').length);
        this.inProgressCount.set(items.filter((i) => i.status === 'UNDER_REVIEW' || i.status === 'IN_PROGRESS').length);
        this.resolvedCount.set(items.filter((i) => i.status === 'RESOLVED').length);
      },
    });
  }

  onFilterChange(): void {
    this.pageIndex = 0;
    this.loadFeedbacks();
    this.loadKanbanFeedbacks();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadFeedbacks();
  }

  openDetailDialog(feedback: Feedback, targetStatus?: FeedbackStatus): void {
    const dialogRef = this.dialog.open(FeedbackDetailDialogComponent, {
      width: '840px',
      maxHeight: '92vh',
      panelClass: 'feedback-detail-dialog-panel',
      data: { feedback, targetStatus },
    });

    dialogRef.afterClosed().subscribe((updated) => {
      if (updated) {
        this.loadFeedbacks();
        this.loadKanbanFeedbacks();
        this.loadStats();
        this.feedbackService.notifyFeedbackUpdated();
      } else if (targetStatus) {
        // Se abriu com targetStatus e cancelou, recarrega o kanban para restaurar a posição original
        this.loadKanbanFeedbacks();
      }
    });
  }

  onDelete(feedback: Feedback, event: MouseEvent): void {
    event.stopPropagation();

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Excluir Feedback',
        message: `Tem certeza de que deseja excluir o feedback "${feedback.title}"?`,
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
        type: 'danger',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.feedbackService.deleteFeedback(feedback.id).subscribe({
          next: () => {
            this.toastr.success('Feedback excluído com sucesso.');
            this.loadFeedbacks();
            this.loadStats();
            this.feedbackService.notifyFeedbackUpdated();
          },
          error: () => this.toastr.error('Erro ao excluir feedback.'),
        });
      }
    });
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

  getStatusLabel(status: FeedbackStatus): string {
    switch (status) {
      case 'NEW':
        return 'Novo';
      case 'UNDER_REVIEW':
        return 'Em Análise';
      case 'IN_PROGRESS':
        return 'Em Andamento';
      case 'RESOLVED':
        return 'Resolvido';
      case 'DISCARDED':
        return 'Descartado';
      default:
        return status;
    }
  }

  getTypeLabel(type: FeedbackType): string {
    switch (type) {
      case 'BUG':
        return 'Erro / Bug';
      case 'SUGGESTION':
        return 'Sugestão';
      case 'IMPROVEMENT':
        return 'Melhoria';
      case 'CRITICISM':
        return 'Crítica';
      default:
        return type;
    }
  }

  getTypeIcon(type: FeedbackType): string {
    switch (type) {
      case 'BUG':
        return 'bug_report';
      case 'SUGGESTION':
        return 'lightbulb';
      case 'IMPROVEMENT':
        return 'auto_awesome';
      case 'CRITICISM':
        return 'feedback';
      default:
        return 'chat';
    }
  }
}
