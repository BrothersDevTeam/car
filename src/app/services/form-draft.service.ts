import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Interface que define a estrutura de um rascunho de formulário
 * armazenado temporariamente no localStorage
 */
export interface FormDraft<T = any> {
  /** Identificador único do rascunho */
  id: string;
  /** Nome/tipo do formulário (ex: 'pessoa-fisica', 'pessoa-juridica') */
  formType: string;
  /** Dados do formulário parcialmente preenchidos */
  data: T;
  /** Data/hora da última modificação */
  lastModified: Date;
  /** Status do rascunho */
  status: 'em-preenchimento' | 'completo';
  /** ID da entidade (se for edição) - Aceita string ou number */
  entityId?: string | number;
}

/**
 * Service responsável por gerenciar rascunhos de formulários
 * salvos temporariamente no localStorage do navegador.
 * 
 * Permite salvar, recuperar e excluir formulários em preenchimento,
 * facilitando que o usuário continue de onde parou posteriormente.
 * 
 * @example
 * ```typescript
 * // Salvando um rascunho
 * this.formDraftService.saveDraft('pessoa-fisica', formData);
 * 
 * // Recuperando um rascunho
 * const draft = this.formDraftService.getDraft('pessoa-fisica');
 * 
 * // Removendo um rascunho
 * this.formDraftService.removeDraft('pessoa-fisica');
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class FormDraftService {
  /** Prefixo usado nas chaves do localStorage */
  private readonly STORAGE_PREFIX = 'car_form_draft_';
  
  /** Subject que notifica quando há mudanças nos rascunhos */
  private draftsChanged$ = new BehaviorSubject<void>(undefined);

  constructor() {
    // Limpar rascunhos antigos (mais de 7 dias) na inicialização
    this.cleanOldDrafts();
  }

  /**
   * Salva um rascunho de formulário no localStorage
   * 
   * @param formType - Tipo do formulário (ex: 'pessoa-fisica', 'pessoa-juridica')
   * @param data - Dados parciais do formulário
   * @param entityId - ID da entidade (opcional, usado em edições)
   * @returns ID do rascunho salvo
   */
  saveDraft<T>(formType: string, data: T, entityId?: string | number): string {
    // Gera um ID único para o rascunho baseado no tipo e entityId
    const draftId = entityId 
      ? `${formType}_${entityId}` 
      : `${formType}_new_${Date.now()}`;

    const draft: FormDraft<T> = {
      id: draftId,
      formType,
      data,
      lastModified: new Date(),
      status: 'em-preenchimento',
      entityId
    };

    // Salva no localStorage usando JSON.stringify
    const key = this.getStorageKey(formType, entityId);
    localStorage.setItem(key, JSON.stringify(draft));
    
    // Notifica que houve mudança nos rascunhos
    this.draftsChanged$.next();

    return draftId;
  }

  /**
   * Recupera um rascunho específico do localStorage
   * 
   * @param formType - Tipo do formulário
   * @param entityId - ID da entidade (opcional)
   * @returns Rascunho encontrado ou null se não existir
   */
  getDraft<T>(formType: string, entityId?: string | number): FormDraft<T> | null {
    const key = this.getStorageKey(formType, entityId);
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      return null;
    }

    try {
      const draft: FormDraft<T> = JSON.parse(stored);
      // Converte a string de data de volta para objeto Date
      draft.lastModified = new Date(draft.lastModified);
      return draft;
    } catch (error) {
      console.error('Erro ao recuperar rascunho:', error);
      // Remove item corrompido
      localStorage.removeItem(key);
      return null;
    }
  }

  /**
   * Remove um rascunho específico do localStorage
   * 
   * @param formType - Tipo do formulário
   * @param entityId - ID da entidade (opcional)
   */
  removeDraft(formType: string, entityId?: string | number): void {
    const key = this.getStorageKey(formType, entityId);
    localStorage.removeItem(key);
    this.draftsChanged$.next();
  }

  /**
   * Lista todos os rascunhos salvos
   * 
   * @returns Array com todos os rascunhos encontrados
   */
  getAllDrafts(): FormDraft[] {
    const drafts: FormDraft[] = [];
    
    // Itera por todas as chaves do localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      // Verifica se a chave pertence a um rascunho
      if (key?.startsWith(this.STORAGE_PREFIX)) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const draft: FormDraft = JSON.parse(stored);
            draft.lastModified = new Date(draft.lastModified);
            drafts.push(draft);
          } catch (error) {
            console.error('Erro ao processar rascunho:', error);
          }
        }
      }
    }
    
    // Ordena por data de modificação (mais recente primeiro)
    return drafts.sort((a, b) => 
      b.lastModified.getTime() - a.lastModified.getTime()
    );
  }

  /**
   * Observable que emite quando há mudanças nos rascunhos
   */
  get draftsChanges(): Observable<void> {
    return this.draftsChanged$.asObservable();
  }

  /**
   * Limpa rascunhos com mais de 7 dias
   * Executado automaticamente na inicialização do service
   */
  private cleanOldDrafts(): void {
    const MAX_AGE_DAYS = 7;
    const maxAge = new Date();
    maxAge.setDate(maxAge.getDate() - MAX_AGE_DAYS);

    const drafts = this.getAllDrafts();
    
    drafts.forEach(draft => {
      if (draft.lastModified < maxAge) {
        const key = this.getStorageKey(draft.formType, draft.entityId);
        localStorage.removeItem(key);
        console.log(`Rascunho antigo removido: ${draft.id}`);
      }
    });
  }

  /**
   * Gera a chave de armazenamento baseada no tipo e entityId
   * 
   * @param formType - Tipo do formulário
   * @param entityId - ID da entidade (opcional)
   * @returns Chave para uso no localStorage
   */
  private getStorageKey(formType: string, entityId?: string | number): string {
    return entityId 
      ? `${this.STORAGE_PREFIX}${formType}_${entityId}`
      : `${this.STORAGE_PREFIX}${formType}_new`;
  }
}
