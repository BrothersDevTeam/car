import {
  Component,
  EventEmitter,
  OnInit,
  OnDestroy,
  Output,
  inject,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { EventType } from '@angular/router';
import { AuthService } from '@services/auth/auth.service';
import { StoreService } from '@services/store.service';
import { StoreContextService } from '@services/store-context.service';
import { Authorizations } from '../../enums/authorizations';
import { Store } from '@interfaces/store';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-main-header',
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    FormsModule,
  ],
  templateUrl: './main-header.component.html',
  styleUrl: './main-header.component.scss',
})
export class MainHeaderComponent implements OnInit, OnDestroy {
  @Output() collapsedEvent = new EventEmitter<EventType>();

  private destroy$ = new Subject<void>();

  storeName = signal<string>('Carregando...');

  private authService = inject(AuthService);
  private storeService = inject(StoreService);
  private storeContextService = inject(StoreContextService);

  isCarAdmin = false;
  canReadStoreOthers = false;
  stores: Store[] = [];
  selectedStoreId: string = 'ALL';

  ngOnInit(): void {
    this.isCarAdmin = this.authService.hasAuthority(Authorizations.ROOT_ADMIN);
    this.canReadStoreOthers = this.authService.hasAuthority(
      Authorizations.READ_STORE_OTHERS
    );

    // Escuta mudanças na loja globalmente selecionada
    this.storeContextService.currentStoreId$
      .pipe(takeUntil(this.destroy$))
      .subscribe((storeId) => {
        // Configura o ID inicial pelo contexto global (usando 'ALL' em vez de null para o html renderizar)
        this.selectedStoreId = storeId ?? 'ALL';

        if (this.isCarAdmin || this.canReadStoreOthers) {
          this.loadAllStores();
        } else {
          this.loadCurrentStoreName();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAllStores() {
    this.storeName.set('Carregando Lojas...');
    const serviceCall = this.isCarAdmin
      ? this.storeService.getAll({ size: 1000 })
      : this.storeService.getBranches({ size: 1000 });

    serviceCall.subscribe({
      next: (response) => {
        if (response && response.content) {
          this.stores = response.content;
        }
      },
      error: () => this.storeName.set('Lojas indisponíveis'),
    });
  }

  private loadCurrentStoreName() {
    if (this.selectedStoreId) {
      this.storeService.getById(this.selectedStoreId).subscribe({
        next: (store) => {
          this.storeName.set(store.tradeName || store.name || 'Filial');
        },
        error: () => this.storeName.set('Filial'),
      });
    } else {
      this.storeName.set('Filial');
    }
  }

  onStoreChange() {
    const storeToEmit =
      this.selectedStoreId === 'ALL' ? null : this.selectedStoreId;
    this.storeContextService.setStoreId(storeToEmit);
  }

  getSelectedStoreName(): string {
    if (this.selectedStoreId === 'ALL') {
      return this.isCarAdmin ? 'Toda a Rede (Global)' : 'Toda a Rede';
    }
    const store = this.stores.find((s) => s.storeId === this.selectedStoreId);
    if (store) {
      const name = store.tradeName || store.name;
      return `${name} - ${this.formatCnpj(store.cnpj)}`;
    }
    return this.storeName() || 'Filial';
  }

  formatCnpj(cnpj: string | undefined): string {
    if (!cnpj) return '';
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) return cnpj;
    return cleanCnpj.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    );
  }
}
