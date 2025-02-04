import '@angular/material/list';
import { Component, computed, Input, signal } from '@angular/core';

import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

import { AuthService } from '../../auth/auth.service';

export type MenuItem = {
  icon: string;
  label: string;
  route?: string;
}

@Component({
  selector: 'app-sidenav',
  imports: [
    MatListModule,
    MatIconModule,
    RouterModule,
    MatButtonModule
  ],
  templateUrl: './sidenav.component.html',
  styleUrl: './sidenav.component.scss'
})
export class SideNavComponent {
  constructor(private authService: AuthService) {}

  sideNavCollapsed = signal(false);
  @Input() set collapsed(val: boolean) {
    this.sideNavCollapsed.set(val);
  }

  menuItems = signal<MenuItem[]>([
    {
      icon: 'dashboard',
      label: 'Dashboard',
      route: 'dashboard'
    },
    {
      icon: 'person',
      label: 'Pessoas',
      route: 'person'
    },
    {
      icon: 'directions_car',
      label: 'Veículos',
      route: 'vehicle'
    }
  ]);

  handleLogout = () => {
    this.authService.logout();
  }

  profilePicSize = computed(() => this.sideNavCollapsed() ? '32' : '100');
}
