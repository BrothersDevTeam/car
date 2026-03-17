import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ContentHeaderComponent } from '@components/content-header/content-header.component';
import { DashboardService, AdminDashboardMetrics } from '@services/dashboard.service';
import { AuthService } from '@services/auth/auth.service';
import { Authorizations } from '../../enums/authorizations';

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
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);
  
  metrics: AdminDashboardMetrics | null = null;
  loading = true;
  isAdmin = false;

  ngOnInit(): void {
    this.isAdmin = this.authService.hasAuthority(Authorizations.ROOT_ADMIN);

    if (this.isAdmin) {
      this.dashboardService.getAdminMetrics().subscribe({
        next: (data) => {
          this.metrics = data;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading dashboard metrics', err);
          this.loading = false;
        }
      });
    } else {
      this.loading = false;
    }
  }
}
