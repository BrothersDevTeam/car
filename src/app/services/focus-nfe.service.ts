import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FocusNfeService {

  constructor(private http: HttpClient) {}

  /**
   * Comunica com a controller interna da loja para sincronizá-la
   * como emissora de notas no provedor Focus NFe.
   * Rota conectada ao FocusNfeController Java: POST /stores/{storeId}/focus-nfe/sync
   * 
   * @param storeId 
   */
  syncStore(storeId: string): Observable<any> {
    return this.http.post<any>(`/api/stores/${storeId}/focus-nfe/sync`, {});
  }
}
