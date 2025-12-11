import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Interface que define os dados passados para o diálogo
 */
export interface UnsavedChangesDialogData {
  /** Se true, mostra botão para salvar completo */
  canSave: boolean;
  /** Mensagem customizada a ser exibida */
  message: string;
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
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
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
              O rascunho será salvo localmente no seu navegador e você
              poderá continuar o preenchimento posteriormente.
            </p>
          </div>
        }
      </mat-dialog-content>

      <!-- Rodapé com botões de ação -->
      <mat-dialog-actions align="end">
        <!-- Botão Cancelar: volta ao formulário -->
        <button 
          mat-button 
          (click)="onCancel()"
          class="cancel-button">
          Cancelar
        </button>

        <!-- Botão Não Salvar: descarta mudanças -->
        <button 
          mat-button 
          color="warn"
          (click)="onDiscard()"
          class="discard-button">
          Não salvar
        </button>

        <!-- Botão Salvar Rascunho: salva localmente -->
        @if (!data.canSave) {
          <button 
            mat-raised-button 
            color="accent"
            (click)="onSaveDraft()"
            class="draft-button">
            <mat-icon>save</mat-icon>
            Salvar rascunho
          </button>
        }

        <!-- Botão Salvar: salva completo (só aparece se canSave = true) -->
        @if (data.canSave) {
          <button 
            mat-raised-button 
            color="primary"
            (click)="onSave()"
            class="save-button">
            <mat-icon>check</mat-icon>
            Salvar
          </button>
        }
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
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
      gap: 8px;
      padding: 16px 0 8px 0;

      button {
        mat-icon {
          margin-right: 8px;
        }
      }

      .cancel-button {
        color: rgba(0, 0, 0, 0.6);
      }

      .discard-button {
        color: #d32f2f;
      }

      .save-button,
      .draft-button {
        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    }

    /* Responsividade para telas menores */
    @media (max-width: 500px) {
      mat-dialog-actions {
        flex-direction: column;
        align-items: stretch;

        button {
          width: 100%;
        }
      }
    }
  `]
})
export class UnsavedChangesDialogComponent {
  /**
   * Injeta os dados passados para o diálogo usando a função inject() moderna
   */
  readonly data = inject<UnsavedChangesDialogData>(MAT_DIALOG_DATA);

  /**
   * Injeta a referência do diálogo para poder fechá-lo
   */
  private readonly dialogRef = inject(MatDialogRef<UnsavedChangesDialogComponent>);

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
   * Fecha o diálogo retornando 'draft'
   * Salva rascunho local no localStorage
   */
  onSaveDraft(): void {
    this.dialogRef.close('draft');
  }
}
