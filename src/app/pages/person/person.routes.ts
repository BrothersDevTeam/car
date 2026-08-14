import { Routes } from '@angular/router';
import { unsavedChangesGuard } from '@guards/unsaved-changes.guard';
import { claimGuard } from '@guards/claim.guard';
import { Authorizations } from '@enums/authorizations';
import { PersonComponent } from './person.component';

export const PERSON_ROUTES: Routes = [
  {
    path: '',
    component: PersonComponent,
    canActivate: [claimGuard],
    canDeactivate: [unsavedChangesGuard],
    data: { claim: Authorizations.TAB_PERSON },
  },
];
