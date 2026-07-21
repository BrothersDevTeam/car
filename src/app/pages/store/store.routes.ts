import { Routes } from '@angular/router';
import { StoreComponent } from './store.component';
import { claimGuard } from '../../guards/claim.guard';
import { subscriptionGuard } from '../../guards/subscription.guard';

export const STORE_ROUTES: Routes = [
  { path: '', component: StoreComponent, canActivate: [subscriptionGuard] },
  {
    path: 'billing-settings',
    loadComponent: () => import('./billing-settings/billing-settings.component').then(m => m.BillingSettingsComponent),
    canActivate: [claimGuard, subscriptionGuard],
    data: { claim: 'root:admin' }
  },
  {
    path: 'subscription',
    loadComponent: () => import('./subscription/subscription.component').then(m => m.SubscriptionComponent),
    canActivate: [subscriptionGuard]
  }
];
