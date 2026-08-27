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
import { StoreStatus, StoreStatusLabels } from '../../enums/storeTypes';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, distinctUntilChanged } from 'rxjs';

import { FeedbackService } from '@services/feedback.service';

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
    MatTooltipModule,
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
  private feedbackService = inject(FeedbackService);
  private router = inject(Router);

  isCarAdmin = false;
  canReadStoreOthers = false;
  stores: Store[] = [];
  selectedStoreId: string = '';
  inactiveStores: Store[] = [];
  isStoreSelectionLocked = signal<boolean>(false);
  unreadFeedbacksCount = signal<number>(0);

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
        this.loadUnreadFeedbacksCount();
      }

      const initialStoreId = this.authService.getStoreId();
      if (initialStoreId) {
        this.checkBillingStatus(initialStoreId);
      }

      if (!this.isCarAdmin && !this.canReadStoreOthers) {
        this.selectedStoreId = initialStoreId ?? '';
      }

      this.loadAllStores();
    });

    // Escuta mudanças na loja globalmente selecionada
    this.storeContextService.currentStoreId$
      .pipe(takeUntil(this.destroy$), distinctUntilChanged())
      .subscribe((storeId) => {
        this.selectedStoreId = storeId ?? (this.isCarAdmin || this.canReadStoreOthers ? 'ALL' : (this.authService.getStoreId() ?? ''));

        const storeToCheck = storeId || this.authService.getStoreId();
        if (storeToCheck) {
          this.checkBillingStatus(storeToCheck);
        } else {
          this.showBillingWarning = false;
        }

        this.loadAllStores();
      });

    // Escuta estado de bloqueio do seletor de loja
    this.storeContextService.isStoreSelectionLocked$
      .pipe(takeUntil(this.destroy$), distinctUntilChanged())
      .subscribe((isLocked) => {
        this.isStoreSelectionLocked.set(isLocked);
      });

    // Escuta atualizações de lojas para recarregar a lista do header sem f5
    this.storeService.storeUpdated$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadAllStores();
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

          // Se o usuário não tem permissão de rede e não é admin, garante seleção da sua loja
          if (!this.isCarAdmin && !this.canReadStoreOthers) {
            const userStoreId = this.authService.getStoreId();
            if (userStoreId) {
              this.selectedStoreId = userStoreId;
              this.storeContextService.setStoreId(userStoreId);
            } else if (this.stores.length > 0 && this.stores[0].storeId) {
              this.selectedStoreId = this.stores[0].storeId;
              this.storeContextService.setStoreId(this.stores[0].storeId);
            }
          } else if (!this.isCarAdmin && this.selectedStoreId && this.selectedStoreId !== 'ALL') {
            const currentSelected = this.stores.find((s) => s.storeId === this.selectedStoreId);
            if (currentSelected && currentSelected.storeStatus !== StoreStatus.ACTIVE) {
              const defaultStoreId = this.authService.getStoreId();
              const defaultStoreActive = defaultStoreId && this.stores.find((s) => s.storeId === defaultStoreId && s.storeStatus === StoreStatus.ACTIVE);
              const fallbackStoreId = defaultStoreActive ? defaultStoreId : null;
              this.storeContextService.setStoreId(fallbackStoreId);
            }
          }
        }
      },
      error: () => this.storeName.set('Lojas indisponíveis'),
    });
  }

  getStatusLabel(status: any): string {
    return StoreStatusLabels[status as StoreStatus] || (status as string);
  }

  onStoreChange() {
    const storeToEmit = this.selectedStoreId === 'ALL' ? null : this.selectedStoreId;
    this.storeContextService.setStoreId(storeToEmit);
  }

  getSelectedStoreName(): string {
    if (this.selectedStoreId === 'ALL') {
      if (this.isCarAdmin || this.canReadStoreOthers) {
        return this.isCarAdmin ? 'Toda a Rede (Global)' : 'Toda a Rede';
      }
    }
    const store = this.stores.find((s) => s.storeId === this.selectedStoreId);
    if (store) {
      const name = store.tradeName || store.name;
      return `${name}`;
    }
    if (this.stores.length === 1 && !this.isCarAdmin && !this.canReadStoreOthers) {
      return this.stores[0].tradeName || this.stores[0].name;
    }
    return this.storeName() || '';
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

  loadUnreadFeedbacksCount(): void {
    if (!this.isCarAdmin) return;
    this.feedbackService.getUnreadCount().subscribe({
      next: (res) => this.unreadFeedbacksCount.set(res.unreadCount || 0),
      error: () => this.unreadFeedbacksCount.set(0),
    });
  }

  goToStoresPage(targetStoreId?: string): void {
    if (targetStoreId) {
      this.router.navigate(['/store'], { queryParams: { highlight: targetStoreId } });
    } else {
      this.router.navigate(['/store']);
    }
  }

  goToFeedbacksPage(): void {
    this.feedbackService.markAdminRead().subscribe({
      next: () => {
        this.unreadFeedbacksCount.set(0);
        this.router.navigate(['/feedbacks']);
      },
      error: () => {
        this.unreadFeedbacksCount.set(0);
        this.router.navigate(['/feedbacks']);
      },
    });
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
