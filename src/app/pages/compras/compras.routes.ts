import { Routes } from '@angular/router';
import { claimGuard } from '@guards/claim.guard';
import { Authorizations } from '@enums/authorizations';
import { unsavedChangesGuard } from '@guards/unsaved-changes.guard';

export const COMPRAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./compras-list/compras-list.component').then((m) => m.ComprasListComponent),
    canActivate: [claimGuard],
    data: { claim: Authorizations.READ_VEHICLE_STORE }, // Reusando a autorização de veículos
  },
  {
    path: 'nova',
    loadComponent: () => import('./compra-form/compra-form.component').then((m) => m.CompraFormComponent),
    canActivate: [claimGuard],
    canDeactivate: [unsavedChangesGuard],
    data: { claim: Authorizations.CREATE_VEHICLE_STORE }, // Reusando a autorização de veículos
  },
  {
    path: 'editar/:id',
    loadComponent: () => import('./compra-form/compra-form.component').then((m) => m.CompraFormComponent),
    canActivate: [claimGuard],
    canDeactivate: [unsavedChangesGuard],
    data: { claim: Authorizations.EDIT_VEHICLE_STORE }, // Reusando a autorização de veículos
  },
];
