import { Routes } from '@angular/router';
import { VehicleComponent } from './vehicle.component';
import { unsavedChangesGuard } from '@guards/unsaved-changes.guard';

export const VEHICLE_ROUTES: Routes = [
  {
    path: '',
    component: VehicleComponent,
    canDeactivate: [unsavedChangesGuard],
  },
];
