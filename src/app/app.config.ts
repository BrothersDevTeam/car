import {
  ApplicationConfig,
  importProvidersFrom,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  BrowserAnimationsModule,
  provideAnimations,
} from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideEnvironmentNgxMask } from 'ngx-mask';

import { provideToastr } from 'ngx-toastr';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { loadingInterceptor } from './interceptors/loading.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([loadingInterceptor, authInterceptor])),
    provideAnimations(),
    /**
     * Configuração do Toastr (Sistema de Notificações Toast)
     *
     * @description
     * Configurações aplicadas para melhor UX:
     *
     * POSICIONAMENTO:
     * - positionClass: 'toast-top-center' → Toast aparece no topo centralizado
     * - Outras opções disponíveis:
     *   * 'toast-top-left', 'toast-top-right'
     *   * 'toast-bottom-left', 'toast-bottom-center', 'toast-bottom-right'
     *
     * COMPORTAMENTO:
     * - preventDuplicates: true → Evita múltiplos toasts idênticos
     * - timeOut: 5000 → Toast desaparece após 5 segundos
     * - closeButton: true → Mostra botão X para fechar manualmente
     * - progressBar: true → Mostra barra de progresso do timeout
     * - enableHtml: true → Permite HTML nas mensagens (use com cuidado)
     *
     * ANIMAÇÃO:
     * - easeTime: 300 → Tempo de animação suave (300ms)
     *
     * @see https://www.npmjs.com/package/ngx-toastr
     */
    provideToastr({
      positionClass: 'toast-top-center',
      preventDuplicates: true,
      timeOut: 5000,
      closeButton: true,
      progressBar: true,
      enableHtml: false,
      easeTime: 300,
    }),
    importProvidersFrom([BrowserAnimationsModule]),
    provideEnvironmentNgxMask(),
  ],
};
