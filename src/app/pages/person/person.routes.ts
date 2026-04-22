import { Routes } from '@angular/router';
import { unsavedChangesGuard } from '@guards/unsaved-changes.guard';
import { PersonComponent } from './person.component';

export const PERSON_ROUTES: Routes = [
  {
    path: '',
    component: PersonComponent,
    canDeactivate: [unsavedChangesGuard],
  },
];
