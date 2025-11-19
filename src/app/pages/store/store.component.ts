import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

import { StoreCardComponent } from '../../components/store/store-card/store-card.component';
import { ContentHeaderComponent } from '../../components/content-header/content-header.component';
import { Store } from '@interfaces/store';
import { StoreService } from '@services/store.service';
import { AuthService } from '@services/auth/auth.service';

@Component({
  selector: 'app-store',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    StoreCardComponent,
    ContentHeaderComponent
  ],
  templateUrl: './store.component.html',
  styleUrl: './store.component.scss'
})
export class StoreComponent implements OnInit {
  stores: Store[] = [];
  loading = true;
  error = false;
  isCarAdmin = false;

  constructor(
    private storeService: StoreService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.checkUserRole();
    this.loadStores();
  }

  private checkUserRole(): void {
    const roles = this.authService.getRoles();
    this.isCarAdmin = roles.includes('ROLE_CAR_ADMIN');
  }

  private loadStores(): void {
    this.loading = true;
    this.error = false;

    const serviceCall = this.isCarAdmin 
      ? this.storeService.getAll({ page: 0, size: 20 })
      : this.storeService.getBranches({ page: 0, size: 20 });

    serviceCall.subscribe({
      next: (response) => {
        this.stores = response.content;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar lojas:', err);
        this.error = true;
        this.loading = false;
      }
    });
  }

  onEditStore(store: Store): void {
    console.log('🔧 Editar loja:', store);
  }

  onDeleteStore(store: Store): void {
    console.log('🗑️ Deletar loja:', store);
  }

  onViewBranches(store: Store): void {
    console.log('🏪 Ver filiais de:', store);
  }

  onManageOwner(store: Store): void {
    console.log('👤 Gerenciar proprietário de:', store);
  }

  onUploadImage(store: Store): void {
    console.log('📷 Upload de imagem para:', store);
  }

  onViewDetails(store: Store): void {
    console.log('ℹ️ Ver detalhes de:', store);
  }
}
