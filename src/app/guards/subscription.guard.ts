import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@services/auth/auth.service';

/**
 * Guard funcional para redirecionar usuários inadimplentes ou sem assinatura para o Paywall.
 * Também impede que usuários com assinatura ativa acessem a tela de contratação.
 */
export const subscriptionGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const hasSubscriptionClaim = authService.isSubscriptionRestricted();
  const isSubscriptionRoute = state.url.includes('/store/subscription');

  if (hasSubscriptionClaim) {
    if (isSubscriptionRoute) {
      return true;
    }
    // Se o usuário está inadimplente/sem assinatura, força o redirecionamento para o Paywall
    router.navigate(['/store/subscription']);
    return false;
  } else {
    if (isSubscriptionRoute) {
      // Se o usuário já está ativo, redireciona para o Dashboard principal
      router.navigate(['/dashboard']);
      return false;
    }
    return true;
  }
};
