import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private router: Router) {}

  login(token: string) {
    sessionStorage.setItem('car-token', token);
    this.router.navigate(['/dashboard']);
  }

  logout() {
    sessionStorage.removeItem('car-token');
    this.router.navigate(['/login']);
  }
}
