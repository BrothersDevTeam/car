import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const AuthGuard: CanActivateFn = () => {
  const router = inject(Router);
  const isAuthenticated = !!sessionStorage.getItem('car-token');

  if (!isAuthenticated) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};
