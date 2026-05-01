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
import { Store } from '@interfaces/store';
import { Person } from '@interfaces/person';
import { PersonService } from '@services/person.service';

export interface StoreOwnerDialogData {
  store: Store;
  mode?: 'set' | 'update'; // 'set' = vincular primeira vez, 'update' = trocar proprietário
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

  /**
   * Modo de operação do dialog:
   * - 'set': Vincular proprietário pela primeira vez (loja sem owner)
   * - 'update': Alterar proprietário existente (loja já tem owner)
   */
  mode: 'set' | 'update' = 'set';

  /**
   * Proprietário atual da loja (quando mode = 'update')
   */
  currentOwner: Person | null = null;

  constructor(
    private fb: FormBuilder,
    private personService: PersonService,
    public dialogRef: MatDialogRef<StoreOwnerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: StoreOwnerDialogData,
  ) {}

  ngOnInit(): void {
    // Determina o modo baseado na presença de owner na loja
    this.mode = this.data.mode || (this.data.store.owner ? 'update' : 'set');

    // Se for modo update e tiver owner, guarda referência
    if (this.mode === 'update' && this.data.store.owner) {
      this.currentOwner = typeof this.data.store.owner === 'object' ? this.data.store.owner : null;
    }

    this.initForm();
    this.initForm();
    this.checkForCarAdmin();
    this.loadPersons();

    // Subscribe to search changes with debounce
    this.searchControl.valueChanges.subscribe((value) => {
      // Debounce manual simplificado ou usar rxJS (vou usar timeout simples para nao importar mais coisas)
      if (this.searchTimeout) clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.loadPersons(value || '');
      }, 500);
    });
  }

  checkForCarAdmin() {
    this.isCarAdmin = this.personService.hasRole('ROLE_CAR_ADMIN');
    console.log('👑 StoreOwnerDialog - isCarAdmin:', this.isCarAdmin);
  }

  private initForm(): void {
    this.ownerForm = this.fb.group({
      personId: ['', Validators.required],
    });
  }

  private loadPersons(search: string = ''): void {
    this.loading = true;
    this.error = false;

    const params: any = {
      includeInactive: true, // Traz inativos para vermos se existe
    };

    // Se tiver busca, usa o parametro de busca global
    if (search) {
      params['search'] = search;
    }

    // Se NAO for CAR_ADMIN, filtra pela loja atual.
    // Se for CAR_ADMIN, não envia storeId para ver todos (global).
    if (!this.isCarAdmin) {
      params['storeId'] = this.data.store.storeId;
    }

    console.log('🔍 Buscando pessoas. Search:', search, 'StoreId:', params['storeId'], 'IsCarAdmin:', this.isCarAdmin);

    this.personService.getPaginatedData(0, 100, params).subscribe({
      next: (response) => {
        console.log('✅ Pessoas encontradas:', response.content.length);
        this.persons = response.content;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar pessoas:', err);
        this.error = true;
        this.loading = false;
      },
    });
  }

  /**
   * Retorna o título do dialog baseado no modo
   */
  getDialogTitle(): string {
    return this.mode === 'update' ? 'Alterar Proprietário' : 'Vincular Proprietário';
  }

  /**
   * Retorna o texto do botão de ação baseado no modo
   */
  getActionButtonText(): string {
    return this.mode === 'update' ? 'Alterar Proprietário' : 'Vincular Proprietário';
  }

  /**
   * Verifica se a Person selecionada é o proprietário atual
   */
  isCurrentOwner(personId: string): boolean {
    return this.currentOwner?.personId === personId;
  }

  getPersonDisplay(person: Person): string {
    const type = person.legalEntity ? 'CNPJ' : 'CPF';
    const doc = person.legalEntity ? person.cnpj : person.cpf;
    const accessStatus = person.hasUser ? '✅ Com acesso' : '❌ Sem acesso';
    return `${person.name} - ${type}: ${doc} (${accessStatus})`;
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSubmit(): void {
    if (this.ownerForm.valid) {
      const selectedPersonId = this.ownerForm.value.personId;
      const selectedPerson = this.persons.find((p) => p.personId === selectedPersonId);

      if (selectedPerson && !selectedPerson.hasUser) {
        alert(
          'Esta pessoa não possui um usuário de sistema (login/senha) vinculado. \n\nPor favor, cadastre um usuário para esta pessoa antes de vinculá-la como proprietária.',
        );
        return;
      }

      this.dialogRef.close(selectedPersonId);
    }
  }
}
