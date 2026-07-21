import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BillingSettings {
  nfeBlockDays: number;
  softBlockDays: number;
  hardBlockDays: number;
}

@Injectable({
  providedIn: 'root',
})
export class BillingSettingsService {
  private readonly apiUrl: string = '/api/billing-settings';

  constructor(private http: HttpClient) {}

  getSettings(): Observable<BillingSettings> {
    return this.http.get<BillingSettings>(this.apiUrl);
  }

  updateSettings(settings: BillingSettings): Observable<BillingSettings> {
    return this.http.put<BillingSettings>(this.apiUrl, settings);
  }
}
