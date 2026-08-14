import { Routes } from '@angular/router';
import { VehicleComponent } from './vehicle.component';
import { unsavedChangesGuard } from '@guards/unsaved-changes.guard';
import { claimGuard } from '@guards/claim.guard';
import { Authorizations } from '@enums/authorizations';

export const VEHICLE_ROUTES: Routes = [
  {
    path: '',
    component: VehicleComponent,
    canActivate: [claimGuard],
    canDeactivate: [unsavedChangesGuard],
    data: { claim: Authorizations.TAB_VEHICLE },
  },
];
