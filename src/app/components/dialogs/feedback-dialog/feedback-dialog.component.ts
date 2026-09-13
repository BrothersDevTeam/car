import { Component, ElementRef, HostListener, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import html2canvas from 'html2canvas';

import { FeedbackService } from '@services/feedback.service';
import { Feedback, FeedbackType, FeedbackStatus } from '@interfaces/feedback';
import { FeedbackStepperComponent } from '@components/feedback-stepper/feedback-stepper.component';

export type AnnotationTool = 'rectangle' | 'arrow' | 'freehand' | 'text';

export interface AnnotationItem {
  id: string;
  type: 'rectangle' | 'arrow' | 'freehand' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  lineWidth: number;
  text?: string;
  fontSize?: number;
  textColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  rotation?: number;
  points?: { x: number; y: number }[];
  endX?: number;
  endY?: number;
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
    MatMenuModule,
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
  @ViewChild('titleInput') titleInput?: ElementRef<HTMLInputElement>;
  @ViewChild('customColorPicker') customColorPicker?: ElementRef<HTMLInputElement>;

  private fb = inject(FormBuilder);
  private feedbackService = inject(FeedbackService);
  private toastr = inject(ToastrService);
  private router = inject(Router);
  public dialogRef = inject(MatDialogRef<FeedbackDialogComponent>);
  public dialogData = inject<{ initialType?: FeedbackType; openMyFeedbacks?: boolean } | null>(
    MAT_DIALOG_DATA,
    { optional: true }
  );
  private elementRef = inject(ElementRef);

  feedbackForm!: FormGroup;
  selectedTabIndex = 0;

  // Screenshot & Annotation State
  capturingScreenshot = signal<boolean>(false);
  screenshotDataUrl = signal<string | null>(null);
  isDrawingMode = signal<boolean>(false);
  isCanvasMaximized = signal<boolean>(false);
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
  private isResizingAnnotation = false;
  private activeResizeHandle: 'nw' | 'ne' | 'se' | 'sw' | null = null;
  private resizingItem: AnnotationItem | null = null;
  private initialDistanceToCenter = 0;
  private initialFontSize = 18;

  // Redimensionamento de Raio de Retângulo (Alça de cantos arredondados)
  private isResizingRadius = false;
  private resizingRadiusItem: AnnotationItem | null = null;
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
  drawColor = '#ef4444';
  lineWidth = 4;

  selectedColor = signal<string>('#ef4444');
  selectedLineWidth = signal<number>(4);
  selectedFontSize = signal<number>(18);
  selectedTextColor = signal<string>('#ffffff');
  selectedRectBgColor = signal<string>('transparent');
  selectedRectBaseColor = signal<string>('transparent');
  selectedBgOpacity = signal<number>(100);
  selectedBorderRadius = signal<number>(0);
  selectedRotation = signal<number>(0);
  customColorTarget: 'stroke' | 'rectBg' | 'text' = 'stroke';

  // Rotação de Anotações (Universal para todos os componentes)
  private isRotatingAnnotation = false;
  private rotatingItem: AnnotationItem | null = null;

  readonly colorPalette: string[] = [
    '#ef4444',
    '#f97316',
    '#f59e0b',
    '#10b981',
    '#3b82f6',
    '#8b5cf6',
    '#0f172a',
    '#ffffff',
  ];

  readonly textColorsPalette: string[] = [
    '#ef4444',
    '#f97316',
    '#f59e0b',
    '#10b981',
    '#3b82f6',
    '#8b5cf6',
    '#0f172a',
    '#ffffff',
  ];

  readonly rectBgColorsPalette: string[] = [
    'transparent',
    '#ef4444',
    '#f97316',
    '#f59e0b',
    '#10b981',
    '#3b82f6',
    '#8b5cf6',
    '#0f172a',
    '#ffffff',
  ];

  readonly lineWeights: { label: string; width: number }[] = [
    { label: 'Fina', width: 2 },
    { label: 'Média', width: 4 },
    { label: 'Grossa', width: 6 },
    { label: 'Extra', width: 8 },
  ];

  get selectedTypeObj() {
    const currentVal = this.feedbackForm?.get('type')?.value;
    return this.feedbackTypes.find((t) => t.value === currentVal) || null;
  }

  get isTextSelectedOrActive(): boolean {
    if (this.activeTool() === 'text') return true;
    const selId = this.selectedAnnotationId();
    if (selId) {
      const item = this.annotations().find((a) => a.id === selId);
      return item?.type === 'text';
    }
    return false;
  }

  get isRectangleSelectedOrActive(): boolean {
    if (this.activeTool() === 'rectangle') return true;
    const selId = this.selectedAnnotationId();
    if (selId) {
      const item = this.annotations().find((a) => a.id === selId);
      return item?.type === 'rectangle';
    }
    return false;
  }

  isLightColor(hexColor: string): boolean {
    if (!hexColor || hexColor === '#ffffff') return true;
    const hex = hexColor.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 180;
    }
    return false;
  }

  setColor(color: string): void {
    this.selectedColor.set(color);
    this.drawColor = color;
    const selectedId = this.selectedAnnotationId();
    if (selectedId) {
      this.annotations.update((items) =>
        items.map((item) => {
          if (item.id === selectedId) {
            const isText = item.type === 'text';
            return {
              ...item,
              color,
              textColor: isText ? (this.isLightColor(color) ? '#0f172a' : '#ffffff') : item.textColor,
            };
          }
          return item;
        })
      );
      this.renderCanvas();
    }
  }

  setTextColor(color: string): void {
    this.selectedTextColor.set(color);
    const selectedId = this.selectedAnnotationId();
    if (selectedId) {
      this.annotations.update((items) =>
        items.map((item) =>
          item.id === selectedId && item.type === 'text' ? { ...item, textColor: color } : item
        )
      );
      this.renderCanvas();
    }
  }

  setFontSize(size: number): void {
    const clamped = Math.min(72, Math.max(10, size));
    this.selectedFontSize.set(clamped);
    const selectedId = this.selectedAnnotationId();
    if (selectedId) {
      this.annotations.update((items) =>
        items.map((item) => (item.id === selectedId && item.type === 'text' ? { ...item, fontSize: clamped } : item))
      );
      this.renderCanvas();
    }
  }

  adjustFontSize(delta: number): void {
    const current = this.selectedFontSize();
    const next = Math.min(72, Math.max(10, current + delta));
    this.setFontSize(next);
  }

  onFontSizeInputChange(val: string | number): void {
    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    if (!isNaN(num)) {
      this.setFontSize(num);
    }
  }

  setLineWidth(width: number): void {
    this.selectedLineWidth.set(width);
    this.lineWidth = width;
    const selectedId = this.selectedAnnotationId();
    if (selectedId) {
      this.annotations.update((items) =>
        items.map((item) => (item.id === selectedId ? { ...item, lineWidth: width } : item))
      );
      this.renderCanvas();
    }
  }

  hexToRgba(hex: string, opacityPercent: number): string {
    if (!hex || hex === 'transparent') return 'transparent';
    const clamped = Math.max(0, Math.min(100, opacityPercent));
    if (clamped >= 100) {
      return hex.startsWith('#') && hex.length >= 7 ? hex.substring(0, 7) : hex;
    }
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 8) cleanHex = cleanHex.substring(0, 6);
    if (cleanHex.length === 3) cleanHex = cleanHex.split('').map((c) => c + c).join('');
    if (cleanHex.length === 6) {
      const alphaHex = Math.round((clamped / 100) * 255)
        .toString(16)
        .padStart(2, '0');
      return `#${cleanHex}${alphaHex}`;
    }
    return hex;
  }

  parseHexColorAndOpacity(color: string): { baseColor: string; opacity: number } {
    if (!color || color === 'transparent') {
      return { baseColor: 'transparent', opacity: 100 };
    }
    const cleanHex = color.replace('#', '');
    if (cleanHex.length === 8) {
      const base = '#' + cleanHex.substring(0, 6);
      const alphaVal = parseInt(cleanHex.substring(6, 8), 16);
      const opacity = Math.round((alphaVal / 255) * 100);
      return { baseColor: base, opacity };
    }
    return { baseColor: color, opacity: 100 };
  }

  setRectBgColor(color: string): void {
    this.selectedRectBaseColor.set(color);
    let finalColor = 'transparent';
    if (color !== 'transparent') {
      finalColor = this.hexToRgba(color, this.selectedBgOpacity());
    }
    this.selectedRectBgColor.set(finalColor);

    const selectedId = this.selectedAnnotationId();
    if (selectedId) {
      this.annotations.update((items) =>
        items.map((item) =>
          item.id === selectedId && item.type === 'rectangle'
            ? { ...item, backgroundColor: finalColor }
            : item
        )
      );
      this.renderCanvas();
    }
  }

  setRectBgOpacity(opacity: number | string): void {
    const num = typeof opacity === 'string' ? parseInt(opacity, 10) : opacity;
    if (isNaN(num)) return;
    const clamped = Math.max(5, Math.min(100, Math.round(num)));
    this.selectedBgOpacity.set(clamped);

    const baseColor = this.selectedRectBaseColor();
    if (baseColor && baseColor !== 'transparent') {
      const finalColor = this.hexToRgba(baseColor, clamped);
      this.selectedRectBgColor.set(finalColor);

      const selectedId = this.selectedAnnotationId();
      if (selectedId) {
        this.annotations.update((items) =>
          items.map((item) =>
            item.id === selectedId && item.type === 'rectangle'
              ? { ...item, backgroundColor: finalColor }
              : item
          )
        );
        this.renderCanvas();
      }
    }
  }

  adjustBgOpacity(delta: number): void {
    this.setRectBgOpacity(this.selectedBgOpacity() + delta);
  }

  setSelectedRotation(degrees: number | string): void {
    const num = typeof degrees === 'string' ? parseInt(degrees, 10) : degrees;
    if (isNaN(num)) return;
    const normalized = (Math.round(num) % 360 + 360) % 360;
    this.selectedRotation.set(normalized);

    const selectedId = this.selectedAnnotationId();
    if (selectedId) {
      this.annotations.update((items) =>
        items.map((item) =>
          item.id === selectedId ? { ...item, rotation: normalized } : item
        )
      );
      this.renderCanvas();
    }
  }

  rotateSelectedBy(deltaDegrees: number): void {
    const current = this.selectedRotation();
    this.setSelectedRotation(current + deltaDegrees);
  }

  setBorderRadius(radius: number): void {
    const clamped = Math.max(0, Math.min(100, Math.round(radius)));
    this.selectedBorderRadius.set(clamped);
    const selectedId = this.selectedAnnotationId();
    if (selectedId) {
      this.annotations.update((items) =>
        items.map((item) =>
          item.id === selectedId && item.type === 'rectangle' ? { ...item, borderRadius: clamped } : item
        )
      );
      this.renderCanvas();
    }
  }

  adjustBorderRadius(delta: number): void {
    this.setBorderRadius(this.selectedBorderRadius() + delta);
  }

  openColorPicker(target: 'stroke' | 'rectBg' | 'text'): void {
    this.customColorTarget = target;
    if (this.customColorPicker) {
      let currentColor = '#ef4444';
      if (target === 'stroke') currentColor = this.selectedColor();
      else if (target === 'text') currentColor = this.selectedTextColor();
      else if (target === 'rectBg') {
        const base = this.selectedRectBaseColor();
        currentColor = base && base !== 'transparent' ? (base.length > 7 ? base.substring(0, 7) : base) : '#ffffff';
      }
      this.customColorPicker.nativeElement.value = currentColor.startsWith('#') && currentColor.length === 7 ? currentColor : '#ef4444';
      this.customColorPicker.nativeElement.click();
    }
  }

  onCustomColorPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const color = input.value;
    if (!color) return;

    if (this.customColorTarget === 'stroke') {
      this.setColor(color);
    } else if (this.customColorTarget === 'text') {
      this.setTextColor(color);
    } else if (this.customColorTarget === 'rectBg') {
      this.setRectBgColor(color);
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (this.selectedAnnotationId()) {
        this.deleteSelectedAnnotation();
      }
    }
  }

  feedbackTypes: { label: string; value: FeedbackType; icon: string; color: string }[] = [
    { label: 'Erro / Bug', value: 'BUG', icon: 'bug_report', color: '#ef4444' },
    { label: 'Sugestão', value: 'SUGGESTION', icon: 'lightbulb', color: '#3b82f6' },
    { label: 'Elogios', value: 'PRAISE', icon: 'sentiment_very_satisfied', color: '#10b981' },
    { label: 'Melhoria de UI', value: 'IMPROVEMENT', icon: 'auto_awesome', color: '#8b5cf6' },
    { label: 'Crítica', value: 'CRITICISM', icon: 'feedback', color: '#f59e0b' },
    { label: 'Outro', value: 'OTHER', icon: 'more_horiz', color: '#6b7280' },
  ];

  ngOnInit(): void {
    this.initForm();
    this.collectMetadata();
    this.loadMyFeedbacks();

    if (this.dialogData?.openMyFeedbacks) {
      this.selectedTabIndex = 1;
    } else if (this.dialogData?.initialType) {
      this.onSelectType(this.dialogData.initialType);
    }
  }

  private initForm(): void {
    this.feedbackForm = this.fb.group({
      type: [null as FeedbackType | null, [Validators.required]],
      title: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', [Validators.required]],
    });
  }

  onSelectType(type: FeedbackType): void {
    this.feedbackForm.get('type')?.setValue(type);
    setTimeout(() => {
      if (this.titleInput?.nativeElement) {
        this.titleInput.nativeElement.focus();
      }
    }, 50);
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
      if (hadAction && currentRect.width >= 15 && currentRect.height >= 15) {
        // Posicionamento inteligente para a barra NUNCA ficar cortada ou fora da tela
        if (currentRect.height >= 75) {
          actionToolbar.style.bottom = '12px';
          actionToolbar.style.top = 'auto';
          actionToolbar.style.right = '12px';
        } else if (currentRect.y > 60) {
          actionToolbar.style.top = '-48px';
          actionToolbar.style.bottom = 'auto';
          actionToolbar.style.right = '0px';
        } else {
          actionToolbar.style.top = '6px';
          actionToolbar.style.bottom = 'auto';
          actionToolbar.style.right = '10px';
        }
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
    this.isCanvasMaximized.set(false);
    this.baseImage = null;
    this.closeTextAnnotation();
  }

  toggleMaximizeCanvas(): void {
    this.isCanvasMaximized.set(!this.isCanvasMaximized());
    setTimeout(() => {
      this.renderCanvas();
    }, 60);
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

  rotatePoint(
    point: { x: number; y: number },
    center: { x: number; y: number },
    angleDegrees: number
  ): { x: number; y: number } {
    if (!angleDegrees) return { ...point };
    const rad = (angleDegrees * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return {
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos,
    };
  }

  getItemCenter(item: AnnotationItem): { x: number; y: number } {
    if (item.type === 'text') {
      return { x: item.x, y: item.y };
    } else if (item.type === 'arrow') {
      const endX = item.endX ?? item.x;
      const endY = item.endY ?? item.y;
      return { x: (item.x + endX) / 2, y: (item.y + endY) / 2 };
    } else if (item.type === 'freehand' && item.points && item.points.length > 0) {
      const bounds = this.getFreehandBounds(item.points);
      return { x: bounds.minX + bounds.width / 2, y: bounds.minY + bounds.height / 2 };
    } else {
      return { x: item.x + item.width / 2, y: item.y + item.height / 2 };
    }
  }

  getItemBoundingBox(item: AnnotationItem): {
    minX: number;
    minY: number;
    width: number;
    height: number;
  } {
    if (item.type === 'text') {
      const w = item.width || 60;
      const h = item.height || 30;
      return { minX: item.x - w / 2, minY: item.y - h / 2, width: w, height: h };
    } else if (item.type === 'arrow') {
      const startX = item.x;
      const startY = item.y;
      const endX = item.endX ?? item.x;
      const endY = item.endY ?? item.y;
      const minX = Math.min(startX, endX);
      const minY = Math.min(startY, endY);
      const width = Math.max(24, Math.abs(endX - startX));
      const height = Math.max(24, Math.abs(endY - startY));
      return { minX, minY, width, height };
    } else if (item.type === 'freehand' && item.points && item.points.length > 0) {
      return this.getFreehandBounds(item.points);
    } else {
      const minX = Math.min(item.x, item.x + item.width);
      const minY = Math.min(item.y, item.y + item.height);
      const width = Math.abs(item.width);
      const height = Math.abs(item.height);
      return { minX, minY, width, height };
    }
  }

  getRotationHandlePosition(item: AnnotationItem): { x: number; y: number } {
    const center = this.getItemCenter(item);
    const box = this.getItemBoundingBox(item);
    const localHandle = { x: center.x, y: box.minY - 26 };
    return this.rotatePoint(localHandle, center, item.rotation || 0);
  }

  isPointNearRotationHandle(pos: { x: number; y: number }): AnnotationItem | null {
    const selId = this.selectedAnnotationId();
    if (!selId) return null;
    const item = this.annotations().find((a) => a.id === selId);
    if (!item) return null;
    const handlePos = this.getRotationHandlePosition(item);
    return Math.hypot(pos.x - handlePos.x, pos.y - handlePos.y) <= 15 ? item : null;
  }

  private drawRotationHandle(ctx: CanvasRenderingContext2D, item: AnnotationItem): void {
    const center = this.getItemCenter(item);
    const box = this.getItemBoundingBox(item);
    const handleX = center.x;
    const handleY = box.minY - 26;

    ctx.save();
    ctx.setLineDash([]);

    // Linha haste conectando topo da caixa à alça
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(handleX, box.minY - 4);
    ctx.lineTo(handleX, handleY);
    ctx.stroke();

    // Círculo externo da alça de rotação
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(handleX, handleY, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ponto central
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(handleX, handleY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
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
      const center = this.getItemCenter(item);
      const rotation = item.rotation || 0;

      this.ctx.save();
      if (rotation !== 0) {
        this.ctx.translate(center.x, center.y);
        this.ctx.rotate((rotation * Math.PI) / 180);
        this.ctx.translate(-center.x, -center.y);
      }

      if (item.type === 'rectangle') {
        this.drawRectangle(this.ctx, item, isSelected);
      } else if (item.type === 'arrow') {
        this.drawArrow(this.ctx, item, isSelected);
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

          // Borda de seleção para caneta livre
          if (isSelected) {
            const bounds = this.getFreehandBounds(item.points);
            this.ctx.strokeStyle = '#38bdf8';
            this.ctx.lineWidth = 1.5;
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeRect(bounds.minX - 6, bounds.minY - 6, bounds.width + 12, bounds.height + 12);
          }

          this.ctx.restore();
        }
      } else if (item.type === 'text') {
        this.drawTextBadge(this.ctx, item, isSelected, canvas.width);
      }

      // Alça de rotação universal no topo do elemento selecionado
      if (isSelected) {
        this.drawRotationHandle(this.ctx, item);
      }

      this.ctx.restore();
    }
  }

  private drawRectangle(
    ctx: CanvasRenderingContext2D,
    item: AnnotationItem,
    isSelected: boolean
  ): void {
    ctx.save();

    const minX = Math.min(item.x, item.x + item.width);
    const minY = Math.min(item.y, item.y + item.height);
    const w = Math.abs(item.width);
    const h = Math.abs(item.height);
    const maxRadius = Math.round(Math.min(w, h) / 2);
    const radius = Math.min(maxRadius, Math.max(0, item.borderRadius ?? 0));

    // Caminho do retângulo com ou sem cantos arredondados
    ctx.beginPath();
    if (radius > 0) {
      if (ctx.roundRect) {
        ctx.roundRect(minX, minY, w, h, radius);
      } else {
        ctx.moveTo(minX + radius, minY);
        ctx.arcTo(minX + w, minY, minX + w, minY + h, radius);
        ctx.arcTo(minX + w, minY + h, minX, minY + h, radius);
        ctx.arcTo(minX, minY + h, minX, minY, radius);
        ctx.arcTo(minX, minY, minX + w, minY, radius);
        ctx.closePath();
      }
    } else {
      ctx.rect(minX, minY, w, h);
    }

    // Preenchimento com cor de fundo (se definida e diferente de transparente)
    if (item.backgroundColor && item.backgroundColor !== 'transparent') {
      ctx.fillStyle = item.backgroundColor;
      ctx.fill();
    }

    // Borda do retângulo
    ctx.strokeStyle = item.color;
    ctx.lineWidth = item.lineWidth;
    ctx.stroke();

    // Borda de seleção e alça interativa de raio
    if (isSelected) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(minX - 4, minY - 4, w + 8, h + 8);

      // Alça de arredondamento de cantos (estilo Figma/Illustrator)
      if (w >= 24 && h >= 24) {
        ctx.setLineDash([]);
        const handlePos = this.getRectRadiusHandle(item);

        // Linha guia sutil até o ponto de controle
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(minX, minY);
        ctx.lineTo(handlePos.x, handlePos.y);
        ctx.stroke();

        // Círculo externo da alça
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(handlePos.x, handlePos.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Ponto central da alça
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(handlePos.x, handlePos.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private getRectRadiusHandle(item: AnnotationItem): { x: number; y: number } {
    const minX = Math.min(item.x, item.x + item.width);
    const minY = Math.min(item.y, item.y + item.height);
    const w = Math.abs(item.width);
    const h = Math.abs(item.height);
    const maxR = Math.round(Math.min(w, h) / 2);
    const r = Math.min(maxR, Math.max(0, item.borderRadius ?? 0));
    const offset = Math.min(maxR - 5, Math.max(12, r + 8));
    return { x: minX + offset, y: minY + offset };
  }

  private isPointNearRadiusHandle(pos: { x: number; y: number }): AnnotationItem | null {
    const selId = this.selectedAnnotationId();
    if (!selId) return null;
    const item = this.annotations().find((a) => a.id === selId && a.type === 'rectangle');
    if (!item) return null;

    const center = this.getItemCenter(item);
    const localPos = this.rotatePoint(pos, center, -(item.rotation || 0));

    const handlePos = this.getRectRadiusHandle(item);
    return Math.hypot(localPos.x - handlePos.x, localPos.y - handlePos.y) <= 14 ? item : null;
  }

  private drawArrow(
    ctx: CanvasRenderingContext2D,
    item: AnnotationItem,
    isSelected: boolean
  ): void {
    const startX = item.x;
    const startY = item.y;
    const endX = item.endX ?? item.x;
    const endY = item.endY ?? item.y;

    const dx = endX - startX;
    const dy = endY - startY;
    const angle = Math.atan2(dy, dx);
    const length = Math.hypot(dx, dy);

    ctx.save();
    ctx.strokeStyle = item.color;
    ctx.fillStyle = item.color;
    ctx.lineWidth = item.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const headLength = Math.max(14, item.lineWidth * 3.5);
    const headAngle = Math.PI / 6;

    // Haste da seta
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Cabeça da seta
    if (length > 6) {
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - headLength * Math.cos(angle - headAngle),
        endY - headLength * Math.sin(angle - headAngle)
      );
      ctx.lineTo(
        endX - headLength * 0.7 * Math.cos(angle),
        endY - headLength * 0.7 * Math.sin(angle)
      );
      ctx.lineTo(
        endX - headLength * Math.cos(angle + headAngle),
        endY - headLength * Math.sin(angle + headAngle)
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    if (isSelected) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      const minX = Math.min(startX, endX) - 8;
      const maxX = Math.max(startX, endX) + 8;
      const minY = Math.min(startY, endY) - 8;
      const maxY = Math.max(startY, endY) + 8;
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
    }

    ctx.restore();
  }

  private drawTextBadge(
    ctx: CanvasRenderingContext2D,
    item: AnnotationItem,
    isSelected: boolean,
    canvasWidth?: number
  ): void {
    if (!item.text) return;

    ctx.save();
    const fontSize = item.fontSize || 18;
    ctx.font = `bold ${fontSize}px sans-serif`;

    const paddingX = Math.round(fontSize * 0.7);
    const paddingY = Math.round(fontSize * 0.45);
    const textMetrics = ctx.measureText(item.text);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;

    const badgeWidth = Math.round(textWidth + paddingX * 2);
    const badgeHeight = Math.round(textHeight + paddingY * 2);

    // Atualiza dimensões no item para o cálculo do hit-test
    item.width = badgeWidth;
    item.height = badgeHeight;

    // x e y representam o CENTRO da anotação
    const badgeLeft = item.x - badgeWidth / 2;
    const badgeTop = item.y - badgeHeight / 2;

    // Sombra suave na caixinha para destacar sobre qualquer fundo
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    // Fundo do badge com cantos arredondados
    const radius = Math.min(8, Math.round(fontSize * 0.35));
    ctx.fillStyle = item.color || '#ef4444';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(badgeLeft, badgeTop, badgeWidth, badgeHeight, radius);
    } else {
      ctx.rect(badgeLeft, badgeTop, badgeWidth, badgeHeight);
    }
    ctx.fill();

    // Resetar sombras para que o texto não sofra deslocamento visual
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Texto perfeitamente centralizado
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = item.textColor || (this.isLightColor(item.color) ? '#0f172a' : '#ffffff');
    ctx.fillText(item.text, item.x, item.y);

    // Moldura pontilhada e alças interativas quando o texto estiver selecionado
    if (isSelected) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(badgeLeft - 3, badgeTop - 3, badgeWidth + 6, badgeHeight + 6);

      // Alças circulares de redimensionamento nos 4 cantos
      ctx.setLineDash([]);
      const handleRadius = 4.5;
      const corners = [
        { x: badgeLeft - 3, y: badgeTop - 3 },
        { x: badgeLeft + badgeWidth + 3, y: badgeTop - 3 },
        { x: badgeLeft + badgeWidth + 3, y: badgeTop + badgeHeight + 3 },
        { x: badgeLeft - 3, y: badgeTop + badgeHeight + 3 },
      ];

      for (const corner of corners) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(corner.x, corner.y, handleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  private getTextResizeHandle(pos: { x: number; y: number }): { handle: 'nw' | 'ne' | 'se' | 'sw'; item: AnnotationItem } | null {
    const selId = this.selectedAnnotationId();
    if (!selId) return null;
    const item = this.annotations().find((a) => a.id === selId && a.type === 'text');
    if (!item || !item.width || !item.height) return null;

    const center = this.getItemCenter(item);
    const localPos = this.rotatePoint(pos, center, -(item.rotation || 0));

    const badgeLeft = Math.round(item.x - item.width / 2);
    const badgeTop = Math.round(item.y - item.height / 2);
    const handleHitRadius = 14;

    const corners: { handle: 'nw' | 'ne' | 'se' | 'sw'; x: number; y: number }[] = [
      { handle: 'nw', x: badgeLeft - 3, y: badgeTop - 3 },
      { handle: 'ne', x: badgeLeft + item.width + 3, y: badgeTop - 3 },
      { handle: 'se', x: badgeLeft + item.width + 3, y: badgeTop + item.height + 3 },
      { handle: 'sw', x: badgeLeft - 3, y: badgeTop + item.height + 3 },
    ];

    for (const c of corners) {
      if (Math.hypot(localPos.x - c.x, localPos.y - c.y) <= handleHitRadius) {
        return { handle: c.handle, item };
      }
    }
    return null;
  }

  private distanceToSegment(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  private getFreehandBounds(points: { x: number; y: number }[]): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
  } {
    if (!points || points.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
    }
    let minX = points[0].x;
    let maxX = points[0].x;
    let minY = points[0].y;
    let maxY = points[0].y;
    for (const pt of points) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }
    return {
      minX,
      maxX,
      minY,
      maxY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    };
  }

  private isPointNearFreehand(
    pos: { x: number; y: number },
    points: { x: number; y: number }[],
    tolerance: number
  ): boolean {
    if (!points || points.length === 0) return false;
    for (let i = 0; i < points.length - 1; i++) {
      if (
        this.distanceToSegment(
          pos.x,
          pos.y,
          points[i].x,
          points[i].y,
          points[i + 1].x,
          points[i + 1].y
        ) <= tolerance
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Verifica se o clique atingiu alguma anotação existente (de cima para baixo)
   */
  private findHitAnnotation(pos: { x: number; y: number }): AnnotationItem | null {
    const list = this.annotations();
    for (let i = list.length - 1; i >= 0; i--) {
      const item = list[i];
      const center = this.getItemCenter(item);
      const localPos = this.rotatePoint(pos, center, -(item.rotation || 0));

      if (item.type === 'text') {
        const halfW = (item.width || 60) / 2;
        const halfH = (item.height || 30) / 2;
        if (
          localPos.x >= item.x - halfW &&
          localPos.x <= item.x + halfW &&
          localPos.y >= item.y - halfH &&
          localPos.y <= item.y + halfH
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
          localPos.x >= minX - tolerance &&
          localPos.x <= maxX + tolerance &&
          localPos.y >= minY - tolerance &&
          localPos.y <= maxY + tolerance
        ) {
          return item;
        }
      } else if (item.type === 'arrow') {
        const dist = this.distanceToSegment(
          localPos.x,
          localPos.y,
          item.x,
          item.y,
          item.endX ?? item.x,
          item.endY ?? item.y
        );
        if (dist <= Math.max(14, item.lineWidth * 2.5)) {
          return item;
        }
      } else if (item.type === 'freehand' && item.points && item.points.length > 0) {
        const bounds = this.getFreehandBounds(item.points);
        const tolerance = Math.max(14, item.lineWidth * 2.5);
        if (
          localPos.x >= bounds.minX - tolerance &&
          localPos.x <= bounds.maxX + tolerance &&
          localPos.y >= bounds.minY - tolerance &&
          localPos.y <= bounds.maxY + tolerance
        ) {
          if (this.isPointNearFreehand(localPos, item.points, tolerance)) {
            return item;
          }
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
    if (this.isDrawing || this.isMovingAnnotation || this.isResizingAnnotation || this.isResizingRadius || this.isRotatingAnnotation) {
      this.draw(event);
      return;
    }
    const pos = this.getCanvasPosition(event);

    // 1. Verificar se está sobre a alça de rotação de qualquer elemento selecionado
    const rotItem = this.isPointNearRotationHandle(pos);
    if (rotItem) {
      this.canvasCursor.set('grab');
      return;
    }

    // 2. Verificar se está sobre a alça de redimensionamento de texto selecionado
    const handleInfo = this.getTextResizeHandle(pos);
    if (handleInfo) {
      this.canvasCursor.set(
        handleInfo.handle === 'nw' || handleInfo.handle === 'se' ? 'nwse-resize' : 'nesw-resize'
      );
      return;
    }

    // 3. Verificar se está sobre a alça de raio de um retângulo selecionado
    const radiusItem = this.isPointNearRadiusHandle(pos);
    if (radiusItem) {
      this.canvasCursor.set('nwse-resize');
      return;
    }

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

    // 0.0 Verificar se clicou na alça de rotação de um elemento selecionado
    const rotHit = this.isPointNearRotationHandle(pos);
    if (rotHit) {
      this.isRotatingAnnotation = true;
      this.rotatingItem = rotHit;
      this.canvasCursor.set('grabbing');
      return;
    }

    // 0.1 Verificar se clicou em uma alça de redimensionamento de texto selecionado
    const handleHit = this.getTextResizeHandle(pos);
    if (handleHit) {
      this.isResizingAnnotation = true;
      this.activeResizeHandle = handleHit.handle;
      this.resizingItem = handleHit.item;
      this.initialDistanceToCenter = Math.hypot(pos.x - handleHit.item.x, pos.y - handleHit.item.y);
      this.initialFontSize = handleHit.item.fontSize || 18;
      return;
    }

    // 0.2 Verificar se clicou na alça de raio de um retângulo selecionado
    const radiusItem = this.isPointNearRadiusHandle(pos);
    if (radiusItem) {
      this.isResizingRadius = true;
      this.resizingRadiusItem = radiusItem;
      return;
    }

    // 1. Verificar se clicou em uma anotação existente para selecioná-la e arrastar
    const hitItem = this.findHitAnnotation(pos);
    if (hitItem) {
      this.selectedAnnotationId.set(hitItem.id);
      this.isMovingAnnotation = true;
      this.movingAnnotationItem = hitItem;
      this.moveOffset = { x: pos.x, y: pos.y };

      // Sincronizar cor, tamanho e espessura do elemento selecionado na barra de ferramentas
      if (hitItem.color) {
        this.selectedColor.set(hitItem.color);
        this.drawColor = hitItem.color;
      }
      if (hitItem.lineWidth) {
        this.selectedLineWidth.set(hitItem.lineWidth);
        this.lineWidth = hitItem.lineWidth;
      }
      if (hitItem.fontSize) {
        this.selectedFontSize.set(hitItem.fontSize);
      }
      if (hitItem.textColor) {
        this.selectedTextColor.set(hitItem.textColor);
      }
      if (hitItem.rotation !== undefined) {
        this.selectedRotation.set(hitItem.rotation);
      } else {
        this.selectedRotation.set(0);
      }
      if (hitItem.type === 'rectangle') {
        if (hitItem.backgroundColor !== undefined) {
          this.selectedRectBgColor.set(hitItem.backgroundColor);
          if (hitItem.backgroundColor === 'transparent') {
            this.selectedRectBaseColor.set('transparent');
          } else {
            const parsed = this.parseHexColorAndOpacity(hitItem.backgroundColor);
            this.selectedRectBaseColor.set(parsed.baseColor);
            this.selectedBgOpacity.set(parsed.opacity);
          }
        }
        if (hitItem.borderRadius !== undefined) {
          this.selectedBorderRadius.set(hitItem.borderRadius);
        }
      }

      this.renderCanvas();
      return;
    }

    // 2. Se clicou fora de qualquer anotação, desmarcar a seleção atual
    this.selectedAnnotationId.set(null);
    this.selectedRotation.set(0);

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

    // 4. Criar nova anotação de Retângulo, Seta ou Caneta Livre
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
        color: this.selectedColor(),
        lineWidth: this.selectedLineWidth(),
        backgroundColor: this.selectedRectBgColor(),
        borderRadius: this.selectedBorderRadius(),
        rotation: 0,
      };
      this.currentDrawingItem = newRect;
      this.annotations.update((items) => [...items, newRect]);
      this.selectedAnnotationId.set(newRect.id);
    } else if (this.activeTool() === 'arrow') {
      const newArrow: AnnotationItem = {
        id: 'arrow_' + Date.now(),
        type: 'arrow',
        x: pos.x,
        y: pos.y,
        endX: pos.x,
        endY: pos.y,
        width: 0,
        height: 0,
        color: this.selectedColor(),
        lineWidth: this.selectedLineWidth(),
        rotation: 0,
      };
      this.currentDrawingItem = newArrow;
      this.annotations.update((items) => [...items, newArrow]);
      this.selectedAnnotationId.set(newArrow.id);
    } else if (this.activeTool() === 'freehand') {
      const newPath: AnnotationItem = {
        id: 'free_' + Date.now(),
        type: 'freehand',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color: this.selectedColor(),
        lineWidth: this.selectedLineWidth(),
        points: [{ x: pos.x, y: pos.y }],
        rotation: 0,
      };
      this.currentDrawingItem = newPath;
      this.annotations.update((items) => [...items, newPath]);
      this.selectedAnnotationId.set(newPath.id);
    }
  }

  draw(event: MouseEvent | TouchEvent): void {
    const pos = this.getCanvasPosition(event);

    // Rotacionar anotação via alça interativa
    if (this.isRotatingAnnotation && this.rotatingItem) {
      const center = this.getItemCenter(this.rotatingItem);
      const angleRad = Math.atan2(pos.y - center.y, pos.x - center.x);
      let deg = Math.round((angleRad * 180) / Math.PI) + 90;
      deg = (deg % 360 + 360) % 360;

      // Snap suave de 4° próximo aos ângulos cardeais e semi-cardeais
      for (const snap of [0, 45, 90, 135, 180, 225, 270, 315]) {
        if (Math.abs(deg - snap) <= 4) {
          deg = snap;
          break;
        }
      }

      this.rotatingItem.rotation = deg;
      this.selectedRotation.set(deg);
      this.renderCanvas();
      return;
    }

    // Redimensionar raio do retângulo via alça interativa
    if (this.isResizingRadius && this.resizingRadiusItem) {
      const minX = Math.min(this.resizingRadiusItem.x, this.resizingRadiusItem.x + this.resizingRadiusItem.width);
      const minY = Math.min(this.resizingRadiusItem.y, this.resizingRadiusItem.y + this.resizingRadiusItem.height);
      const w = Math.abs(this.resizingRadiusItem.width);
      const h = Math.abs(this.resizingRadiusItem.height);
      const maxRadius = Math.round(Math.min(w, h) / 2);

      const currentDist = Math.hypot(pos.x - minX, pos.y - minY);
      const newRadius = Math.min(maxRadius, Math.max(0, Math.round(currentDist - 8)));
      this.resizingRadiusItem.borderRadius = newRadius;
      this.selectedBorderRadius.set(newRadius);
      this.renderCanvas();
      return;
    }

    // Redimensionar anotação de texto via alças interativas
    if (this.isResizingAnnotation && this.resizingItem) {
      const currentDist = Math.hypot(pos.x - this.resizingItem.x, pos.y - this.resizingItem.y);
      const scale = currentDist / (this.initialDistanceToCenter || 1);
      const newFontSize = Math.min(72, Math.max(10, Math.round(this.initialFontSize * scale)));
      this.resizingItem.fontSize = newFontSize;
      this.selectedFontSize.set(newFontSize);
      this.renderCanvas();
      return;
    }

    // Arrastar/reposicionar anotação existente (delta incremental)
    if (this.isMovingAnnotation && this.movingAnnotationItem) {
      const dx = pos.x - this.moveOffset.x;
      const dy = pos.y - this.moveOffset.y;
      this.moveOffset = { x: pos.x, y: pos.y };

      const item = this.movingAnnotationItem;
      item.x += dx;
      item.y += dy;

      if (item.type === 'arrow') {
        if (item.endX !== undefined) item.endX += dx;
        if (item.endY !== undefined) item.endY += dy;
      } else if (item.type === 'freehand' && item.points) {
        for (const pt of item.points) {
          pt.x += dx;
          pt.y += dy;
        }
      }

      this.renderCanvas();
      return;
    }

    // Desenhar nova forma
    if (!this.isDrawing || !this.currentDrawingItem) return;

    if (this.currentDrawingItem.type === 'rectangle') {
      this.currentDrawingItem.width = pos.x - this.startPos.x;
      this.currentDrawingItem.height = pos.y - this.startPos.y;
    } else if (this.currentDrawingItem.type === 'arrow') {
      this.currentDrawingItem.endX = pos.x;
      this.currentDrawingItem.endY = pos.y;
    } else if (this.currentDrawingItem.type === 'freehand') {
      if (!this.currentDrawingItem.points) {
        this.currentDrawingItem.points = [];
      }
      this.currentDrawingItem.points.push({ x: pos.x, y: pos.y });
    }

    this.renderCanvas();
  }

  stopDrawing(): void {
    if (this.isRotatingAnnotation) {
      this.isRotatingAnnotation = false;
      this.rotatingItem = null;
      this.canvasCursor.set('grab');
      this.renderCanvas();
      return;
    }

    if (this.isResizingRadius) {
      this.isResizingRadius = false;
      this.resizingRadiusItem = null;
      this.renderCanvas();
      return;
    }

    if (this.isResizingAnnotation) {
      this.isResizingAnnotation = false;
      this.activeResizeHandle = null;
      this.resizingItem = null;
      this.renderCanvas();
      return;
    }

    if (this.isDrawing && this.currentDrawingItem) {
      if (this.currentDrawingItem.type === 'rectangle') {
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
      } else if (this.currentDrawingItem.type === 'arrow') {
        const dx = (this.currentDrawingItem.endX ?? this.currentDrawingItem.x) - this.currentDrawingItem.x;
        const dy = (this.currentDrawingItem.endY ?? this.currentDrawingItem.y) - this.currentDrawingItem.y;
        const length = Math.hypot(dx, dy);
        if (length < 8) {
          this.annotations.update((items) =>
            items.filter((i) => i.id !== this.currentDrawingItem!.id)
          );
          this.selectedAnnotationId.set(null);
        }
      } else if (this.currentDrawingItem.type === 'freehand') {
        if (!this.currentDrawingItem.points || this.currentDrawingItem.points.length < 2) {
          this.annotations.update((items) =>
            items.filter((i) => i.id !== this.currentDrawingItem!.id)
          );
          this.selectedAnnotationId.set(null);
        } else {
          const bounds = this.getFreehandBounds(this.currentDrawingItem.points);
          this.currentDrawingItem.x = bounds.minX;
          this.currentDrawingItem.y = bounds.minY;
          this.currentDrawingItem.width = bounds.maxX - bounds.minX;
          this.currentDrawingItem.height = bounds.maxY - bounds.minY;
        }
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

    const color = this.selectedColor();
    const fontSize = this.selectedFontSize();
    const textColor = this.selectedTextColor() || (this.isLightColor(color) ? '#0f172a' : '#ffffff');
    const newTextItem: AnnotationItem = {
      id: 'text_' + Date.now(),
      type: 'text',
      x: current.canvasX,
      y: current.canvasY,
      width: 0,
      height: 0,
      color: color,
      textColor: textColor,
      fontSize: fontSize,
      lineWidth: this.selectedLineWidth(),
      text: text,
      rotation: 0,
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
      this.focusFirstInvalidField();
      this.toastr.warning('Por favor, preencha os campos obrigatórios em destaque.');
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

  private focusFirstInvalidField(): void {
    const controls = ['title', 'description'];
    for (const name of controls) {
      const control = this.feedbackForm.get(name);
      if (control && control.invalid) {
        const inputElement = this.elementRef.nativeElement.querySelector(
          `[formControlName="${name}"]`
        ) as HTMLElement | null;

        if (inputElement) {
          inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => {
            inputElement.focus();
          }, 100);
          return;
        }
      }
    }

    const firstInvalid = this.elementRef.nativeElement.querySelector(
      '.ng-invalid[formControlName], mat-form-field.ng-invalid input, mat-form-field.ng-invalid textarea'
    ) as HTMLElement | null;

    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        firstInvalid.focus();
      }, 100);
    }
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
      case 'DISCARDED':
        return 'badge-resolved';
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
        return 'Concluído';
      case 'DISCARDED':
        return 'Respondido';
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
