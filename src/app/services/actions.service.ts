import { Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ActionsService {
  // BehaviorSubject para monitorar cliques no sidenav
  private sidebarClickSubject = new BehaviorSubject<void>(undefined);

  // Observable para que outros componentes possam se inscrever
  sidebarClick$ = this.sidebarClickSubject.asObservable();

  hasFormChanges = signal(false);

  constructor() {}

  // Método para emitir o evento de clique no sidenav
  emitSidebarClick() {
    this.sidebarClickSubject.next();
  }
}
