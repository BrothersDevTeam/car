import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { Optional } from '@interfaces/optional';

@Injectable({
  providedIn: 'root',
})
export class OptionalService {
  private readonly apiUrl: string = '/api/optionals';

  constructor(private http: HttpClient) {}

  getAvailableOptionals(): Observable<Optional[]> {
    return this.http.get<Optional[]>(`${this.apiUrl}/available`).pipe(first());
  }
}
