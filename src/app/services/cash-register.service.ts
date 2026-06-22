import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, first } from 'rxjs';
import {
  ICashRegister,
  ICashRegisterRecord,
  ICashRegisterSession,
  IOpenSessionRequest,
  ICashRegisterReport,
} from '@interfaces/cash-register';
import { StoreContextService } from './store-context.service';

@Injectable({
  providedIn: 'root',
})
export class CashRegisterService {
  private readonly apiUrl: string = '/api/financial/cash-registers';

  constructor(
    private http: HttpClient,
    private storeContextService: StoreContextService,
  ) {}

  getCashRegisters(storeId?: string): Observable<ICashRegister[]> {
    const currentStoreId = storeId || this.storeContextService.currentStoreId;
    let url = this.apiUrl;
    if (currentStoreId) {
      url += `?storeId=${encodeURIComponent(currentStoreId)}`;
    }
    return this.http.get<ICashRegister[]>(url).pipe(first());
  }

  createCashRegister(data: ICashRegisterRecord): Observable<ICashRegister> {
    return this.http.post<ICashRegister>(this.apiUrl, data).pipe(first());
  }

  openSession(data: IOpenSessionRequest): Observable<ICashRegisterSession> {
    return this.http.post<ICashRegisterSession>(`${this.apiUrl}/sessions/open`, data).pipe(first());
  }

  getCurrentSession(cashRegisterId: string): Observable<ICashRegisterSession | null> {
    return this.http.get<ICashRegisterSession | null>(`${this.apiUrl}/${encodeURIComponent(cashRegisterId)}/current-session`).pipe(first());
  }

  closeSession(sessionId: string): Observable<ICashRegisterSession> {
    return this.http.post<ICashRegisterSession>(`${this.apiUrl}/sessions/${sessionId}/close`, {}).pipe(first());
  }

  reopenSession(sessionId: string): Observable<ICashRegisterSession> {
    return this.http.post<ICashRegisterSession>(`${this.apiUrl}/sessions/${sessionId}/reopen`, {}).pipe(first());
  }

  getSessionReport(sessionId: string): Observable<ICashRegisterReport> {
    return this.http.get<ICashRegisterReport>(`${this.apiUrl}/sessions/${sessionId}/report`).pipe(first());
  }
}
