import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { LoginResponse } from '../interfaces/login';
import { tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  apiUrl: string = "http://controleautorevenda.duckdns.org/api/v1";

  constructor(private httpClient: HttpClient, private router: Router) {}

  login(email: string, password: string) {
    return this.httpClient.post<LoginResponse>(this.apiUrl + "/auth/login", { email, password }).pipe(tap((value) => {
      sessionStorage.setItem("car-token", value.token);
      sessionStorage.setItem("username", value.fullName);
      this.router.navigate(['/home']);
    }))
  }

  logout() {
    sessionStorage.removeItem('car-token');
    this.router.navigate(['/login']);
  }
}
