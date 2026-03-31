import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

import { StoreCardComponent } from '../../components/store/store-card/store-card.component';
import { ContentHeaderComponent } from '../../components/content-header/content-header.component';
import { StoreFormDialogComponent } from '../../components/dialogs/store-form-dialog/store-form-dialog.component';
import { StoreOwnerDialogComponent } from '../../components/dialogs/store-owner-dialog/store-owner-dialog.component';
import { StoreAddressDialogComponent } from '../../components/dialogs/store-address-dialog/store-address-dialog.component';
import { StoreEmployeesDialogComponent } from '../../components/dialogs/store-employees-dialog/store-employees-dialog.component';
import { StoreFiscalDialogComponent } from '../../components/dialogs/store-fiscal-dialog/store-fiscal-dialog.component';
import { Store } from '@interfaces/store';
import { StoreService } from '@services/store.service';
import { AuthService } from '@services/auth/auth.service';
import { StoreContextService } from '@services/store-context.service';
import { Authorizations } from '../../enums/authorizations';
import { StoreStatus, StoreStatusLabels, StoreStatusIcons, StoreStatusColors } from '../../enums/storeTypes';

@Component({
  selector: 'app-store',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatButtonToggleModule,
    MatMenuModule,
    MatTableModule,
    MatTooltipModule,
    MatDividerModule,
    StoreCardComponent,
    ContentHeaderComponent,
  ],
  templateUrl: './store.component.html',
  styleUrl: './store.component.scss',
})
export class StoreComponent implements OnInit {
  stores: Store[] = [];
  loading = true;
  error = false;
  isCarAdmin = false;
  canCreateStore = false; // Pode ser CAR_ADMIN ou ADMIN
  canManageFiscal = false;

  viewMode: 'grid' | 'compact' | 'table' = 'grid';
  displayedColumns: string[] = ['logo', 'name', 'cnpj', 'status', 'actions'];
  selectedStoreId: string | null = null;
  StoreStatus = StoreStatus;

  constructor(
    private storeService: StoreService,
    private authService: AuthService,
    private storeContextService: StoreContextService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    const savedViewMode = localStorage.getItem('storeViewMode');
    if (savedViewMode === 'grid' || savedViewMode === 'compact' || savedViewMode === 'table') {
      this.viewMode = savedViewMode;
    }

    this.checkUserRole();
    this.storeContextService.currentStoreId$.subscribe((storeId) => {
      this.selectedStoreId = storeId;
      this.loadStores();
    });
  }

  private checkUserRole(): void {
    // Verifica se é administrador master (CAR_ADMIN)
    this.isCarAdmin = this.authService.hasAuthority(Authorizations.ROOT_ADMIN);

    // CAR_ADMIN cadastra matriz (root:admin), ADMIN cadastra filiais (edit:store)
    this.canCreateStore =
      this.authService.hasAuthority(Authorizations.ROOT_ADMIN) ||
      this.authService.hasAuthority(Authorizations.EDIT_STORE);

    // Pode gerenciar config fiscal quem pode editar a loja ou emitir nota localmente
    this.canManageFiscal =
      this.authService.hasAuthority(Authorizations.ROOT_ADMIN) ||
      this.authService.hasAuthority(Authorizations.EDIT_STORE) ||
      this.authService.hasAuthority(Authorizations.SYNC_FOCUSNFE as Authorizations);
  }

  private loadStores(): void {
    this.loading = true;
    this.error = false;

    const serviceCall = this.isCarAdmin
      ? this.storeService.getAll({ page: 0, size: 100 })
      : this.storeService.getBranches({ page: 0, size: 100 });

    serviceCall.subscribe({
      next: (response) => {
        const allFetchedStores = response.content;
        if (this.selectedStoreId) {
          this.stores = allFetchedStores.filter(
            (store) => store.storeId === this.selectedStoreId || store.mainStoreId === this.selectedStoreId
          );
        } else {
          this.stores = allFetchedStores;
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar lojas:', err);
        this.error = true;
        this.loading = false;
      },
    });
  }

  changeViewMode(mode: 'grid' | 'compact' | 'table'): void {
    this.viewMode = mode;
    localStorage.setItem('storeViewMode', mode);
  }

  onSelectStore(store: Store): void {
    if (store.storeId) {
      this.storeContextService.setStoreId(store.storeId);
      // O header se atualizará automaticamente devido ao serviço
    }
  }

  getStatusLabel(status: any): string {
    return StoreStatusLabels[status as StoreStatus] || status as string;
  }

  getStatusIcon(status: any): string {
    return StoreStatusIcons[status as StoreStatus] || 'help';
  }

  getStatusColor(status: any): string {
    return StoreStatusColors[status as StoreStatus] || '#000';
  }

  getFormattedCnpj(cnpj: string | undefined): string {
    if (!cnpj) return '';
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) return cnpj;
    return cleanCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
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
        mode, // Passa o modo para o dialog
      },
    });

    dialogRef.afterClosed().subscribe((personId) => {
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

  onManageAuthorizations(store: Store): void {
    this.dialog.open(StoreEmployeesDialogComponent, {
      width: '800px',
      data: { store },
    });
  }

  // Início de código gerado pelo antigravity
  onManageAddress(store: Store): void {
    this.dialog.open(StoreAddressDialogComponent, {
      width: '800px',
      data: { store },
    });
  }
  // Fim de código gerado pelo antigravity

  onManageFiscal(store: Store): void {
    this.dialog.open(StoreFiscalDialogComponent, {
      width: '700px',
      data: { store },
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
        title: this.isCarAdmin
          ? 'Cadastrar Nova Loja Matriz'
          : 'Cadastrar Nova Filial',
        mode: 'create',
        isCarAdmin: this.isCarAdmin, // Passa info para o dialog saber qual endpoint usar
      },
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
      },
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
      },
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
        alert(
          `Proprietário alterado com sucesso para: ${updatedStore.owner?.name || 'novo proprietário'}`
        );
        this.loadStores();
      },
      error: (err) => {
        console.error('❌ Erro ao alterar proprietário:', err);
        const errorMessage =
          err.error?.message || err.error || 'Erro ao alterar proprietário';
        alert(errorMessage);
      },
    });
  }
}
