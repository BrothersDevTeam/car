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
  ) { }

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
    const personService = this.injector.get(PersonService);
    personService.clearCache();
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

  isLoggedIn(): boolean {
    const token = this.getDecodedToken();
    if (!token) return false;
    return Date.now() < token.exp * 1000; // exp está em segundos, Date.now em ms
  }
}
