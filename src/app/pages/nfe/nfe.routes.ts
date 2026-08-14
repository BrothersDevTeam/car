import { Routes } from '@angular/router';
import { NfeComponent } from './nfe.component';
import { claimGuard } from '@guards/claim.guard';
import { Authorizations } from '@enums/authorizations';

export const NFE_ROUTES: Routes = [
  {
    path: '',
    component: NfeComponent,
    canActivate: [claimGuard],
    data: { claim: Authorizations.TAB_NFE },
  },
];
