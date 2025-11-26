import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { StoreCardComponent } from '../../components/store/store-card/store-card.component';
import { ContentHeaderComponent } from '../../components/content-header/content-header.component';
import { StoreFormDialogComponent } from '../../components/dialogs/store-form-dialog/store-form-dialog.component';
import { StoreOwnerDialogComponent } from '../../components/dialogs/store-owner-dialog/store-owner-dialog.component';
import { Store } from '@interfaces/store';
import { StoreService } from '@services/store.service';
import { AuthService } from '@services/auth/auth.service';

@Component({
  selector: 'app-store',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
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
  canCreateStore = false; // Pode ser CAR_ADMIN ou ADMIN

  constructor(
    private storeService: StoreService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.checkUserRole();
    this.loadStores();
  }

  private checkUserRole(): void {
    const roles = this.authService.getRoles();
    this.isCarAdmin = roles.includes('ROLE_CAR_ADMIN');
    // CAR_ADMIN pode cadastrar matriz, ADMIN pode cadastrar filiais
    this.canCreateStore = roles.includes('ROLE_CAR_ADMIN') || roles.includes('ROLE_ADMIN');
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
    // Determina o modo: se já tem owner, é update, senão é set
    const mode = store.owner ? 'update' : 'set';
    
    const dialogRef = this.dialog.open(StoreOwnerDialogComponent, {
      width: '600px',
      data: { 
        store,
        mode // Passa o modo para o dialog
      }
    });

    dialogRef.afterClosed().subscribe(personId => {
      if (personId) {
        // Chama o método apropriado baseado no modo
        if (mode === 'update') {
          this.updateStoreOwner(store.storeId!, personId);
        } else {
          this.setStoreOwner(store.storeId!, personId);
        }
      }
    });
  }

  onUploadImage(store: Store): void {
    console.log('📷 Upload de imagem para:', store);
  }

  onViewDetails(store: Store): void {
    console.log('ℹ️ Ver detalhes de:', store);
  }

  /**
   * Abre o wizard de cadastro completo de loja (Store + Person + User)
   * O wizard cria tudo automaticamente em sequência
   * CAR_ADMIN cadastra MATRIZ, ADMIN cadastra FILIAL
   */
  onCreateStore(): void {
    const dialogRef = this.dialog.open(StoreFormDialogComponent, {
      width: '700px',
      disableClose: true,
      data: {
        title: this.isCarAdmin ? 'Cadastrar Nova Loja Matriz' : 'Cadastrar Nova Filial',
        mode: 'create',
        isCarAdmin: this.isCarAdmin // Passa info para o dialog saber qual endpoint usar
      }
    });

    dialogRef.afterClosed().subscribe((createdStore: Store | null) => {
      if (createdStore) {
        console.log('✅ Loja, proprietário e usuário criados com sucesso!');
        // Recarrega a lista de lojas para exibir a nova
        this.loadStores();
      }
    });
  }

  private createMainStore(data: any): void {
    this.storeService.createMainStore(data).subscribe({
      next: (newStore) => {
        console.log('✅ Loja criada:', newStore);
        this.loadStores();
      },
      error: (err) => {
        console.error('❌ Erro ao criar loja:', err);
      }
    });
  }

  private setStoreOwner(storeId: string, personId: string): void {
    this.storeService.setOwner(storeId, personId).subscribe({
      next: (updatedStore) => {
        console.log('✅ Proprietário vinculado:', updatedStore);
        this.loadStores();
      },
      error: (err) => {
        console.error('❌ Erro ao vincular proprietário:', err);
        alert(err.error || 'Erro ao vincular proprietário');
      }
    });
  }

  /**
   * Altera o proprietário de uma loja existente.
   * Chama o endpoint PUT /stores/{storeId}/owner
   * Permitido apenas para CAR_ADMIN
   */
  private updateStoreOwner(storeId: string, personId: string): void {
    this.storeService.updateOwner(storeId, personId).subscribe({
      next: (updatedStore) => {
        console.log('✅ Proprietário alterado com sucesso:', updatedStore);
        alert(`Proprietário alterado com sucesso para: ${updatedStore.owner?.name || 'novo proprietário'}`);
        this.loadStores();
      },
      error: (err) => {
        console.error('❌ Erro ao alterar proprietário:', err);
        const errorMessage = err.error?.message || err.error || 'Erro ao alterar proprietário';
        alert(errorMessage);
      }
    });
  }
}
