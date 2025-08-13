import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

import { LoginResponse } from '@interfaces/login';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl: string = '/api/auth/login';

  constructor(private httpClient: HttpClient, private router: Router) {}

  login(email: string, password: string) {
    return this.httpClient
      .post<LoginResponse>(this.apiUrl, {
        username: email,
        password,
      })
      .pipe(
        tap((value) => {
          sessionStorage.setItem('car-token', value.token);
          sessionStorage.setItem('car-username', value.fullName);
          sessionStorage.setItem('car-user-role', value.role);
          this.router.navigate(['/home']);
        })
      );
  }

  logout() {
    sessionStorage.removeItem('car-token');
    sessionStorage.removeItem('car-username');
    sessionStorage.removeItem('car-user-role');
    this.router.navigate(['/login']);
  }
}
