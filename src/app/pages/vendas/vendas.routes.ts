import { Routes } from '@angular/router';
import { Authorizations } from '@enums/authorizations';
import { claimGuard } from '@guards/claim.guard';
import { unsavedChangesGuard } from '@guards/unsaved-changes.guard';

/**
 * Rotas internas do módulo de Vendas.
 * Utiliza o ClaimGuard para validar permissões granulares.
 */
export const VENDAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./vendas-list/vendas-list.component').then(
        (m) => m.VendasListComponent
      ),
    canActivate: [claimGuard],
    data: { claim: Authorizations.READ_VENDA },
  },
  {
    path: 'nova',
    loadComponent: () =>
      import('./venda-form/venda-form.component').then(
        (m) => m.VendaFormComponent
      ),
    canActivate: [claimGuard],
    canDeactivate: [unsavedChangesGuard],
    data: { claim: Authorizations.CREATE_VENDA },
  },
  {
    path: 'editar/:id',
    loadComponent: () =>
      import('./venda-form/venda-form.component').then(
        (m) => m.VendaFormComponent
      ),
    canActivate: [claimGuard],
    canDeactivate: [unsavedChangesGuard],
    data: { claim: Authorizations.EDIT_VENDA },
  },
];
