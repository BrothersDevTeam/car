import '@angular/material/list';
import {
  Component,
  computed,
  EventEmitter,
  Input,
  Output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';

import { ActionsService } from '@services/actions.service';
import { AuthService } from '@services/auth/auth.service';
import { CommonModule } from '@angular/common';

export type MenuItem = {
  icon: string;
  label: string;
  route?: string;
  subItems?: MenuItem[];
};

@Component({
  selector: 'app-sidenav',
  imports: [
    MatListModule,
    MatIconModule,
    RouterModule,
    MatButtonModule,
    CommonModule,
    MatExpansionModule,
  ],
  templateUrl: './sidenav.component.html',
  styleUrl: './sidenav.component.scss',
})
export class SideNavComponent {
  constructor(
    private authService: AuthService,
    private actionsService: ActionsService,
    private router: Router
  ) {
    this.loggedUsername.set(sessionStorage.getItem('car-username') || '');
  }

  sideNavCollapsed = signal(false);
  isSmallScreen = signal(false);
  loggedUsername = signal('');

  @Input() set collapsed(val: boolean) {
    this.sideNavCollapsed.set(val);
  }
  @Output() toggleSidebar = new EventEmitter<void>();

  menuItems = signal<MenuItem[]>([
    {
      icon: 'settings',
      label: 'Cadastros',
      subItems: [
        {
          icon: 'person',
          label: 'Pessoas',
          route: '/person',
        },
        {
          icon: 'directions_car',
          label: 'Veículos',
          route: '/vehicle',
        },
      ],
    },
    {
      icon: 'store',
      label: 'Loja',
      route: '/store',
    },

    {
      icon: 'description',
      label: 'Notas Fiscais',
      route: '/nfe',
    },
  ]);

  onMenuItemClick(route?: string) {
    if (window.innerWidth <= 599) {
      this.toggleSidebar.emit();
    }

    if (this.actionsService.hasFormChanges()) return;

    if (route) {
      this.router.navigate([route]);
    }
  }

  isRouteActive(route?: string | null, subItems?: MenuItem[]): boolean {
    if (route && this.router.url === route) return true;
    if (subItems) {
      return subItems.some(
        (subItem) => subItem.route && this.router.url === subItem.route
      );
    }
    return false;
  }

  handleLogout = () => {
    this.authService.logout();
  };

  onSidenavClick() {
    this.actionsService.emitSidebarClick();
  }

  profilePicSize = computed(() => (this.sideNavCollapsed() ? '32' : '100'));
}
