import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { LoginResponse } from '@interfaces/login';
import { TokenPayload } from '@interfaces/token';
import { MatDialog } from '@angular/material/dialog';
import { ActionsService } from '@services/actions.service';
import { Injector } from '@angular/core';
import { PersonService } from '@services/person.service';
import { VehicleService } from '@services/vehicle.service';
import { NfeService } from '@services/nfe.service';
import { ModelService } from '@services/model.service';
import { IssuerService } from '@services/issuer.service';
import { ColorService } from '@services/color.service';
import { BrandService } from '@services/brand.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl: string = '/api/auth/login';
  private readonly TOKEN_KEY = 'car-token';

  constructor(
    private httpClient: HttpClient,
    private router: Router,
    private dialog: MatDialog,
    private actionsService: ActionsService,
    private injector: Injector
  ) {}

  login(email: string, password: string) {
    return this.httpClient
      .post<LoginResponse>(this.apiUrl, {
        username: email,
        password,
      })
      .pipe(
        tap((value) => {
          sessionStorage.setItem(this.TOKEN_KEY, value.token);
          this.router.navigate(['/home']);
        })
      );
  }

  logout() {
    // Abaixo limpamos os caches de estado em memória (serviços singletons no Angular)
    // para evitar que dados da loja/sessão anterior fiquem presentes no próximo login.
    try {
      this.injector.get(PersonService).clearCache();
      this.injector.get(VehicleService).clearCache();
      this.injector.get(NfeService).clearCache();
      this.injector.get(ModelService).clearCache();
      this.injector.get(IssuerService).clearCache();
      this.injector.get(ColorService).clearCache();
      this.injector.get(BrandService).clearCache();
    } catch (e) {
      console.warn('Erro ao limpar cache de serviços no logout', e);
    }

    this.actionsService.hasFormChanges.set(false);
    this.dialog.closeAll();
    sessionStorage.removeItem(this.TOKEN_KEY);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return sessionStorage.getItem(this.TOKEN_KEY);
  }

  getDecodedToken(): TokenPayload | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      return jwtDecode<TokenPayload>(token);
    } catch (e) {
      console.error('Erro ao decodificar token', e);
      return null;
    }
  }

  getStoreId(): string | null {
    return this.getDecodedToken()?.storeId ?? null;
  }

  getUsername(): string | null {
    return this.getDecodedToken()?.username ?? null;
  }

  getRoles(): string[] {
    const roles = this.getDecodedToken()?.roles;
    return roles ? roles.split(',') : [];
  }

  /**
   * Retorna a lista de autorizações granulares do usuário logado.
   * Ex: ['read:person', 'edit:store', 'root:admin']
   */
  getAuthorizations(): string[] {
    const auths = this.getDecodedToken()?.authorizations;
    return auths ? auths.split(',').map(a => a.trim()) : [];
  }

  /**
   * Verifica se o usuário possui uma autorização granular específica.
   * Ex: hasAuthority('edit:person')
   */
  hasAuthority(authority: string): boolean {
    return this.getAuthorizations().includes(authority) ||
           this.getAuthorizations().includes('root:admin');
  }

  isLoggedIn(): boolean {
    const token = this.getDecodedToken();
    if (!token) return false;
    return Date.now() < token.exp * 1000; // exp está em segundos, Date.now em ms
  }
}
