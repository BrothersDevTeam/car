import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import html2canvas from 'html2canvas';

import { FeedbackService } from '@services/feedback.service';
import { Feedback, FeedbackType, FeedbackStatus } from '@interfaces/feedback';

@Component({
  selector: 'app-feedback-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
  ],
  templateUrl: './feedback-dialog.component.html',
  styleUrl: './feedback-dialog.component.scss',
})
export class FeedbackDialogComponent implements OnInit {
  @ViewChild('drawingCanvas') drawingCanvas!: ElementRef<HTMLCanvasElement>;

  private fb = inject(FormBuilder);
  private feedbackService = inject(FeedbackService);
  private toastr = inject(ToastrService);
  private router = inject(Router);
  public dialogRef = inject(MatDialogRef<FeedbackDialogComponent>);

  feedbackForm!: FormGroup;
  selectedTabIndex = 0;

  // Screenshot & Annotation State
  capturingScreenshot = signal<boolean>(false);
  screenshotDataUrl = signal<string | null>(null);
  isDrawingMode = signal<boolean>(false);
  submitting = signal<boolean>(false);
  loadingMyFeedbacks = signal<boolean>(false);

  // My Feedbacks
  myFeedbacks = signal<Feedback[]>([]);

  // Metadata
  currentRoute = '';
  browserInfo = '';
  screenResolution = '';

  // Canvas Drawing
  private isDrawing = false;
  private ctx: CanvasRenderingContext2D | null = null;
  drawColor = '#ef4444'; // Red highlight color by default
  lineWidth = 4;

  feedbackTypes: { label: string; value: FeedbackType; icon: string; color: string }[] = [
    { label: 'Erro / Bug', value: 'BUG', icon: 'bug_report', color: '#ef4444' },
    { label: 'Sugestão', value: 'SUGGESTION', icon: 'lightbulb', color: '#3b82f6' },
    { label: 'Melhoria de UI', value: 'IMPROVEMENT', icon: 'auto_awesome', color: '#8b5cf6' },
    { label: 'Crítica', value: 'CRITICISM', icon: 'feedback', color: '#f59e0b' },
    { label: 'Outro', value: 'OTHER', icon: 'more_horiz', color: '#6b7280' },
  ];

  ngOnInit(): void {
    this.initForm();
    this.collectMetadata();
    // A captura não é mais automática ao abrir o modal; ocorre sob demanda
    this.loadMyFeedbacks();
  }

  private initForm(): void {
    this.feedbackForm = this.fb.group({
      type: ['SUGGESTION' as FeedbackType, [Validators.required]],
      title: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', [Validators.required]],
      includeMetadata: [true],
    });
  }

  private collectMetadata(): void {
    this.currentRoute = this.router.url;
    this.browserInfo = `${navigator.appName} (${navigator.userAgent.slice(0, 80)})`;
    this.screenResolution = `${window.innerWidth}x${window.innerHeight}`;
  }

  /**
   * Captura a tela atual da aplicação sob demanda via html2canvas
   */
  captureCurrentScreen(): void {
    this.capturingScreenshot.set(true);

    // Ocultar temporariamente dialogs antes de capturar a tela
    const elementsToHide = document.querySelectorAll('.cdk-overlay-container');
    elementsToHide.forEach((el) => ((el as HTMLElement).style.visibility = 'hidden'));

    setTimeout(() => {
      html2canvas(document.body, {
        useCORS: true,
        logging: false,
        scale: 1,
        ignoreElements: (element) => element.classList.contains('cdk-overlay-container'),
      })
        .then((canvas) => {
          elementsToHide.forEach((el) => ((el as HTMLElement).style.visibility = 'visible'));
          const dataUrl = canvas.toDataURL('image/png');
          this.screenshotDataUrl.set(dataUrl);
          this.capturingScreenshot.set(false);
          this.isDrawingMode.set(true);
          setTimeout(() => this.initDrawingCanvas(dataUrl), 100);
        })
        .catch((err) => {
          console.error('Erro ao capturar tela:', err);
          elementsToHide.forEach((el) => ((el as HTMLElement).style.visibility = 'visible'));
          this.capturingScreenshot.set(false);
        });
    }, 200);
  }

  removeScreenshot(): void {
    this.screenshotDataUrl.set(null);
    this.isDrawingMode.set(false);
  }

  /**
   * Inicializa o canvas de desenho/marcação sobre a foto capturada
   */
  private initDrawingCanvas(dataUrl: string): void {
    if (!this.drawingCanvas) return;
    const canvas = this.drawingCanvas.nativeElement;
    this.ctx = canvas.getContext('2d');

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      if (this.ctx) {
        this.ctx.drawImage(img, 0, 0);
      }
    };
    img.src = dataUrl;
  }

  toggleDrawingMode(): void {
    this.isDrawingMode.set(!this.isDrawingMode());
  }

  clearAnnotations(): void {
    const dataUrl = this.screenshotDataUrl();
    if (dataUrl) {
      this.initDrawingCanvas(dataUrl);
    }
  }

  startDrawing(event: MouseEvent | TouchEvent): void {
    if (!this.isDrawingMode() || !this.ctx) return;
    this.isDrawing = true;
    const pos = this.getCanvasPosition(event);
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);
  }

  draw(event: MouseEvent | TouchEvent): void {
    if (!this.isDrawing || !this.isDrawingMode() || !this.ctx) return;
    const pos = this.getCanvasPosition(event);
    this.ctx.strokeStyle = this.drawColor;
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
  }

  stopDrawing(): void {
    this.isDrawing = false;
  }

  private getCanvasPosition(event: MouseEvent | TouchEvent): { x: number; y: number } {
    const canvas = this.drawingCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  onSubmit(): void {
    if (this.feedbackForm.invalid) {
      this.feedbackForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);

    // Se houver desenho no canvas, extrair a imagem final com as marcações
    let finalScreenshot: string | undefined = undefined;
    if (this.drawingCanvas && this.drawingCanvas.nativeElement) {
      finalScreenshot = this.drawingCanvas.nativeElement.toDataURL('image/png');
    } else {
      finalScreenshot = this.screenshotDataUrl() || undefined;
    }

    const formValues = this.feedbackForm.value;

    const payload = {
      type: formValues.type,
      title: formValues.title,
      description: formValues.description,
      currentRoute: formValues.includeMetadata ? this.currentRoute : undefined,
      browserInfo: formValues.includeMetadata ? this.browserInfo : undefined,
      screenResolution: formValues.includeMetadata ? this.screenResolution : undefined,
      screenshotBase64: finalScreenshot,
    };

    this.feedbackService.createFeedback(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.toastr.success('Obrigado! Seu feedback foi enviado com sucesso.');
        this.feedbackService.notifyFeedbackUpdated();
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('Erro ao enviar feedback:', err);
        this.toastr.error(err.error?.message || 'Erro ao enviar feedback. Tente novamente.');
        this.submitting.set(false);
      },
    });
  }

  loadMyFeedbacks(): void {
    this.loadingMyFeedbacks.set(true);
    this.feedbackService.getMyFeedbacks(0, 20).subscribe({
      next: (response) => {
        this.myFeedbacks.set(response.content || []);
        this.loadingMyFeedbacks.set(false);
      },
      error: () => this.loadingMyFeedbacks.set(false),
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

  getTypeIcon(type: FeedbackType): string {
    const found = this.feedbackTypes.find((t) => t.value === type);
    return found ? found.icon : 'help_outline';
  }

  getTypeLabel(type: FeedbackType): string {
    const found = this.feedbackTypes.find((t) => t.value === type);
    return found ? found.label : type;
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
