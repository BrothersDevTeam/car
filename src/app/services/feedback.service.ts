import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import {
  Feedback,
  FeedbackCreatePayload,
  FeedbackStatus,
  FeedbackStatusUpdatePayload,
  FeedbackType,
} from '@interfaces/feedback';
import { PaginationResponse } from '@interfaces/pagination';

@Injectable({
  providedIn: 'root',
})
export class FeedbackService {
  private readonly apiUrl = '/api/feedbacks';

  private feedbackUpdatedSource = new Subject<void>();
  feedbackUpdated$ = this.feedbackUpdatedSource.asObservable();

  notifyFeedbackUpdated(): void {
    this.feedbackUpdatedSource.next();
  }

  constructor(private http: HttpClient) {}

  createFeedback(payload: FeedbackCreatePayload): Observable<Feedback> {
    return this.http.post<Feedback>(this.apiUrl, payload);
  }

  getAllFeedbacks(filters?: {
    status?: FeedbackStatus;
    type?: FeedbackType;
    storeId?: string;
    page?: number;
    size?: number;
  }): Observable<PaginationResponse<Feedback>> {
    let params = new HttpParams();

    if (filters) {
      if (filters.status) params = params.set('status', filters.status);
      if (filters.type) params = params.set('type', filters.type);
      if (filters.storeId && filters.storeId !== 'ALL') params = params.set('storeId', filters.storeId);
      if (filters.page !== undefined) params = params.set('page', filters.page.toString());
      if (filters.size !== undefined) params = params.set('size', filters.size.toString());
    }

    return this.http.get<PaginationResponse<Feedback>>(this.apiUrl, { params });
  }

  getMyFeedbacks(page: number = 0, size: number = 10): Observable<PaginationResponse<Feedback>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<PaginationResponse<Feedback>>(`${this.apiUrl}/my-feedbacks`, { params });
  }

  getUnreadCount(): Observable<{ unreadCount: number }> {
    return this.http.get<{ unreadCount: number }>(`${this.apiUrl}/unread-count`);
  }

  getMyUnreadCount(): Observable<{ unreadCount: number }> {
    return this.http.get<{ unreadCount: number }>(`${this.apiUrl}/my-unread-count`);
  }

  getById(id: string): Observable<Feedback> {
    return this.http.get<Feedback>(`${this.apiUrl}/${id}`);
  }

  updateStatus(id: string, payload: FeedbackStatusUpdatePayload): Observable<Feedback> {
    return this.http.post<Feedback>(`${this.apiUrl}/${id}/status`, payload);
  }

  deleteFeedback(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  markUserRead(): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/mark-user-read`, {});
  }

  markAdminRead(): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/mark-admin-read`, {});
  }
}
