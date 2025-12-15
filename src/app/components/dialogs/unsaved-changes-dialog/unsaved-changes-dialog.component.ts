import { Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
  MatDialog,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  SaveDraftDialogComponent,
  SaveDraftDialogResult,
} from '../save-draft-dialog/save-draft-dialog.component';

/**
 * Interface que define os dados passados para o diálogo
 */
export interface UnsavedChangesDialogData {
  /** Se true, mostra botão para salvar completo */
  canSave: boolean;
  /** Mensagem customizada a ser exibida */
  message: string;
  /** Nome do rascunho atual, se houver (para edição) */
  /** Nome do rascunho atual, se houver (para edição) */
  currentDraftName?: string;
  /** Nome sugerido para um NOVO rascunho */
  suggestedDraftName?: string;
}

/**
 * Componente de diálogo moderno (standalone) que pergunta ao usuário
 * o que fazer com mudanças não salvas no formulário.
 *
 * Opções disponíveis:
 * - Salvar: salva as alterações completas (só aparece se canSave = true)
 * - Salvar rascunho: salva localmente no localStorage
 * - Não salvar: descarta as mudanças
 * - Cancelar: volta para o formulário
 *
 * @example
 * ```typescript
 * const dialogRef = this.dialog.open(UnsavedChangesDialogComponent, {
 *   data: {
 *     canSave: true,
 *     message: 'Deseja salvar as alterações?'
 *   }
 * });
 *
 * dialogRef.afterClosed().subscribe(result => {
 *   if (result === 'save') {
 *     // Salvar alterações
 *   }
 * });
 * ```
 */
@Component({
  selector: 'app-unsaved-changes-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dialog-container">
      <!-- Cabeçalho com ícone de aviso -->
      <div class="dialog-header">
        <mat-icon class="warning-icon">warning</mat-icon>
        <h2 mat-dialog-title>Há mudanças não salvas</h2>
      </div>

      <!-- Conteúdo com mensagem -->
      <mat-dialog-content>
        <p class="dialog-message">{{ data.message }}</p>

        <!-- Informação adicional quando não pode salvar completo -->
        @if (!data.canSave) {
          <div class="info-box">
            <mat-icon class="info-icon">info</mat-icon>
            <p class="info-text">
              O rascunho será salvo localmente no seu navegador e você poderá
              continuar o preenchimento posteriormente.
            </p>
          </div>
        }
      </mat-dialog-content>

      <!-- Rodapé com botões de ação -->
      <mat-dialog-actions align="end">
        <!-- Botão Salvar: salva completo (só aparece se canSave = true) -->
        @if (data.canSave) {
          <button
            mat-raised-button
            color="primary"
            (click)="onSave()"
            class="save-button"
          >
            Salvar
          </button>
        }

        <!-- Botão Salvar Rascunho: salva localmente -->
        <button
          mat-stroked-button
          color="primary"
          (click)="onSaveDraft()"
          class="draft-button"
        >
          <mat-icon>save_as</mat-icon>
          Salvar Rascunho
        </button>

        <!-- Botão Não Salvar: descarta mudanças -->
        <button
          mat-stroked-button
          color="warn"
          (click)="onDiscard()"
          class="discard-button"
        >
          <mat-icon>delete_forever</mat-icon>
          Descartar alterações
        </button>

        <!-- Botão Cancelar: volta ao formulário -->
        <button
          mat-stroked-button
          (click)="onCancel()"
          class="cancel-button"
        >
          <mat-icon>arrow_forward</mat-icon>
          Retornar ao formulário
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .dialog-container {
        padding: 8px;
      }

      .dialog-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 16px;

        .warning-icon {
          color: #ff9800;
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
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
        padding: 24px 48px 8px 48px; /* Padding lateral aumenta para diminuir a largura dos botões */

        button {
          width: 100%;
          height: 44px; /* Altura fixa para consistência */
          margin: 0 !important; /* Remove margem padrão do Material (sibling indent) */
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;

          &:hover {
            transform: scale(1.02);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }

          mat-icon {
            margin-right: 8px;
          }
        }

        .cancel-button {
          color: rgba(0, 0, 0, 0.6);
          border-color: rgba(0, 0, 0, 0.2);
        }

        .discard-button {
          color: #d32f2f;
          border-color: #d32f2f;
        }

        .save-button {
          background-color: var(--primary-color) !important;
          color: white !important;

          mat-icon {
            font-size: 20px;
            width: 20px;
            height: 20px;
          }
        }

        .draft-button {
          mat-icon {
            font-size: 20px;
            width: 20px;
            height: 20px;
          }
        }
      }

      /* Responsividade para telas muito pequenas */
      @media (max-width: 380px) {
        mat-dialog-actions {
          grid-template-columns: 1fr; /* 1 coluna em telas muito pequenas */
        }
      }
    `,
  ],
})
export class UnsavedChangesDialogComponent {
  /**
   * Injeta os dados passados para o diálogo usando a função inject() moderna
   */
  readonly data = inject<UnsavedChangesDialogData>(MAT_DIALOG_DATA);

  /**
   * Injeta a referência do diálogo para poder fechá-lo
   */
  private readonly dialogRef = inject(
    MatDialogRef<UnsavedChangesDialogComponent>
  );

  /**
   * Injeta o MatDialog para abrir o diálogo de nomear rascunho
   */
  private readonly dialog = inject(MatDialog);

  /**
   * Fecha o diálogo retornando 'cancel'
   * Usuário permanece no formulário
   */
  onCancel(): void {
    this.dialogRef.close('cancel');
  }

  /**
   * Fecha o diálogo retornando 'discard'
   * Usuário sai sem salvar nada
   */
  onDiscard(): void {
    this.dialogRef.close('discard');
  }

  /**
   * Fecha o diálogo retornando 'save'
   * Salva as alterações completas no backend
   */
  onSave(): void {
    this.dialogRef.close('save');
  }

  /**
   * Abre diálogo para nomear o rascunho antes de salvar
   * Fecha o diálogo retornando 'draft:nome' com o nome escolhido
   */
  onSaveDraft(): void {
    // Se já tem nome (rascunho existente), usa ele direto
    if (this.data.currentDraftName) {
      this.dialogRef.close(`draft:${this.data.currentDraftName}`);
      return;
    }

    // Abre o diálogo para nomear o rascunho
    const nameDraftDialog = this.dialog.open(SaveDraftDialogComponent, {
      width: '500px',
      disableClose: true,
      data: {
        title: 'Salvar rascunho',
        suggestedName: this.data.suggestedDraftName || '',
      },
    });

    nameDraftDialog.afterClosed().subscribe((result: SaveDraftDialogResult) => {
      if (result?.confirmed) {
        // Retorna 'draft:' + nome do rascunho
        this.dialogRef.close(`draft:${result.draftName}`);
      }
      // Se cancelou, não fecha o diálogo principal
    });
  }
}
