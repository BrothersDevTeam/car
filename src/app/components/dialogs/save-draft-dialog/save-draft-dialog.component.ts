import { Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

/**
 * Interface que define os dados passados para o diálogo
 */
export interface SaveDraftDialogData {
  /** Nome sugerido para o rascunho (opcional) */
  suggestedName?: string;
  /** Título do diálogo */
  title?: string;
}

/**
 * Resultado retornado pelo diálogo
 */
export interface SaveDraftDialogResult {
  /** Nome escolhido pelo usuário */
  draftName: string;
  /** Se true, salvou; se false, cancelou */
  confirmed: boolean;
}

/**
 * Componente de diálogo para nomear um rascunho antes de salvá-lo
 *
 * Permite que o usuário dê um nome descritivo ao rascunho
 * para facilitar a identificação posterior
 *
 * @example
 * ```typescript
 * const dialogRef = this.dialog.open(SaveDraftDialogComponent, {
 *   data: {
 *     suggestedName: 'João Silva - Cliente',
 *     title: 'Salvar rascunho'
 *   }
 * });
 *
 * dialogRef.afterClosed().subscribe((result: SaveDraftDialogResult) => {
 *   if (result?.confirmed) {
 *     console.log('Nome do rascunho:', result.draftName);
 *   }
 * });
 * ```
 */
@Component({
  selector: 'app-save-draft-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
  ],
  template: `
    <div class="dialog-container">
      <!-- Cabeçalho -->
      <div class="dialog-header">
        <mat-icon class="draft-icon">save</mat-icon>
        <h2 mat-dialog-title>{{ data.title || 'Salvar rascunho' }}</h2>
      </div>

      <!-- Conteúdo -->
      <mat-dialog-content>
        <p class="dialog-message">
          Dê um nome para este rascunho para facilitar a identificação depois:
        </p>

        <mat-form-field
          appearance="outline"
          class="full-width"
        >
          <mat-label>Nome do rascunho</mat-label>
          <input
            matInput
            [(ngModel)]="draftName"
            placeholder="Ex: JOÃO SILVA - CLIENTE EM ANÁLISE"
            maxlength="100"
            (keyup)="draftName = draftName.toUpperCase()"
            (keyup.enter)="onSave()"
            #nameInput
          />
          <mat-hint align="end">{{ draftName.length }}/100</mat-hint>
        </mat-form-field>

        <div class="info-box">
          <mat-icon class="info-icon">info</mat-icon>
          <p class="info-text">
            O rascunho será salvo localmente no seu navegador e ficará
            disponível na lista de "Cadastros em andamento".
          </p>
        </div>
      </mat-dialog-content>

      <!-- Rodapé com botões -->
      <mat-dialog-actions align="end">
        <button
          mat-button
          (click)="onCancel()"
          class="cancel-button"
        >
          Cancelar
        </button>

        <button
          mat-raised-button
          color="primary"
          [disabled]="!draftName.trim()"
          (click)="onSave()"
          class="save-button"
        >
          <mat-icon>check</mat-icon>
          Salvar rascunho
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .dialog-container {
        padding: 8px;
        min-width: 400px;
      }

      .dialog-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 16px;

        .draft-icon {
          color: #2196f3;
          font-size: 32px;
          width: 32px;
          height: 32px;
        }

        h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 500;
        }
      }

      mat-dialog-content {
        .dialog-message {
          font-size: 16px;
          line-height: 1.5;
          margin: 0 0 16px 0;
          color: rgba(0, 0, 0, 0.87);
        }

        .full-width {
          width: 100%;
          margin-bottom: 16px;
        }

        .info-box {
          display: flex;
          gap: 12px;
          padding: 12px;
          background-color: #e3f2fd;
          border-radius: 4px;
          border-left: 4px solid #2196f3;

          .info-icon {
            color: #2196f3;
            font-size: 20px;
            width: 20px;
            height: 20px;
            flex-shrink: 0;
            margin-top: 2px;
          }

          .info-text {
            margin: 0;
            font-size: 14px;
            line-height: 1.5;
            color: rgba(0, 0, 0, 0.7);
          }
        }
      }

      mat-dialog-actions {
        gap: 8px;
        padding: 16px 0 8px 0;

        button {
          mat-icon {
            margin-right: 8px;
            font-size: 18px;
            width: 18px;
            height: 18px;
          }
        }

        .cancel-button {
          color: rgba(0, 0, 0, 0.6);
        }
      }

      @media (max-width: 500px) {
        .dialog-container {
          min-width: unset;
        }

        mat-dialog-actions {
          flex-direction: column;
          align-items: stretch;

          button {
            width: 100%;
          }
        }
      }
    `,
  ],
})
export class SaveDraftDialogComponent {
  /**
   * Injeta os dados passados para o diálogo
   */
  readonly data = inject<SaveDraftDialogData>(MAT_DIALOG_DATA);

  /**
   * Injeta a referência do diálogo
   */
  private readonly dialogRef = inject(MatDialogRef<SaveDraftDialogComponent>);

  /**
   * Nome do rascunho sendo editado
   * Inicia com o nome sugerido se fornecido
   */
  draftName: string = this.data.suggestedName || '';

  /**
   * Fecha o diálogo sem salvar
   */
  onCancel(): void {
    this.dialogRef.close({
      confirmed: false,
      draftName: '',
    } as SaveDraftDialogResult);
  }

  /**
   * Salva o rascunho com o nome fornecido
   */
  onSave(): void {
    const trimmedName = this.draftName.trim();

    if (!trimmedName) {
      return;
    }

    this.dialogRef.close({
      confirmed: true,
      draftName: trimmedName.toUpperCase(),
    } as SaveDraftDialogResult);
  }
}
