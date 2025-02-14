import { Component, computed, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';

import { MainHeaderComponent } from '@components/main-header/main-header.component';
import { SideNavComponent } from '@components/sidenav/sidenav.component';
import { NgxSpinnerModule } from "ngx-spinner";

@Component({
  selector: 'app-main-layout',
  imports: [
    RouterOutlet,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    SideNavComponent,
    MainHeaderComponent,
    NgxSpinnerModule
],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent {
  title = 'angular-youtube-sidebar';
  collapsed = signal(false);
  sidenavWidth = computed(() => this.collapsed() ? '65px' : '250px');

  toggleSidebar() {
    this.collapsed.set(!this.collapsed());
  };
}
