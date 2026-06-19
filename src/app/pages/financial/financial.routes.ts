import { Routes } from '@angular/router';
import { Authorizations } from '@enums/authorizations';
import { claimGuard } from '@guards/claim.guard';

export const FINANCIAL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./financial-dashboard/financial-dashboard.component').then((m) => m.FinancialDashboardComponent),
    canActivate: [claimGuard],
    data: { claim: Authorizations.READ_FINANCIAL_STORE },
  },
];
