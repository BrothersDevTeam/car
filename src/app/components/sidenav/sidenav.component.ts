import '@angular/material/list';
import {
  Component,
  computed,
  EventEmitter,
  Input,
  Output,
  signal,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

import { ActionsService } from '@services/actions.service';
import { AuthService } from '../../auth/auth.service';

export type MenuItem = {
  icon: string;
  label: string;
  route?: string;
};

@Component({
  selector: 'app-sidenav',
  imports: [MatListModule, MatIconModule, RouterModule, MatButtonModule],
  templateUrl: './sidenav.component.html',
  styleUrl: './sidenav.component.scss',
})
export class SideNavComponent {
  constructor(
    private authService: AuthService,
    private actionsService: ActionsService
  ) {}

  sideNavCollapsed = signal(false);
  isSmallScreen = signal(false);
  @Input() set collapsed(val: boolean) {
    this.sideNavCollapsed.set(val);
  }
  @Output() toggleSidebar = new EventEmitter<void>();

  menuItems = signal<MenuItem[]>([
    {
      icon: 'store',
      label: 'Loja',
      route: 'store',
    },
    {
      icon: 'person',
      label: 'Pessoas',
      route: 'person',
    },
    {
      icon: 'directions_car',
      label: 'Veículos',
      route: 'vehicle',
    },
    {
      icon: 'description',
      label: 'Notas Fiscais',
      route: 'nfe',
    },
  ]);

  onMenuItemClick() {
    if (window.innerWidth <= 599) {
      this.toggleSidebar.emit();
    }
  }

  handleLogout = () => {
    this.authService.logout();
  };

  onSidenavClick() {
    this.actionsService.emitSidebarClick();
  }

  profilePicSize = computed(() => (this.sideNavCollapsed() ? '32' : '100'));
}
