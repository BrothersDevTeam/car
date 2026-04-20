import {
  Directive,
  Input,
  OnInit,
  TemplateRef,
  ViewContainerRef,
  inject,
} from '@angular/core';
import { AuthService } from '@services/auth/auth.service';

/**
 * Diretiva estrutural para controle de visibilidade baseado em autorizações granulares.
 * Uso: <button *appHasAuthority="'edit:venda'">Editar</button>
 */
@Directive({
  selector: '[appHasAuthority]',
  standalone: true,
})
export class HasAuthorityDirective implements OnInit {
  @Input('appHasAuthority') authority!: string;

  private authService = inject(AuthService);
  private templateRef = inject(TemplateRef);
  private viewContainer = inject(ViewContainerRef);

  ngOnInit() {
    this.updateView();
  }

  private updateView() {
    if (this.authService.hasAuthority(this.authority)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
