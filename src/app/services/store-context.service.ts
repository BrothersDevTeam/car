import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class StoreContextService {
  // Guarda o storeId atual. Inicializa com a loja padrão do usuário vinda do token.
  private readonly storeIdSubject = new BehaviorSubject<string | null>(null);

  constructor(private readonly authService: AuthService) {
    const defaultStoreId = this.authService.getStoreId();
    if (defaultStoreId) {
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
   * Atualiza a loja atual selecionada.
   */
  setStoreId(storeId: string | null): void {
    if (this.storeIdSubject.getValue() !== storeId) {
      this.storeIdSubject.next(storeId);
    }
  }

  /**
   * Recarrega o estado inicial a partir do token de autenticação atual
   */
  refreshFromToken(): void {
    const defaultStoreId = this.authService.getStoreId();
    if (defaultStoreId) {
      this.storeIdSubject.next(defaultStoreId);
    } else {
      this.storeIdSubject.next(null);
    }
  }
}
