import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { Store } from '@interfaces/store';
import { Person } from '@interfaces/person';
import { PersonService } from '@services/person.service';
import { StoreService } from '@services/store.service';

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
    public dialogRef: MatDialogRef<StoreOwnerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: StoreOwnerDialogData,
  ) {}

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
        // Filtra para remover quem já é proprietário desta loja
        this.persons = response.content.filter((p) => !this.isStoreOwner(p.personId!));
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
    const type = person.legalEntity ? 'CNPJ' : 'CPF';
    const doc = person.legalEntity ? person.cnpj : person.cpf;
    const accessStatus = person.hasUser ? '✅ Com acesso' : '❌ Sem acesso';
    return `${person.name} - ${type}: ${doc} (${accessStatus})`;
  }

  onAddOwner(): void {
    if (this.ownerForm.valid && this.store.storeId) {
      const selectedPersonId = this.ownerForm.value.personId;
      const selectedPerson = this.persons.find((p) => p.personId === selectedPersonId);

      if (selectedPerson && !selectedPerson.hasUser) {
        alert(
          'Esta pessoa não possui um usuário de sistema (login/senha) vinculado. \n\nPor favor, cadastre um usuário para esta pessoa antes de vinculá-la como proprietária.',
        );
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
          alert('Sócio/Proprietário adicionado com sucesso!');
        },
        error: (err) => {
          console.error('Erro ao adicionar proprietário:', err);
          alert(err.error || 'Erro ao adicionar proprietário');
          this.submitting = false;
        },
      });
    }
  }

  onRemoveOwner(personId: string): void {
    if (confirm('Tem certeza de que deseja remover este sócio/proprietário da loja?')) {
      this.submitting = true;
      this.storeService.removeOwner(this.store.storeId!, personId).subscribe({
        next: (updatedStore) => {
          this.store = updatedStore;
          this.hasChanges = true;
          this.submitting = false;
          this.loadPersons();
          alert('Sócio/Proprietário removido com sucesso!');
        },
        error: (err) => {
          console.error('Erro ao remover proprietário:', err);
          alert(err.error || 'Erro ao remover proprietário');
          this.submitting = false;
        },
      });
    }
  }

  onClose(): void {
    this.dialogRef.close(this.hasChanges);
  }
}
