import { Component, inject, OnInit, OnDestroy } from '@angular/core';
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
  private subscriptions: Subscription[] = [];

  metrics: AdminDashboardMetrics | null = null;
  loading = true;
  isAdmin = false;
  selectedStoreId: string | null = null;

  activeSessions: UserSession[] = [];
  canViewActiveSessions = false;
  private activeSessionsInterval: any;

  ngOnInit(): void {
    this.isAdmin = this.authService.hasAuthority(Authorizations.ROOT_ADMIN);
    this.canViewActiveSessions = this.authService.hasAuthority(Authorizations.ROOT_ADMIN) ||
                                 this.authService.hasAuthority('read:user:store') ||
                                 this.authService.hasAuthority('read:user:network');

    if (this.isAdmin) {
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
      if (!this.isAdmin) {
        this.loadActiveSessions();
      }
      this.activeSessionsInterval = setInterval(() => {
        this.loadActiveSessions();
      }, 30000);
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
    const storeIdParam = this.isAdmin ? this.selectedStoreId : null;
    this.userSessionService.getActiveSessions(storeIdParam).subscribe({
      next: (sessions) => {
        const currentUserEmail = this.authService.getUsername();
        this.activeSessions = sessions.filter(session => session.user.email !== currentUserEmail);
      },
      error: (err) => {
        console.error('Error loading active sessions', err);
      }
    });
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

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    if (this.activeSessionsInterval) {
      clearInterval(this.activeSessionsInterval);
    }
  }
}
