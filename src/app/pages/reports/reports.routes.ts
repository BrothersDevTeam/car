import { Routes } from '@angular/router';
import { claimGuard } from '@guards/claim.guard';
import { Authorizations } from '@enums/authorizations';

export const REPORTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./reports.component').then((m) => m.ReportsComponent),
    canActivate: [claimGuard],
    data: { claim: Authorizations.TAB_REPORT },
  },
];
