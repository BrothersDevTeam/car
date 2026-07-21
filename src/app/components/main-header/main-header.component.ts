import { Component, EventEmitter, OnInit, OnDestroy, Output, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { EventType, Router } from '@angular/router';
import { AuthService } from '@services/auth/auth.service';
import { StoreService } from '@services/store.service';
import { StoreContextService } from '@services/store-context.service';
import { Authorizations } from '../../enums/authorizations';
import { Store } from '@interfaces/store';
import { StoreStatus } from '../../enums/storeTypes';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-main-header',
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule,
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
  private router = inject(Router);

  isCarAdmin = false;
  canReadStoreOthers = false;
  stores: Store[] = [];
  selectedStoreId: string = 'ALL';
  inactiveStores: Store[] = [];
  
  // Variáveis para o banner de faturamento
  showBillingWarning = false;
  warningMessage = '';
  diasAtraso = 0;

  ngOnInit(): void {
    // Escuta atualizações nas autorizações do usuário logado
    this.authService.authorizations$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.isCarAdmin = this.authService.hasAuthority(Authorizations.ROOT_ADMIN);
      this.canReadStoreOthers = this.authService.hasAuthority(Authorizations.READ_STORE_NETWORK);

      if (this.isCarAdmin) {
        this.loadInactiveStores();
      }

      const initialStoreId = this.authService.getStoreId();
      if (initialStoreId) {
        this.checkBillingStatus(initialStoreId);
      }

      if (this.isCarAdmin || this.canReadStoreOthers) {
        this.loadAllStores();
      } else {
        this.loadCurrentStoreName();
      }
    });

    // Escuta mudanças na loja globalmente selecionada
    this.storeContextService.currentStoreId$
      .pipe(takeUntil(this.destroy$), distinctUntilChanged())
      .subscribe((storeId) => {
        // Configura o ID inicial pelo contexto global (usando 'ALL' em vez de null para o html renderizar)
        this.selectedStoreId = storeId ?? 'ALL';

        const storeToCheck = storeId || this.authService.getStoreId();
        if (storeToCheck) {
          this.checkBillingStatus(storeToCheck);
        } else {
          this.showBillingWarning = false;
        }

        if (this.isCarAdmin || this.canReadStoreOthers) {
          this.loadAllStores();
        } else {
          this.loadCurrentStoreName();
        }
      });

    // Escuta atualizações de lojas para recarregar a lista do header sem f5
    this.storeService.storeUpdated$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.isCarAdmin || this.canReadStoreOthers) {
        this.loadAllStores();
      } else {
        this.loadCurrentStoreName();
      }
      if (this.isCarAdmin) {
        this.loadInactiveStores();
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
      ? this.storeService.getAllMinimal({ size: 1000 })
      : this.storeService.getBranchesMinimal({ size: 1000 });

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
    const storeToEmit = this.selectedStoreId === 'ALL' ? null : this.selectedStoreId;
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
    const cleanCnpj = cnpj.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (cleanCnpj.length !== 14) return cnpj;
    return cleanCnpj.replace(/^([A-Z0-9]{2})([A-Z0-9]{3})([A-Z0-9]{3})([A-Z0-9]{4})([A-Z0-9]{2})$/, '$1.$2.$3/$4-$5');
  }

  loadInactiveStores(): void {
    if (!this.isCarAdmin) return;
    this.storeService.getAll({ storeStatus: StoreStatus.INACTIVE, size: 100 }).subscribe({
      next: (response) => {
        if (response && response.content) {
          this.inactiveStores = response.content;
        }
      },
      error: (err) => console.error('Erro ao carregar lojas inativas:', err),
    });
  }

  goToStoresPage(): void {
    this.router.navigate(['/store']);
  }

  checkBillingStatus(storeId: string): void {
    if (!storeId || storeId === 'ALL') {
      this.showBillingWarning = false;
      return;
    }

    if (this.isCarAdmin) {
      this.showBillingWarning = false;
      return;
    }

    this.storeService.getById(storeId).subscribe({
      next: (store) => {
        if (store && store.dueDate) {
          const dueDateObj = new Date(store.dueDate + 'T00:00:00');
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          dueDateObj.setHours(0, 0, 0, 0);

          if (today > dueDateObj) {
            const diffTime = Math.abs(today.getTime() - dueDateObj.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            this.diasAtraso = diffDays;
            this.showBillingWarning = true;
            this.warningMessage = `Atenção: Detectamos uma pendência financeira em sua mensalidade (${diffDays} ${diffDays === 1 ? 'dia' : 'dias'} de atraso). Regularize o pagamento para evitar suspensão de recursos.`;
          } else {
            this.showBillingWarning = false;
          }
        } else {
          this.showBillingWarning = false;
        }
      },
      error: () => {
        this.showBillingWarning = false;
      }
    });
  }
}
