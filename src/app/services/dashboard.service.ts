import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';

export interface AdminDashboardMetrics {
  totalActiveStores: number;
  totalBranches: number;
  newStoresThisMonth: number;
  totalActiveUsers: number;
  totalVehicles: number;
  totalInvoices: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = '/api/dashboard';

  constructor(private http: HttpClient) {}

  getAdminMetrics(storeId?: string | null): Observable<AdminDashboardMetrics> {
    let params = new HttpParams();
    if (storeId) {
      params = params.set('storeId', storeId);
    }
    return this.http.get<AdminDashboardMetrics>(`${this.apiUrl}/admin`, { params });
  }
}
