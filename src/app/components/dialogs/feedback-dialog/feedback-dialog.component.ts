import { Component, ElementRef, HostListener, OnInit, ViewChild, inject, signal } from '@angular/core';
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
import { FeedbackStepperComponent } from '@components/feedback-stepper/feedback-stepper.component';

export type AnnotationTool = 'rectangle' | 'freehand' | 'text';

export interface AnnotationItem {
  id: string;
  type: 'rectangle' | 'freehand' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  lineWidth: number;
  text?: string;
  points?: { x: number; y: number }[];
}

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
    FeedbackStepperComponent,
  ],
  templateUrl: './feedback-dialog.component.html',
  styleUrl: './feedback-dialog.component.scss',
})
export class FeedbackDialogComponent implements OnInit {
  @ViewChild('drawingCanvas') drawingCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('floatingTextInput') floatingTextInput?: ElementRef<HTMLInputElement>;

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

  // Drag and Drop
  isDraggingOver = signal<boolean>(false);

  // Annotation Tools, Object Model & Selection
  activeTool = signal<AnnotationTool>('rectangle');
  annotations = signal<AnnotationItem[]>([]);
  selectedAnnotationId = signal<string | null>(null);
  canvasCursor = signal<string>('crosshair');

  private baseImage: HTMLImageElement | null = null;
  private isDrawing = false;
  private isMovingAnnotation = false;
  private movingAnnotationItem: AnnotationItem | null = null;
  private moveOffset = { x: 0, y: 0 };
  private currentDrawingItem: AnnotationItem | null = null;
  private startPos: { x: number; y: number } = { x: 0, y: 0 };

  // Floating text input over canvas
  textAnnotation = signal<{
    visible: boolean;
    canvasX: number;
    canvasY: number;
    screenX: number;
    screenY: number;
    text: string;
  }>({
    visible: false,
    canvasX: 0,
    canvasY: 0,
    screenX: 0,
    screenY: 0,
    text: '',
  });

  // My Feedbacks
  myFeedbacks = signal<Feedback[]>([]);

  // Metadata
  currentRoute = '';
  browserInfo = '';
  screenResolution = '';

  // Canvas context
  private ctx: CanvasRenderingContext2D | null = null;
  drawColor = '#ef4444'; // Vermelho vivo
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
    this.loadMyFeedbacks();
  }

  private initForm(): void {
    this.feedbackForm = this.fb.group({
      type: ['SUGGESTION' as FeedbackType, [Validators.required]],
      title: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', [Validators.required]],
    });
  }

  private collectMetadata(): void {
    this.currentRoute = this.router.url;
    this.browserInfo = `${navigator.appName} (${navigator.userAgent.slice(0, 80)})`;
    this.screenResolution = `${window.innerWidth}x${window.innerHeight}`;
  }

  // =========================================================================
  // 1. SUPORTE A COLAR IMAGEM (CLIPBOARD / CTRL+V)
  // =========================================================================

  @HostListener('window:paste', ['$event'])
  onWindowPaste(event: ClipboardEvent): void {
    if (this.selectedTabIndex !== 0) return;

    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          event.preventDefault();
          this.processImageFile(file, 'Imagem colada da área de transferência com sucesso!');
          return;
        }
      }
    }
  }

  async pasteFromClipboard(): Promise<void> {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        this.toastr.info('Pressione Ctrl + V para colar a imagem capturada diretamente.');
        return;
      }

      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((type) => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], 'clipboard-image.png', { type: imageType });
          this.processImageFile(file, 'Imagem colada com sucesso!');
          return;
        }
      }
      this.toastr.warning('Nenhuma imagem encontrada na área de transferência. Tire um print primeiro (ex: Win + Shift + S).');
    } catch {
      this.toastr.info('Pressione o atalho Ctrl + V para colar a imagem aqui.');
    }
  }

  processImageFile(file: File, successMessage?: string): void {
    if (!file.type.startsWith('image/')) {
      this.toastr.warning('Por favor, selecione ou cole um arquivo de imagem válido (PNG, JPG, etc).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        this.screenshotDataUrl.set(dataUrl);
        this.isDrawingMode.set(true);
        this.annotations.set([]);
        this.selectedAnnotationId.set(null);
        this.closeTextAnnotation();
        setTimeout(() => this.initDrawingCanvas(dataUrl), 100);
        if (successMessage) {
          this.toastr.success(successMessage);
        }
      }
    };
    reader.readAsDataURL(file);
  }

  // =========================================================================
  // 2. DRAG AND DROP & SELETOR DE ARQUIVOS
  // =========================================================================

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processImageFile(files[0], 'Imagem carregada com sucesso!');
    }
  }

  triggerFileInput(): void {
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processImageFile(input.files[0], 'Imagem selecionada com sucesso!');
      input.value = '';
    }
  }

  // =========================================================================
  // 3. CAPTURA DE TELA NATIVA EM ALTA DEFINIÇÃO (SEM DISTORÇÃO DE FONTES/ÍCONES)
  // =========================================================================

  /**
   * Captura a tela com fidelidade de GPU nativa via Screen Capture API (getDisplayMedia),
   * garantindo renderização 100% perfeita dos ícones, fontes e layouts sem distorção.
   */
  private async captureScreenNative(): Promise<HTMLCanvasElement> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      throw new Error('Screen Capture API não suportada neste navegador.');
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'browser',
      },
      audio: false,
      preferCurrentTab: true,
      selfBrowserSurface: 'include',
      surfaceSwitching: 'include',
      systemAudio: 'exclude',
    } as any);

    return new Promise<HTMLCanvasElement>((resolve, reject) => {
      const video = document.createElement('video');
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;

      video.onloadedmetadata = () => {
        video.play().then(() => {
          // Delay de 80ms para garantir a renderização estável do frame de tela
          setTimeout(() => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              }
              // Interrompe o stream de vídeo imediatamente após capturar o frame
              stream.getTracks().forEach((t) => t.stop());
              video.remove();
              resolve(canvas);
            } catch (e) {
              stream.getTracks().forEach((t) => t.stop());
              video.remove();
              reject(e);
            }
          }, 80);
        }).catch((err) => {
          stream.getTracks().forEach((t) => t.stop());
          video.remove();
          reject(err);
        });
      };

      video.onerror = (err) => {
        stream.getTracks().forEach((t) => t.stop());
        video.remove();
        reject(err);
      };
    });
  }

  /**
   * Captura área selecionada com overlay interativo instantâneo em tela cheia
   */
  async startAreaSelectionCapture(): Promise<void> {
    const overlays = document.querySelectorAll('.cdk-overlay-container');
    overlays.forEach((el) => ((el as HTMLElement).style.display = 'none'));

    try {
      const sourceCanvas = await this.captureScreenNative();
      this.launchSnippingOverlay(sourceCanvas, overlays);
    } catch (err: any) {
      overlays.forEach((el) => ((el as HTMLElement).style.display = 'block'));
      if (err.name !== 'NotAllowedError') {
        console.error('Erro na captura nativa:', err);
        this.toastr.warning('Dica: você também pode usar Win + Shift + S no Windows e colar diretamente com Ctrl + V.');
      }
    }
  }

  /**
   * Lança o overlay interativo de seleção em tela cheia com alças de redimensionamento e arraste
   */
  private launchSnippingOverlay(sourceCanvas: HTMLCanvasElement, overlays: NodeListOf<Element>): void {
    const overlay = document.createElement('div');
    overlay.id = 'snipping-tool-overlay';
    overlay.className = 'snipping-tool-overlay';

    // Banner de instruções
    const banner = document.createElement('div');
    banner.className = 'snipping-banner';
    banner.innerHTML = `
      <span class="banner-icon">✂️</span>
      <span><strong>Modo de Recorte:</strong> Selecione a área. Use as alças para ajustar ou arraste a caixa para mover.</span>
      <span class="banner-badge">ESC para cancelar</span>
    `;
    overlay.appendChild(banner);

    // Retângulo de seleção
    const selectionBox = document.createElement('div');
    selectionBox.className = 'snipping-selection-box';
    selectionBox.style.display = 'none';

    // Badge com dimensões (W x H)
    const dimensionsBadge = document.createElement('div');
    dimensionsBadge.className = 'snipping-dimensions-badge';
    selectionBox.appendChild(dimensionsBadge);

    // 8 Alças de redimensionamento
    const handlePositions = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
    handlePositions.forEach((pos) => {
      const handle = document.createElement('div');
      handle.className = `snipping-handle snipping-handle-${pos}`;
      handle.dataset['handle'] = pos;
      selectionBox.appendChild(handle);
    });

    // Barra de ações flutuante
    const actionToolbar = document.createElement('div');
    actionToolbar.className = 'snipping-action-toolbar';
    actionToolbar.innerHTML = `
      <button type="button" class="snip-btn snip-cancel">✕ Cancelar</button>
      <button type="button" class="snip-btn snip-confirm">✓ Confirmar Recorte</button>
    `;
    selectionBox.appendChild(actionToolbar);

    overlay.appendChild(selectionBox);
    document.body.appendChild(overlay);

    let isSelecting = false;
    let isResizing = false;
    let isMoving = false;
    let activeHandle: string | null = null;

    let startX = 0;
    let startY = 0;
    let dragStartX = 0;
    let dragStartY = 0;
    let initialRect = { x: 0, y: 0, width: 0, height: 0 };
    let currentRect = { x: 0, y: 0, width: 0, height: 0 };

    const updateDOM = () => {
      selectionBox.style.left = `${currentRect.x}px`;
      selectionBox.style.top = `${currentRect.y}px`;
      selectionBox.style.width = `${currentRect.width}px`;
      selectionBox.style.height = `${currentRect.height}px`;
      dimensionsBadge.textContent = `${Math.round(currentRect.width)} × ${Math.round(currentRect.height)} px`;
    };

    const cleanup = () => {
      window.removeEventListener('keydown', onKeyDown);
      overlay.remove();
      overlays.forEach((el) => ((el as HTMLElement).style.display = 'block'));
    };

    const confirmCrop = () => {
      if (currentRect.width < 10 || currentRect.height < 10) {
        this.toastr.warning('Selecione uma área maior para recortar.');
        return;
      }

      // Proporções exatas entre as coordenadas da tela (viewport) e a imagem nativa capturada
      const scaleX = sourceCanvas.width / window.innerWidth;
      const scaleY = sourceCanvas.height / window.innerHeight;

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = Math.max(1, Math.round(currentRect.width * scaleX));
      cropCanvas.height = Math.max(1, Math.round(currentRect.height * scaleY));
      const cropCtx = cropCanvas.getContext('2d');

      if (cropCtx) {
        cropCtx.drawImage(
          sourceCanvas,
          Math.round(currentRect.x * scaleX),
          Math.round(currentRect.y * scaleY),
          cropCanvas.width,
          cropCanvas.height,
          0,
          0,
          cropCanvas.width,
          cropCanvas.height
        );
        const croppedDataUrl = cropCanvas.toDataURL('image/png');
        this.screenshotDataUrl.set(croppedDataUrl);
        this.isDrawingMode.set(true);
        this.annotations.set([]);
        this.selectedAnnotationId.set(null);
        this.closeTextAnnotation();
        setTimeout(() => this.initDrawingCanvas(croppedDataUrl), 60);
        this.toastr.success('Área capturada com perfeição!');
      }

      cleanup();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanup();
      } else if (e.key === 'Enter' && currentRect.width >= 10 && currentRect.height >= 10) {
        confirmCrop();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    overlay.addEventListener('mousedown', (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (target.closest('.snipping-action-toolbar')) {
        return;
      }

      const handleEl = target.closest('.snipping-handle') as HTMLElement | null;
      if (handleEl && handleEl.dataset['handle']) {
        e.stopPropagation();
        isResizing = true;
        activeHandle = handleEl.dataset['handle'];
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        initialRect = { ...currentRect };
        actionToolbar.style.display = 'none';
        return;
      }

      if (target.closest('.snipping-selection-box') && currentRect.width >= 15 && currentRect.height >= 15) {
        e.stopPropagation();
        isMoving = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        initialRect = { ...currentRect };
        actionToolbar.style.display = 'none';
        return;
      }

      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;
      currentRect = { x: startX, y: startY, width: 0, height: 0 };
      selectionBox.style.display = 'block';
      actionToolbar.style.display = 'none';
      updateDOM();
    });

    overlay.addEventListener('mousemove', (e: MouseEvent) => {
      if (isSelecting) {
        const curX = e.clientX;
        const curY = e.clientY;
        const x = Math.min(startX, curX);
        const y = Math.min(startY, curY);
        const width = Math.abs(curX - startX);
        const height = Math.abs(curY - startY);

        currentRect = { x, y, width, height };
        updateDOM();
      } else if (isResizing && activeHandle) {
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;

        let newX = initialRect.x;
        let newY = initialRect.y;
        let newW = initialRect.width;
        let newH = initialRect.height;

        if (activeHandle.includes('e')) {
          newW = Math.max(20, initialRect.width + dx);
          if (newX + newW > window.innerWidth) {
            newW = window.innerWidth - newX;
          }
        } else if (activeHandle.includes('w')) {
          const maxRight = initialRect.x + initialRect.width;
          newX = Math.max(0, Math.min(maxRight - 20, initialRect.x + dx));
          newW = maxRight - newX;
        }

        if (activeHandle.includes('s')) {
          newH = Math.max(20, initialRect.height + dy);
          if (newY + newH > window.innerHeight) {
            newH = window.innerHeight - newY;
          }
        } else if (activeHandle.includes('n')) {
          const maxBottom = initialRect.y + initialRect.height;
          newY = Math.max(0, Math.min(maxBottom - 20, initialRect.y + dy));
          newH = maxBottom - newY;
        }

        currentRect = { x: newX, y: newY, width: newW, height: newH };
        updateDOM();
      } else if (isMoving) {
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;

        const maxLeft = window.innerWidth - currentRect.width;
        const maxTop = window.innerHeight - currentRect.height;

        currentRect.x = Math.max(0, Math.min(maxLeft, initialRect.x + dx));
        currentRect.y = Math.max(0, Math.min(maxTop, initialRect.y + dy));
        updateDOM();
      }
    });

    overlay.addEventListener('mouseup', () => {
      const hadAction = isSelecting || isResizing || isMoving;
      isSelecting = false;
      isResizing = false;
      isMoving = false;
      activeHandle = null;

      if (hadAction && currentRect.width >= 15 && currentRect.height >= 15) {
        actionToolbar.style.display = 'flex';
      }
    });

    actionToolbar.querySelector('.snip-confirm')?.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmCrop();
    });

    actionToolbar.querySelector('.snip-cancel')?.addEventListener('click', (e) => {
      e.stopPropagation();
      cleanup();
    });
  }

  /**
   * Captura a tela inteira em fidelidade nativa absoluta
   */
  async captureCurrentScreen(): Promise<void> {
    this.capturingScreenshot.set(true);

    const elementsToHide = document.querySelectorAll('.cdk-overlay-container');
    elementsToHide.forEach((el) => ((el as HTMLElement).style.display = 'none'));

    try {
      const canvas = await this.captureScreenNative();
      elementsToHide.forEach((el) => ((el as HTMLElement).style.display = 'block'));
      const dataUrl = canvas.toDataURL('image/png');
      this.screenshotDataUrl.set(dataUrl);
      this.capturingScreenshot.set(false);
      this.isDrawingMode.set(true);
      this.annotations.set([]);
      this.selectedAnnotationId.set(null);
      this.closeTextAnnotation();
      setTimeout(() => this.initDrawingCanvas(dataUrl), 60);
      this.toastr.success('Tela inteira capturada com sucesso!');
    } catch (err: any) {
      elementsToHide.forEach((el) => ((el as HTMLElement).style.display = 'block'));
      this.capturingScreenshot.set(false);
      if (err.name !== 'NotAllowedError') {
        console.error('Erro ao capturar tela:', err);
        this.toastr.warning('Dica: use Win + Shift + S no Windows e pressione Ctrl + V para colar o print.');
      }
    }
  }

  removeScreenshot(): void {
    this.screenshotDataUrl.set(null);
    this.isDrawingMode.set(false);
    this.annotations.set([]);
    this.selectedAnnotationId.set(null);
    this.baseImage = null;
    this.closeTextAnnotation();
  }

  // =========================================================================
  // 4. MODELO DE OBJETOS DE ANOTAÇÃO (REPOSICIONÁVEL / ARRASTÁVEL)
  // =========================================================================

  private initDrawingCanvas(dataUrl: string): void {
    if (!this.drawingCanvas) return;
    const canvas = this.drawingCanvas.nativeElement;
    this.ctx = canvas.getContext('2d');

    this.baseImage = new Image();
    this.baseImage.crossOrigin = 'anonymous';
    this.baseImage.onload = () => {
      canvas.width = this.baseImage!.width;
      canvas.height = this.baseImage!.height;
      this.renderCanvas();
    };
    this.baseImage.src = dataUrl;
  }

  /**
   * Renderiza a imagem base e todas as camadas de anotações
   */
  renderCanvas(drawSelectionBorder: boolean = true): void {
    if (!this.ctx || !this.drawingCanvas || !this.baseImage) return;
    const canvas = this.drawingCanvas.nativeElement;

    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.ctx.drawImage(this.baseImage, 0, 0);

    const items = this.annotations();
    for (const item of items) {
      const isSelected = drawSelectionBorder && item.id === this.selectedAnnotationId();

      if (item.type === 'rectangle') {
        this.ctx.save();
        this.ctx.strokeStyle = item.color;
        this.ctx.lineWidth = item.lineWidth;
        this.ctx.lineJoin = 'miter';
        this.ctx.strokeRect(item.x, item.y, item.width, item.height);

        // Borda de seleção quando selecionado
        if (isSelected) {
          this.ctx.strokeStyle = '#38bdf8';
          this.ctx.lineWidth = 2;
          this.ctx.setLineDash([6, 6]);
          this.ctx.strokeRect(item.x - 3, item.y - 3, item.width + 6, item.height + 6);
        }
        this.ctx.restore();
      } else if (item.type === 'freehand') {
        if (item.points && item.points.length > 0) {
          this.ctx.save();
          this.ctx.strokeStyle = item.color;
          this.ctx.lineWidth = item.lineWidth;
          this.ctx.lineCap = 'round';
          this.ctx.lineJoin = 'round';
          this.ctx.beginPath();
          item.points.forEach((pt, index) => {
            if (index === 0) {
              this.ctx!.moveTo(pt.x, pt.y);
            } else {
              this.ctx!.lineTo(pt.x, pt.y);
            }
          });
          this.ctx.stroke();
          this.ctx.restore();
        }
      } else if (item.type === 'text') {
        this.drawTextBadge(this.ctx, item, isSelected, canvas.width);
      }
    }
  }

  private drawTextBadge(
    ctx: CanvasRenderingContext2D,
    item: AnnotationItem,
    isSelected: boolean,
    canvasWidth: number
  ): void {
    const scale = Math.max(1, canvasWidth / 900);
    const fontSize = Math.round(16 * scale);
    ctx.save();
    ctx.font = `bold ${fontSize}px Inter, sans-serif, system-ui`;

    const text = item.text || '';
    const textMetrics = ctx.measureText(text);
    const paddingX = Math.round(10 * scale);
    const paddingY = Math.round(6 * scale);
    const boxWidth = textMetrics.width + paddingX * 2;
    const boxHeight = fontSize + paddingY * 2;

    // Atualiza dimensões reais no item para detecção de clique
    item.width = boxWidth;
    item.height = boxHeight;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 6 * scale;
    ctx.shadowOffsetY = 2 * scale;

    ctx.fillStyle = item.color || '#ef4444';
    if (typeof (ctx as any).roundRect === 'function') {
      ctx.beginPath();
      (ctx as any).roundRect(item.x, item.y - boxHeight, boxWidth, boxHeight, 6 * scale);
      ctx.fill();
    } else {
      ctx.fillRect(item.x, item.y - boxHeight, boxWidth, boxHeight);
    }

    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, item.x + paddingX, item.y - boxHeight / 2);

    if (isSelected) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2 * scale;
      ctx.setLineDash([4 * scale, 4 * scale]);
      ctx.strokeRect(item.x - 3, item.y - boxHeight - 3, boxWidth + 6, boxHeight + 6);
    }

    ctx.restore();
  }

  /**
   * Verifica se o clique atingiu alguma anotação existente (de cima para baixo)
   */
  private findHitAnnotation(pos: { x: number; y: number }): AnnotationItem | null {
    const list = this.annotations();
    for (let i = list.length - 1; i >= 0; i--) {
      const item = list[i];
      if (item.type === 'text') {
        if (
          pos.x >= item.x &&
          pos.x <= item.x + item.width &&
          pos.y >= item.y - item.height &&
          pos.y <= item.y
        ) {
          return item;
        }
      } else if (item.type === 'rectangle') {
        const minX = Math.min(item.x, item.x + item.width);
        const maxX = Math.max(item.x, item.x + item.width);
        const minY = Math.min(item.y, item.y + item.height);
        const maxY = Math.max(item.y, item.y + item.height);
        const tolerance = 10;
        if (
          pos.x >= minX - tolerance &&
          pos.x <= maxX + tolerance &&
          pos.y >= minY - tolerance &&
          pos.y <= maxY + tolerance
        ) {
          return item;
        }
      }
    }
    return null;
  }

  setActiveTool(tool: AnnotationTool): void {
    this.activeTool.set(tool);
    this.selectedAnnotationId.set(null);
    this.closeTextAnnotation();
    this.renderCanvas();
  }

  undoLastAction(): void {
    if (this.annotations().length === 0) return;
    this.annotations.update((items) => items.slice(0, -1));
    this.selectedAnnotationId.set(null);
    this.closeTextAnnotation();
    this.renderCanvas();
  }

  deleteSelectedAnnotation(): void {
    const selectedId = this.selectedAnnotationId();
    if (selectedId) {
      this.annotations.update((items) => items.filter((i) => i.id !== selectedId));
      this.selectedAnnotationId.set(null);
      this.renderCanvas();
      this.toastr.info('Elemento removido.');
    }
  }

  clearAnnotations(): void {
    this.annotations.set([]);
    this.selectedAnnotationId.set(null);
    this.closeTextAnnotation();
    this.renderCanvas();
  }

  onCanvasMouseMove(event: MouseEvent): void {
    if (this.isDrawing || this.isMovingAnnotation) {
      this.draw(event);
      return;
    }
    const pos = this.getCanvasPosition(event);
    const hit = this.findHitAnnotation(pos);
    if (hit) {
      this.canvasCursor.set('move');
    } else {
      this.canvasCursor.set(this.activeTool() === 'text' ? 'text' : 'crosshair');
    }
  }

  startDrawing(event: MouseEvent | TouchEvent): void {
    if (!this.isDrawingMode() || !this.ctx || !this.drawingCanvas) return;

    const pos = this.getCanvasPosition(event);

    // 1. Verificar se clicou em uma anotação existente para selecioná-la e arrastar
    const hitItem = this.findHitAnnotation(pos);
    if (hitItem) {
      this.selectedAnnotationId.set(hitItem.id);
      this.isMovingAnnotation = true;
      this.movingAnnotationItem = hitItem;
      this.moveOffset = { x: pos.x - hitItem.x, y: pos.y - hitItem.y };
      this.renderCanvas();
      return;
    }

    // 2. Se clicou fora de qualquer anotação, desmarcar a seleção atual
    this.selectedAnnotationId.set(null);

    // 3. Se ferramenta for Texto, abrir o editor flutuante
    if (this.activeTool() === 'text') {
      const clientPos = this.getClientPosition(event);
      this.textAnnotation.set({
        visible: true,
        canvasX: pos.x,
        canvasY: pos.y,
        screenX: clientPos.x,
        screenY: clientPos.y,
        text: '',
      });
      setTimeout(() => {
        if (this.floatingTextInput) {
          this.floatingTextInput.nativeElement.focus();
        }
      }, 50);
      this.renderCanvas();
      return;
    }

    // 4. Criar nova anotação de Retângulo ou Caneta Livre
    this.isDrawing = true;
    this.startPos = pos;

    if (this.activeTool() === 'rectangle') {
      const newRect: AnnotationItem = {
        id: 'rect_' + Date.now(),
        type: 'rectangle',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color: this.drawColor,
        lineWidth: this.lineWidth,
      };
      this.currentDrawingItem = newRect;
      this.annotations.update((items) => [...items, newRect]);
      this.selectedAnnotationId.set(newRect.id);
    } else if (this.activeTool() === 'freehand') {
      const newPath: AnnotationItem = {
        id: 'free_' + Date.now(),
        type: 'freehand',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color: this.drawColor,
        lineWidth: this.lineWidth,
        points: [{ x: pos.x, y: pos.y }],
      };
      this.currentDrawingItem = newPath;
      this.annotations.update((items) => [...items, newPath]);
    }
  }

  draw(event: MouseEvent | TouchEvent): void {
    const pos = this.getCanvasPosition(event);

    // Arrastar/reposicionar anotação existente
    if (this.isMovingAnnotation && this.movingAnnotationItem) {
      this.movingAnnotationItem.x = pos.x - this.moveOffset.x;
      this.movingAnnotationItem.y = pos.y - this.moveOffset.y;
      this.renderCanvas();
      return;
    }

    // Desenhar nova forma
    if (!this.isDrawing || !this.currentDrawingItem) return;

    if (this.currentDrawingItem.type === 'rectangle') {
      this.currentDrawingItem.width = pos.x - this.startPos.x;
      this.currentDrawingItem.height = pos.y - this.startPos.y;
      this.renderCanvas();
    } else if (this.currentDrawingItem.type === 'freehand') {
      this.currentDrawingItem.points?.push({ x: pos.x, y: pos.y });
      this.renderCanvas();
    }
  }

  stopDrawing(): void {
    if (this.currentDrawingItem && this.currentDrawingItem.type === 'rectangle') {
      // Normalizar retângulo com largura/altura negativas
      if (this.currentDrawingItem.width < 0) {
        this.currentDrawingItem.x += this.currentDrawingItem.width;
        this.currentDrawingItem.width = Math.abs(this.currentDrawingItem.width);
      }
      if (this.currentDrawingItem.height < 0) {
        this.currentDrawingItem.y += this.currentDrawingItem.height;
        this.currentDrawingItem.height = Math.abs(this.currentDrawingItem.height);
      }

      // Descartar cliques muito curtos sem arraste
      if (this.currentDrawingItem.width < 8 && this.currentDrawingItem.height < 8) {
        this.annotations.update((items) =>
          items.filter((i) => i.id !== this.currentDrawingItem!.id)
        );
        this.selectedAnnotationId.set(null);
      }
    }

    this.isDrawing = false;
    this.isMovingAnnotation = false;
    this.movingAnnotationItem = null;
    this.currentDrawingItem = null;
    this.renderCanvas();
  }

  applyTextAnnotation(): void {
    const current = this.textAnnotation();
    const text = current.text.trim();
    if (!text || !this.ctx || !this.drawingCanvas) {
      this.closeTextAnnotation();
      return;
    }

    const newTextItem: AnnotationItem = {
      id: 'text_' + Date.now(),
      type: 'text',
      x: current.canvasX,
      y: current.canvasY,
      width: 0,
      height: 0,
      color: '#ef4444',
      lineWidth: 2,
      text: text,
    };

    this.annotations.update((items) => [...items, newTextItem]);
    this.selectedAnnotationId.set(newTextItem.id);
    this.closeTextAnnotation();
    this.renderCanvas();
    this.toastr.success('Texto adicionado! Você pode clicar nele para arrastar e reposicionar.');
  }

  closeTextAnnotation(): void {
    this.textAnnotation.set({
      visible: false,
      canvasX: 0,
      canvasY: 0,
      screenX: 0,
      screenY: 0,
      text: '',
    });
  }

  updateAnnotationText(val: string): void {
    const current = this.textAnnotation();
    this.textAnnotation.set({
      ...current,
      text: val,
    });
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

  private getClientPosition(event: MouseEvent | TouchEvent): { x: number; y: number } {
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    return { x: clientX, y: clientY };
  }

  // =========================================================================
  // 5. ENVIO E LISTAGEM
  // =========================================================================

  onSubmit(): void {
    if (this.feedbackForm.invalid) {
      this.feedbackForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);

    // Exporta imagem sem bordas de seleção visíveis
    let finalScreenshot: string | undefined = undefined;
    if (this.drawingCanvas && this.drawingCanvas.nativeElement && this.baseImage) {
      this.renderCanvas(false);
      finalScreenshot = this.drawingCanvas.nativeElement.toDataURL('image/png');
      this.renderCanvas(true); // Restaura visualização
    } else {
      finalScreenshot = this.screenshotDataUrl() || undefined;
    }

    const formValues = this.feedbackForm.value;

    const payload = {
      type: formValues.type,
      title: formValues.title,
      description: formValues.description,
      currentRoute: this.currentRoute,
      browserInfo: this.browserInfo,
      screenResolution: this.screenResolution,
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
        this.feedbackService.markUserRead().subscribe({
          next: () => this.feedbackService.notifyFeedbackUpdated(),
        });
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
