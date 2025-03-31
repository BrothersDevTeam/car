import { Routes } from '@angular/router';

import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { LoginLayoutComponent } from './layouts/login-layout/login-layout.component';

import { VehicleComponent } from './pages/vehicle/vehicle.component';
import { PersonComponent } from './pages/person/person.component';
import { StoreComponent } from './pages/store/store.component';
import { LoginComponent } from './pages/login/login.component';
import { NfeComponent } from './pages/nfe/nfe.component';

import { AuthGuard } from './services/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'person', pathMatch: 'full' },
      { path: 'person', component: PersonComponent },
      { path: 'vehicle', component: VehicleComponent },
      { path: 'store', component: StoreComponent },
      { path: 'nfe', component: NfeComponent },
    ],
  },
  {
    path: 'login',
    component: LoginLayoutComponent,
    children: [{ path: '', component: LoginComponent }],
  },
  { path: '**', redirectTo: '' },
];
