import { Component, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ContentHeaderComponent } from '@components/content-header/content-header.component';
import { DashboardService, AdminDashboardMetrics } from '@services/dashboard.service';
import { AuthService } from '@services/auth/auth.service';
import { StoreContextService } from '@services/store-context.service';
import { UserSessionService } from '@services/user-session.service';
import { UserSession } from '@interfaces/user-session';
import { Authorizations } from '../../enums/authorizations';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, ContentHeaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);
  private storeContextService = inject(StoreContextService);
  private userSessionService = inject(UserSessionService);
  private toastrService = inject(ToastrService);
  private subscriptions: Subscription[] = [];

  metrics: AdminDashboardMetrics | null = null;
  loading = true;
  isAdmin = false;
  hasDashboardPermission = false;
  hasNetworkPermission = false;
  selectedStoreId: string | null = null;

  activeSessions: UserSession[] = [];
  canViewActiveSessions = false;
  private activeSessionsInterval: any;

  ngOnInit(): void {
    this.isAdmin = this.authService.hasAuthority(Authorizations.ROOT_ADMIN);
    this.hasDashboardPermission =
      this.isAdmin ||
      this.authService.hasAuthority(Authorizations.READ_DASHBOARD_STORE) ||
      this.authService.hasAuthority(Authorizations.READ_DASHBOARD_NETWORK);
    this.hasNetworkPermission =
      this.isAdmin || this.authService.hasAuthority(Authorizations.READ_DASHBOARD_NETWORK);

    this.canViewActiveSessions =
      this.authService.hasAuthority(Authorizations.ROOT_ADMIN) ||
      this.authService.hasAuthority('read:user:store') ||
      this.authService.hasAuthority('read:user:network');

    if (this.hasDashboardPermission) {
      this.subscriptions.push(
        this.storeContextService.currentStoreId$.subscribe((storeId) => {
          this.selectedStoreId = storeId;
          this.loadMetrics();
          if (this.canViewActiveSessions) {
            this.loadActiveSessions();
          }
        }),
      );
    } else {
      this.loading = false;
    }

    if (this.canViewActiveSessions) {
      if (!this.hasDashboardPermission) {
        this.loadActiveSessions();
      }
      this.startActiveSessionsPolling();
    }
  }

  loadMetrics(): void {
    this.loading = true;
    this.dashboardService.getAdminMetrics(this.selectedStoreId).subscribe({
      next: (data) => {
        this.metrics = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading dashboard metrics', err);
        this.loading = false;
      },
    });
  }

  loadActiveSessions(): void {
    const storeIdParam = this.hasNetworkPermission ? this.selectedStoreId : null;
    this.userSessionService.getActiveSessions(storeIdParam).subscribe({
      next: (sessions) => {
        const currentUserEmail = this.authService.getUsername();
        this.activeSessions = sessions.filter((session) => session.user.email !== currentUserEmail);
      },
      error: (err) => {
        console.error('Error loading active sessions', err);
      },
    });
  }

  @HostListener('document:visibilitychange', [])
  onVisibilityChange(): void {
    if (!this.canViewActiveSessions) return;

    if (document.hidden) {
      this.stopActiveSessionsPolling();
    } else {
      this.loadActiveSessions();
      this.startActiveSessionsPolling();
    }
  }

  private startActiveSessionsPolling(): void {
    this.stopActiveSessionsPolling();
    this.activeSessionsInterval = setInterval(() => {
      this.loadActiveSessions();
    }, 30000);
  }

  private stopActiveSessionsPolling(): void {
    if (this.activeSessionsInterval) {
      clearInterval(this.activeSessionsInterval);
      this.activeSessionsInterval = null;
    }
  }

  calculateActiveTime(createdAt: string): string {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    if (diffMs < 0) return 'Recém-conectado';
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  disconnectUser(session: UserSession): void {
    const confirmDisconnect = confirm(
      `Tem certeza que deseja derrubar a sessão do usuário ${session.user.person?.name || session.user.email}?`,
    );
    if (!confirmDisconnect) return;

    this.userSessionService.disconnectUser(session.user.userId).subscribe({
      next: () => {
        this.toastrService.success('Sessão do usuário desconectada com sucesso!');
        this.loadActiveSessions();
      },
      error: (err) => {
        console.error('Erro ao desconectar usuário', err);
        this.toastrService.error('Erro ao tentar desconectar o usuário.');
      },
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.stopActiveSessionsPolling();
  }
}
