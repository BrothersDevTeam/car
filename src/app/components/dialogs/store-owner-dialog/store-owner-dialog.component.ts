import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { ToastrService } from 'ngx-toastr';
import { Store } from '@interfaces/store';
import { Person } from '@interfaces/person';
import { PersonService } from '@services/person.service';
import { StoreService } from '@services/store.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { StoreEmployeesDialogComponent } from '../store-employees-dialog/store-employees-dialog.component';

export interface StoreOwnerDialogData {
  store: Store;
}

@Component({
  selector: 'app-store-owner-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatDividerModule,
  ],
  templateUrl: './store-owner-dialog.component.html',
  styleUrls: ['./store-owner-dialog.component.scss'],
})
export class StoreOwnerDialogComponent implements OnInit {
  ownerForm!: FormGroup;
  persons: Person[] = [];
  loading = true;
  error = false;
  searchControl = new FormControl('');
  private searchTimeout: any;
  isCarAdmin = false;

  store!: Store;
  hasChanges = false;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private personService: PersonService,
    private storeService: StoreService,
    private toastr: ToastrService,
    private dialog: MatDialog,
    private router: Router,
    public dialogRef: MatDialogRef<StoreOwnerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: StoreOwnerDialogData,
  ) { }

  ngOnInit(): void {
    this.store = { ...this.data.store };
    this.initForm();
    this.checkForCarAdmin();
    this.loadPersons();
    this.refreshStoreDetails();

    // Subscribe to search changes with debounce
    this.searchControl.valueChanges.subscribe((value) => {
      if (this.searchTimeout) clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.loadPersons(value || '');
      }, 500);
    });
  }

  checkForCarAdmin() {
    this.isCarAdmin = this.personService.hasRole('ROLE_CAR_ADMIN');
  }

  private initForm(): void {
    this.ownerForm = this.fb.group({
      personId: ['', Validators.required],
    });
  }

  private refreshStoreDetails(): void {
    if (!this.store.storeId) return;

    this.storeService.getById(this.store.storeId).subscribe({
      next: (updatedStore) => {
        this.store = updatedStore;
      },
      error: (err) => {
        console.error('Erro ao atualizar detalhes da loja:', err);
      },
    });
  }

  private loadPersons(search: string = ''): void {
    this.loading = true;
    this.error = false;

    const params: any = {
      includeInactive: false, // Só faz sentido adicionar donos ATIVOS
    };

    if (search) {
      params['search'] = search;
    }

    if (!this.isCarAdmin) {
      params['storeId'] = this.store.storeId;
    }

    this.personService.getPaginatedData(0, 100, params).subscribe({
      next: (response) => {
        // Filtra para remover quem já é proprietário desta loja e manter apenas pessoas com acesso ao sistema
        this.persons = response.content.filter((p) => !this.isStoreOwner(p.personId!) && p.hasUser);
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar pessoas:', err);
        this.error = true;
        this.loading = false;
      },
    });
  }

  isStoreOwner(personId: string): boolean {
    return !!this.store.owners?.some((o) => o.personId === personId);
  }

  getPersonDisplay(person: Person): string {
    return person.name;
  }

  onAddOwner(): void {
    if (this.ownerForm.valid && this.store.storeId) {
      const selectedPersonId = this.ownerForm.value.personId;
      const selectedPerson = this.persons.find((p) => p.personId === selectedPersonId);

      if (selectedPerson && !selectedPerson.hasUser) {
        const warningRef = this.dialog.open(ConfirmDialogComponent, {
          width: '480px',
          data: {
            title: 'Usuário Não Vinculado',
            icon: 'warning_amber',
            type: 'warning',
            confirmText: 'Cadastrar Usuário Agora',
            cancelText: 'Cancelar',
            message: `
              <div style="text-align: left; font-size: 0.95rem; line-height: 1.5;">
                <p style="margin-bottom: 12px; font-weight: 500; color: var(--text-primary); text-align: center;">
                  A pessoa <strong>${selectedPerson.name}</strong> não possui um <strong>usuário de sistema (login/senha)</strong> vinculado.
                </p>
                <div style="background-color: rgba(245, 124, 0, 0.08); border-left: 4px solid #f57c00; padding: 12px 16px; border-radius: 8px; margin-top: 10px;">
                  <div style="font-weight: 600; color: #e65100; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                    <span>💡</span> O que fazer:
                  </div>
                  <div style="color: var(--text-secondary); text-align: justify; font-size: 0.9rem; line-height: 1.5;">
                    Você precisa criar um login (e-mail, senha e permissões) para esta pessoa antes de vinculá-la como proprietária. Deseja abrir a tela de criação de acesso para <strong>${selectedPerson.name}</strong> agora?
                  </div>
                </div>
              </div>
            `,
          },
        });

        warningRef.afterClosed().subscribe((confirmed) => {
          if (confirmed) {
            this.dialogRef.close(this.hasChanges);
            this.dialog.open(StoreEmployeesDialogComponent, {
              width: '800px',
              maxHeight: '90vh',
              data: {
                store: this.store,
                isRootAdmin: this.isCarAdmin,
                targetPersonId: selectedPerson.personId,
              },
            });
          }
        });
        return;
      }

      this.submitting = true;
      this.storeService.setStoreOwner(this.store.storeId, selectedPersonId).subscribe({
        next: (updatedStore) => {
          this.store = updatedStore;
          this.hasChanges = true;
          this.submitting = false;
          this.ownerForm.reset();
          this.loadPersons(); // recarrega a lista para filtrar o recém adicionado
          this.toastr.success('Sócio/Proprietário adicionado com sucesso!');
        },
        error: (err) => {
          console.error('Erro ao adicionar proprietário:', err);
          this.toastr.error(err.error || 'Erro ao adicionar proprietário');
          this.submitting = false;
        },
      });
    }
  }

  onRemoveOwner(personId: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Remover Sócio/Proprietário',
        message: 'Tem certeza de que deseja remover este sócio/proprietário da loja?',
        confirmText: 'Remover',
        cancelText: 'Cancelar',
        type: 'danger',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.submitting = true;
        this.storeService.removeOwner(this.store.storeId!, personId).subscribe({
          next: (updatedStore) => {
            this.store = updatedStore;
            this.hasChanges = true;
            this.submitting = false;
            this.loadPersons();
            this.toastr.success('Sócio/Proprietário removido com sucesso!');
          },
          error: (err) => {
            console.error('Erro ao remover proprietário:', err);
            this.toastr.error(err.error || 'Erro ao remover proprietário');
            this.submitting = false;
          },
        });
      }
    });
  }

  onClose(): void {
    this.dialogRef.close(this.hasChanges);
  }
}
