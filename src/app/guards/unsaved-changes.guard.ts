import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { UnsavedChangesDialogComponent } from '@components/dialogs/unsaved-changes-dialog/unsaved-changes-dialog.component';

/**
 * Interface que deve ser implementada por componentes que usam este guard.
 * Define os métodos necessários para verificar e salvar mudanças.
 */
export interface CanComponentDeactivate {
  /**
   * Verifica se o formulário tem mudanças não salvas
   * @returns true se há mudanças, false caso contrário
   */
  hasUnsavedChanges(): boolean;

  /**
   * Verifica se o formulário pode ser salvo (campos obrigatórios preenchidos)
   * @returns true se pode salvar, false caso contrário
   */
  canSaveForm(): boolean;

  /**
   * Salva o formulário (completo ou rascunho)
   * @param isDraft - Se true, salva como rascunho; se false, salva completo
   * @returns Observable que emite true quando salvo com sucesso
   */
  saveForm(isDraft: boolean): Observable<boolean>;

  /**
   * Salva um rascunho local do formulário no localStorage
   */
  saveLocalDraft(): void;
}

/**
 * Guard funcional moderno (Angular 15+) que verifica se há mudanças
 * não salvas antes de sair de um componente.
 *
 * Quando há mudanças, abre um diálogo perguntando ao usuário:
 * - "Salvar" - salva as alterações (se possível) e sai
 * - "Salvar rascunho" - salva localmente e sai (se não puder salvar completo)
 * - "Não salvar" - descarta mudanças e sai
 * - "Cancelar" - permanece no componente
 *
 * @example
 * ```typescript
 * // No arquivo de rotas
 * {
 *   path: 'pessoa/novo',
 *   component: PessoaFormComponent,
 *   canDeactivate: [unsavedChangesGuard]
 * }
 * ```
 */
export const unsavedChangesGuard: CanDeactivateFn<CanComponentDeactivate> = (
  component: CanComponentDeactivate
): Observable<boolean> | boolean => {
  // Injeta o serviço de diálogo usando a função inject() moderna
  const dialog = inject(MatDialog);

  // Se não há mudanças não salvas, permite a navegação imediatamente
  if (!component.hasUnsavedChanges()) {
    return true;
  }

  // Verifica se o formulário pode ser salvo completamente
  const canSave = component.canSaveForm();

  // Abre o diálogo de confirmação com as opções apropriadas
  const dialogRef = dialog.open(UnsavedChangesDialogComponent, {
    width: '450px',
    disableClose: true, // Não permite fechar clicando fora
    data: {
      canSave, // Informa ao diálogo se pode salvar completo
      message: canSave
        ? 'Deseja salvar as alterações antes de sair?'
        : 'Há campos obrigatórios não preenchidos. Deseja salvar um rascunho para continuar depois?',
    },
  });

  // Retorna um Observable que será resolvido com base na escolha do usuário
  return dialogRef.afterClosed().pipe(
    map((result: 'save' | 'draft' | 'discard' | 'cancel' | undefined) => {
      // Se o usuário cancelou ou fechou o diálogo, permanece no componente
      if (!result || result === 'cancel') {
        return false;
      }

      // Se escolheu descartar, permite sair sem salvar
      if (result === 'discard') {
        return true;
      }

      // Se escolheu salvar completo
      if (result === 'save' && canSave) {
        // Salva o formulário de forma síncrona
        // Nota: Em uma aplicação real, pode ser necessário aguardar
        // a conclusão do salvamento antes de navegar
        component.saveForm(false).subscribe();
        return true;
      }

      // Se escolheu salvar rascunho
      if (result === 'draft') {
        component.saveLocalDraft();
        return true;
      }

      // Fallback: não permite sair
      return false;
    })
  );
};
