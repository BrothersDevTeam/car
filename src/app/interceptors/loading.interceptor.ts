import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BusyService } from '@services/busy.service';
import { delay, finalize } from 'rxjs';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const busyService = inject(BusyService);

  console.log('Request intercepted: ', req.url);
  busyService.busy();

  return next(req).pipe(
    delay(1000),
    finalize(() => {
      console.log('Request completed: ', req.url);
      busyService.idle();
    })
  );
};
