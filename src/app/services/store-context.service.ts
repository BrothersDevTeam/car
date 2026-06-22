import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth/auth.service';
import { ToastrService } from 'ngx-toastr';
import { Authorizations } from '../enums/authorizations';

@Injectable({
  providedIn: 'root',
})
export class StoreContextService {
  private readonly STORE_KEY = 'car-selected-store';

  // Guarda o storeId atual. Inicializa com a loja padrão do usuário vinda do token.
  private readonly storeIdSubject = new BehaviorSubject<string | null>(null);

  constructor(
    private readonly authService: AuthService,
    private readonly toastr: ToastrService,
  ) {
    const savedStoreId = localStorage.getItem(this.STORE_KEY);
    const defaultStoreId = this.authService.getStoreId();

    const isRootAdmin = this.authService.hasAuthority(Authorizations.ROOT_ADMIN);
    const canReadStoreNetwork = this.authService.hasAuthority(Authorizations.READ_STORE_NETWORK);

    // Se não for admin e não puder ver a rede inteira, ele só pode acessar a sua própria loja (defaultStoreId)
    if (!isRootAdmin && !canReadStoreNetwork) {
      if (defaultStoreId) {
        this.storeIdSubject.next(defaultStoreId);
        // Limpa o localStorage para evitar sujeira de outra sessão
        localStorage.removeItem(this.STORE_KEY);
      }
    } else {
      // Admin ou Gerente de Rede podem selecionar outras lojas, mantendo a preferência do localStorage
      if (savedStoreId && defaultStoreId) {
        this.storeIdSubject.next(savedStoreId);
      } else if (defaultStoreId) {
        this.storeIdSubject.next(defaultStoreId);
      }
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
      const isRootAdmin = this.authService.hasAuthority(Authorizations.ROOT_ADMIN);
      const canReadStoreNetwork = this.authService.hasAuthority(Authorizations.READ_STORE_NETWORK);

      if (!isRootAdmin && !canReadStoreNetwork) {
        this.storeIdSubject.next(defaultStoreId);
        localStorage.removeItem(this.STORE_KEY);
      } else {
        const savedStoreId = localStorage.getItem(this.STORE_KEY);
        this.storeIdSubject.next(savedStoreId || defaultStoreId);
      }
    } else {
      localStorage.removeItem(this.STORE_KEY);
      this.storeIdSubject.next(null);
    }
  }

  /**
   * Valida se existe uma loja selecionada no momento.
   * Se não houver (Toda a Rede), exibe um aviso e retorna false.
   */
  validateStoreSelection(): boolean {
    if (!this.currentStoreId) {
      this.toastr.warning(
        'Por favor, selecione uma loja específica no topo da página para realizar esta ação.',
        'Loja Não Selecionada',
      );
      return false;
    }
    return true;
  }
}
