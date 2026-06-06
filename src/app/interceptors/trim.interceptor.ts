import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Função utilitária para verificar se o objeto é um objeto simples (JSON literal)
 */
function isPlainObject(value: any): boolean {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/**
 * Varre recursivamente o corpo do payload e aplica o trim em todas as strings.
 */
function trimStringProperties(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return obj.trim();
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => trimStringProperties(item));
  }

  if (isPlainObject(obj)) {
    const clone: any = {};
    for (const key of Object.keys(obj)) {
      clone[key] = trimStringProperties(obj[key]);
    }
    return clone;
  }

  return obj;
}

/**
 * Interceptor HTTP global que remove espaços em branco antes e depois
 * de todas as strings contidas no corpo de requisições de escrita (POST, PUT, PATCH).
 */
export const trimInterceptor: HttpInterceptorFn = (req, next) => {
  const isWriteMethod = ['POST', 'PUT', 'PATCH'].includes(req.method);

  if (isWriteMethod && req.body) {
    const trimmedBody = trimStringProperties(req.body);
    const clonedRequest = req.clone({ body: trimmedBody });
    return next(clonedRequest);
  }

  return next(req);
};
