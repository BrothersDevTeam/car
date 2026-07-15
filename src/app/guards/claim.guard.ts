import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@services/auth/auth.service';
import { ToastrService } from 'ngx-toastr';

/**
 * Guard funcional para verificar permissões granulares (claims) em rotas.
 * Deve ser usado em conjunto com 'data: { claim: 'permissao' }' na definição da rota.
 */
export const claimGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastr = inject(ToastrService);

  const requiredClaim = route.data?.['claim'];

  // Se não houver claim exigida na rota, permite o acesso.
  if (!requiredClaim) {
    return true;
  }

  const hasAccess = Array.isArray(requiredClaim)
    ? requiredClaim.some((claim) => authService.hasAuthority(claim))
    : authService.hasAuthority(requiredClaim);

  if (hasAccess) {
    return true;
  }

  // Se o usuário não tem a permissão, exibe alerta e redireciona para o dashboard
  toastr.warning('Você não tem permissão para acessar esta funcionalidade.', 'Acesso Negado');
  router.navigate(['/dashboard']);

  return false;
};
