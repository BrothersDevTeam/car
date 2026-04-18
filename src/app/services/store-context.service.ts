import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class StoreContextService {
  private readonly STORE_KEY = 'car-selected-store';

  // Guarda o storeId atual. Inicializa com a loja padrão do usuário vinda do token.
  private readonly storeIdSubject = new BehaviorSubject<string | null>(null);

  constructor(private readonly authService: AuthService) {
    const savedStoreId = localStorage.getItem(this.STORE_KEY);
    const defaultStoreId = this.authService.getStoreId();

    // Prioriza a loja salva no localStorage, contanto que o usuário esteja logado
    if (savedStoreId && defaultStoreId) {
      this.storeIdSubject.next(savedStoreId);
    } else if (defaultStoreId) {
      this.storeIdSubject.next(defaultStoreId);
    }
  }

  /**
   * Obtém o Observable do storeId selecionado,
   * permitindo que componentes "escutem" a mudança de loja.
   */
  get currentStoreId$(): Observable<string | null> {
    return this.storeIdSubject.asObservable();
  }

  /**
   * Obtém o valor síncrono da loja selecionada no momento.
   */
  get currentStoreId(): string | null {
    return this.storeIdSubject.getValue();
  }

  /**
   * Atualiza a loja atual selecionada e persiste no localStorage.
   */
  setStoreId(storeId: string | null): void {
    if (this.storeIdSubject.getValue() !== storeId) {
      if (storeId) {
        localStorage.setItem(this.STORE_KEY, storeId);
      } else {
        localStorage.removeItem(this.STORE_KEY);
      }
      this.storeIdSubject.next(storeId);
    }
  }

  /**
   * Recarrega o estado inicial a partir do token de autenticação atual.
   * Limpa o localStorage se não houver token (logout).
   */
  refreshFromToken(): void {
    const defaultStoreId = this.authService.getStoreId();

    if (defaultStoreId) {
      // Se estamos logando/atualizando, tenta manter a preferência do localStorage
      const savedStoreId = localStorage.getItem(this.STORE_KEY);
      this.storeIdSubject.next(savedStoreId || defaultStoreId);
    } else {
      // Se não há token (logout), limpa tudo
      localStorage.removeItem(this.STORE_KEY);
      this.storeIdSubject.next(null);
    }
  }
}
