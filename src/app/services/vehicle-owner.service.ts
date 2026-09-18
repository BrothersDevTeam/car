import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { VehicleOwner, VehicleOwnerPayload } from '../interfaces/vehicle-owner';
import { MessageResponse } from '../interfaces/message-response';

@Injectable({
  providedIn: 'root',
})
export class VehicleOwnerService {
  private readonly baseUrl: string = '/api/vehicles';

  constructor(private http: HttpClient) {}

  getOwners(vehicleId: string): Observable<VehicleOwner[]> {
    return this.http.get<VehicleOwner[]>(`${this.baseUrl}/${vehicleId}/owners`);
  }

  addOwner(vehicleId: string, payload: VehicleOwnerPayload): Observable<VehicleOwner> {
    return this.http.post<VehicleOwner>(`${this.baseUrl}/${vehicleId}/owners`, payload);
  }

  setCurrentOwner(vehicleId: string, vehicleOwnerId: string): Observable<VehicleOwner> {
    return this.http.put<VehicleOwner>(`${this.baseUrl}/${vehicleId}/owners/${vehicleOwnerId}/set-current`, {});
  }

  removeOwner(vehicleId: string, vehicleOwnerId: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.baseUrl}/${vehicleId}/owners/${vehicleOwnerId}`);
  }
}
