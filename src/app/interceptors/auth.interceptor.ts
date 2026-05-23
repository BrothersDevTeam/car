import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Não adicionar cookies para APIs de terceiros
  if (req.url.includes('parallelum.com.br') || req.url.includes('focusnfe.com.br')) {
    return next(req);
  }

  let reqConfig: any = {};
  
  // Habilita envio do Cookie HttpOnly gerado pelo backend
  if (req.url.startsWith('/api')) {
    reqConfig.withCredentials = true;
  }

  const clonedRequest = req.clone(reqConfig);
  return next(clonedRequest);
};
