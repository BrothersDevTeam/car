import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ContentHeaderComponent } from '@components/content-header/content-header.component';
import { DashboardService, AdminDashboardMetrics } from '@services/dashboard.service';
import { AuthService } from '@services/auth/auth.service';
import { StoreContextService } from '@services/store-context.service';
import { Authorizations } from '../../enums/authorizations';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ContentHeaderComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);
  private storeContextService = inject(StoreContextService);
  private subscriptions: Subscription[] = [];
  
  metrics: AdminDashboardMetrics | null = null;
  loading = true;
  isAdmin = false;
  selectedStoreId: string | null = null;

  ngOnInit(): void {
    this.isAdmin = this.authService.hasAuthority(Authorizations.ROOT_ADMIN);

    if (this.isAdmin) {
      this.subscriptions.push(
        this.storeContextService.currentStoreId$.subscribe((storeId) => {
          this.selectedStoreId = storeId;
          this.loadMetrics();
        })
      );
    } else {
      this.loading = false;
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
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
