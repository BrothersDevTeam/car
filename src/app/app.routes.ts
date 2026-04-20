import { Routes } from '@angular/router';

import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { LoginLayoutComponent } from './layouts/login-layout/login-layout.component';

import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

import { AuthGuard } from './services/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'person',
        loadChildren: () =>
          import('./pages/person/person.routes').then((m) => m.PERSON_ROUTES),
      },
      {
        path: 'vehicle',
        loadChildren: () =>
          import('./pages/vehicle/vehicle.routes').then(
            (m) => m.VEHICLE_ROUTES
          ),
      },
      {
        path: 'store',
        loadChildren: () =>
          import('./pages/store/store.routes').then((m) => m.STORE_ROUTES),
      },
      {
        path: 'nfe',
        loadChildren: () =>
          import('./pages/nfe/nfe.routes').then((m) => m.NFE_ROUTES),
      },
      {
        path: 'vendas',
        loadChildren: () =>
          import('./pages/vendas/vendas.routes').then((m) => m.VENDAS_ROUTES),
      },
      { path: 'dashboard', component: DashboardComponent },
    ],
  },
  {
    path: 'login',
    component: LoginLayoutComponent,
    children: [{ path: '', component: LoginComponent }],
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password').then(
        (m) => m.ResetPasswordComponent
      ),
  },
  { path: '**', redirectTo: '' },
];
