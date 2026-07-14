import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';

export interface ReportRequest {
  format: 'PDF' | 'EXCEL';
  startDate?: string;
  endDate?: string;
  storeId?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private readonly apiUrl: string = '/api/reports';

  constructor(private http: HttpClient) {}

  downloadCustomerReport(request: ReportRequest): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/customer/download`, request, { responseType: 'blob' }).pipe(first());
  }

  downloadVehicleReport(request: ReportRequest): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/vehicle/download`, request, { responseType: 'blob' }).pipe(first());
  }

  downloadDreReport(request: ReportRequest): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/financial/dre/download`, request, { responseType: 'blob' }).pipe(first());
  }

  downloadCashFlowReport(request: ReportRequest): Observable<Blob> {
    return this.http
      .post(`${this.apiUrl}/financial/cash-flow/download`, request, { responseType: 'blob' })
      .pipe(first());
  }

  saveFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}
