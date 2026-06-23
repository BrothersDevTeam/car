import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserSession } from '@interfaces/user-session';

@Injectable({
  providedIn: 'root',
})
export class UserSessionService {
  private readonly apiUrl = '/api/users/active-sessions';

  constructor(private http: HttpClient) {}

  getActiveSessions(storeId: string | null = null): Observable<UserSession[]> {
    let url = this.apiUrl;
    if (storeId) {
      url += `?storeId=${storeId}`;
    }
    return this.http.get<UserSession[]>(url);
  }

  disconnectUser(userId: string): Observable<string> {
    // Configura responseType como 'text' para evitar erros de parse JSON com respostas de corpo vazio (HTTP 204 No Content)
    return this.http.delete(`/api/users/${userId}/sessions`, { responseType: 'text' });
  }
}
