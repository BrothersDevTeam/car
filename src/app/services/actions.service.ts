import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ActionsService {
  // Subject para monitorar cliques no sidenav, agora carregando a rota alvo
  private sidebarClickSubject = new Subject<string | undefined>();

  // Observable para que outros componentes possam se inscrever
  sidebarClick$ = this.sidebarClickSubject.asObservable();

  hasFormChanges = signal(false);

  constructor() {}

  // Método para emitir o evento de clique no sidenav com a rota alvo
  emitSidebarClick(route?: string) {
    this.sidebarClickSubject.next(route);
  }
}
