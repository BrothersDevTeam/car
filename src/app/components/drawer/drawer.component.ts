import { Component, EventEmitter, Output } from '@angular/core';
import { EventType } from '@angular/router';

import {MatSidenavModule} from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-drawer',
  imports: [
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatButtonModule,
    MatIconModule],
  templateUrl: './drawer.component.html',
  styleUrl: './drawer.component.scss',
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms ease-in', style({ transform: 'translateX(0)' }))
      ]),
    ])
  ]
})
export class DrawerComponent {
  @Output() closeForm = new EventEmitter<EventType>();

  handleCloseForm() {
    this.closeForm.emit();
  }
}
