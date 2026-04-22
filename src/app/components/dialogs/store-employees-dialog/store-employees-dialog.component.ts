import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatMenuModule } from '@angular/material/menu';
import { ToastrService } from 'ngx-toastr';
import { debounceTime, distinctUntilChanged, switchMap, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

import { EmployeeService } from '@services/employee.service';
import { PersonService } from '@services/person.service';
import { AuthService } from '@services/auth/auth.service';
import { Person } from '@interfaces/person';
import { Store } from '@interfaces/store';
import { Authorizations } from '@enums/authorizations';
import { RelationshipTypes } from '../../../enums/relationshipTypes';
import { EmployeeAuthorizationsDialogComponent } from '../employee-authorizations-dialog/employee-authorizations-dialog.component';

export interface StoreEmployeesDialogData {
  store: Store;
  isRootAdmin?: boolean;
}

// Grupos de autorização padrão (mesmos presets do natural-person-form)
const AUTH_GROUPS = [
  {
    name: 'Vendas',
    permissions: [
      { key: Authorizations.READ_VENDA, label: 'Visualizar vendas' },
      { key: Authorizations.CREATE_VENDA, label: 'Registrar venda' },
      { key: Authorizations.EDIT_VENDA, label: 'Editar venda' },
      { key: Authorizations.CANCEL_VENDA, label: 'Cancelar venda' },
    ],
  },
  {
    name: 'Veículos',
    permissions: [
      { key: Authorizations.READ_VEHICLE, label: 'Visualizar estoque' },
      { key: Authorizations.CREATE_VEHICLE, label: 'Cadastrar veículos' },
      { key: Authorizations.EDIT_VEHICLE, label: 'Editar veículos' },
      { key: Authorizations.DELETE_VEHICLE, label: 'Excluir veículos' },
      { key: Authorizations.READ_VEHICLE_PURCHASE_PRICE, label: 'Ver preço de compra' },
      { key: Authorizations.READ_VEHICLE_PROFIT, label: 'Ver lucro/margem' },
    ],
  },
  {
    name: 'Clientes e Pessoas',
    permissions: [
      { key: Authorizations.READ_PERSON, label: 'Visualizar pessoas' },
      { key: Authorizations.READ_PERSON_OTHERS, label: 'Visualizar pessoas da rede' },
      { key: Authorizations.CREATE_PERSON, label: 'Cadastrar pessoas' },
      { key: Authorizations.EDIT_PERSON, label: 'Editar pessoas' },
      { key: Authorizations.DELETE_PERSON, label: 'Excluir pessoas' },
    ],
  },
  {
    name: 'Notas Fiscais (NFe)',
    permissions: [
      { key: Authorizations.READ_NFE, label: 'Visualizar NFes' },
      { key: Authorizations.CREATE_NFE, label: 'Gerar NFes' },
      { key: Authorizations.EMITIR_NFE, label: 'Emitir para a Focus' },
      { key: Authorizations.CANCEL_NFE, label: 'Cancelar NFes' },
    ],
  },
  {
    name: 'Configurações de Loja',
    permissions: [
      { key: Authorizations.READ_STORE, label: 'Visualizar dados da loja' },
      { key: Authorizations.READ_STORE_OTHERS, label: 'Visualizar dados da rede' },
      { key: Authorizations.EDIT_STORE, label: 'Configurar loja/filiais' },
      { key: Authorizations.SYNC_FOCUSNFE, label: 'Sincronizar Focus NFe' },
    ],
  },
  {
    name: 'Usuários do Sistema',
    permissions: [
      { key: Authorizations.READ_USER, label: 'Ver próprio perfil' },
      { key: Authorizations.READ_USER_OTHERS, label: 'Visualizar outros usuários' },
      { key: Authorizations.CREATE_USER, label: 'Criar usuários' },
      { key: Authorizations.EDIT_USER, label: 'Editar próprio perfil' },
      { key: Authorizations.EDIT_USER_OTHERS, label: 'Editar outros usuários' },
      { key: Authorizations.DELETE_USER, label: 'Excluir usuários' },
    ],
  },
];

// Presets de autorização por perfil
const PRESET_GERENTE: string[] = [
  Authorizations.READ_STORE, Authorizations.READ_STORE_OTHERS,
  Authorizations.READ_USER, Authorizations.READ_USER_OTHERS, Authorizations.CREATE_USER,
  Authorizations.EDIT_USER, Authorizations.EDIT_USER_OTHERS, Authorizations.DELETE_USER,
  Authorizations.READ_PERSON, Authorizations.READ_PERSON_OTHERS, Authorizations.CREATE_PERSON,
  Authorizations.EDIT_PERSON, Authorizations.DELETE_PERSON,
  Authorizations.READ_VEHICLE, Authorizations.CREATE_VEHICLE, Authorizations.EDIT_VEHICLE,
  Authorizations.DELETE_VEHICLE, Authorizations.READ_VEHICLE_PURCHASE_PRICE, Authorizations.READ_VEHICLE_PROFIT,
  Authorizations.READ_NFE, Authorizations.CREATE_NFE, Authorizations.EMITIR_NFE, Authorizations.CANCEL_NFE,
  Authorizations.READ_VENDA, Authorizations.CREATE_VENDA, Authorizations.EDIT_VENDA, Authorizations.CANCEL_VENDA,
  Authorizations.SYNC_FOCUSNFE,
];

const PRESET_VENDEDOR: string[] = [
  Authorizations.READ_STORE, Authorizations.READ_STORE_OTHERS,
  Authorizations.READ_USER, Authorizations.EDIT_USER,
  Authorizations.READ_PERSON, Authorizations.CREATE_PERSON, Authorizations.EDIT_PERSON,
  Authorizations.READ_VEHICLE,
  Authorizations.READ_VENDA, Authorizations.CREATE_VENDA,
];

@Component({
  selector: 'app-store-employees-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatDividerModule,
    MatTooltipModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatMenuModule,
  ],
  templateUrl: './store-employees-dialog.component.html',
  styleUrls: ['./store-employees-dialog.component.scss'],
})
export class StoreEmployeesDialogComponent implements OnInit {
  employees: Person[] = [];
  loading = true;
  error = false;

  // Formulário embutido para criar acesso (ativo quando expandindo um funcionário sem acesso)
  createAccessForms: Map<string, FormGroup> = new Map();
  creatingAccessFor: string | null = null; // personId com form expandido
  savingAccessFor: string | null = null;   // personId sendo salvo
  revokingAccessFor: string | null = null; // personId com revogação em andamento
  updatingRelationshipFor: string | null = null; // personId mudando cargo

  // Busca de novas pessoas
  personSearchControl = new FormControl('');
  searchPeopleResults: Person[] = [];
  searchingPeople = false;

  readonly authGroups = AUTH_GROUPS;
  RelationshipTypes = RelationshipTypes;

  constructor(
    private employeeService: EmployeeService,
    private personService: PersonService,
    private authService: AuthService,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private toastr: ToastrService,
    public dialogRef: MatDialogRef<StoreEmployeesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: StoreEmployeesDialogData
  ) {}

  ngOnInit(): void {
    this.loadEmployees();
    this.setupPersonSearch();
  }

  private setupPersonSearch(): void {
    this.personSearchControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(value => {
        if (!value || value.length < 3) {
          this.searchPeopleResults = [];
          return of(null);
        }
        this.searchingPeople = true;
        return this.personService.getPaginatedData(0, 10, {
          search: value,
          storeId: this.data.store.storeId,
          includeInactive: true
        }).pipe(
          finalize(() => this.searchingPeople = false)
        );
      })
    ).subscribe({
      next: (response) => {
        if (response) {
          // Filtra pessoas que já estão na lista de funcionários
          const employeeIds = new Set(this.employees.map(e => e.personId));
          this.searchPeopleResults = response.content.filter(p => !employeeIds.has(p.personId));
        }
      },
      error: (err) => {
        console.error('Erro na busca de pessoas:', err);
        this.toastr.error('Erro ao pesquisar pessoas.');
      }
    });
  }

  selectPersonToPromote(person: Person): void {
    this.searchPeopleResults = [];
    this.personSearchControl.setValue('', { emitEvent: false });

    // Se a pessoa já está na lista (mas por algum motivo apareceu na busca), ignora
    if (this.employees.some(e => e.personId === person.personId)) {
      return;
    }

    // Se for CLIENTE, sugere VENDEDOR por padrão para o fluxo de promoção
    if (person.relationship === RelationshipTypes.CLIENTE) {
      person.relationship = RelationshipTypes.VENDEDOR;
    }

    // Adiciona a pessoa temporariamente à lista para permitir criar acesso
    this.employees.unshift(person);

    // Abre o formulário de criação de acesso automaticamente
    setTimeout(() => this.toggleCreateAccess(person));
  }

  get isRootAdmin(): boolean {
    return this.authService.hasAuthority(Authorizations.ROOT_ADMIN);
  }

  get canManageAccess(): boolean {
    return this.authService.hasAuthority(Authorizations.CREATE_USER) ||
      this.authService.hasAuthority(Authorizations.EDIT_STORE) ||
      this.isRootAdmin;
  }

  loadEmployees(): void {
    this.loading = true;
    this.error = false;

    const params = {
      storeId: this.data.store.storeId,
      includeInactive: true,
    };

    this.employeeService.getPaginatedEmployees(0, 100, params).subscribe({
      next: (response) => {
        this.employees = response.content;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar funcionários:', err);
        this.error = true;
        this.loading = false;
      },
    });
  }

  getRelationshipLabel(rel: RelationshipTypes | string): string {
    const labels: Record<string, string> = {
      GERENTE: 'Gerente',
      VENDEDOR: 'Vendedor',
      PROPRIETARIO: 'Proprietário',
      CLIENTE: 'Cliente',
    };
    return labels[rel] || rel;
  }

  // ─────────────────────────────────────────
  // CRIAÇÃO DE ACESSO
  // ─────────────────────────────────────────

  toggleCreateAccess(person: Person): void {
    const id = person.personId;
    if (this.creatingAccessFor === id) {
      // Fecha o formulário
      this.creatingAccessFor = null;
      return;
    }

    // Cria o form e aplica preset baseado no perfil da pessoa
    const form = this.fb.group(
      {
        username: ['', [Validators.required, Validators.minLength(3)]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
        authorizations: this.fb.array<string>([]),
      },
      { validators: this.passwordMatchValidator }
    );

    this.createAccessForms.set(id, form);
    this.creatingAccessFor = id;

    // Aplica presets conforme o perfil
    setTimeout(() => this.applyPreset(person, form));
  }

  private passwordMatchValidator(control: any) {
    const pw = control.get('password');
    const cpw = control.get('confirmPassword');
    if (!pw || !cpw) return null;
    if (pw.value !== cpw.value) {
      cpw.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  private applyPreset(person: Person, form: FormGroup): void {
    const authArray = form.get('authorizations') as FormArray;
    authArray.clear();

    let defaults: string[] = [];
    if (person.relationship === RelationshipTypes.GERENTE) {
      defaults = PRESET_GERENTE;
    } else if (person.relationship === RelationshipTypes.VENDEDOR) {
      defaults = PRESET_VENDEDOR;
    }

    defaults.forEach(auth => authArray.push(new FormControl(auth)));
  }

  getForm(personId: string): FormGroup {
    return this.createAccessForms.get(personId)!;
  }

  isAuthorized(personId: string, key: string): boolean {
    const form = this.createAccessForms.get(personId);
    if (!form) return false;
    const arr = form.get('authorizations') as FormArray;
    return arr.value.includes(key);
  }

  togglePermission(personId: string, key: string): void {
    const form = this.createAccessForms.get(personId);
    if (!form) return;
    const arr = form.get('authorizations') as FormArray;
    const idx = arr.value.indexOf(key);
    if (idx === -1) {
      arr.push(new FormControl(key));
    } else {
      arr.removeAt(idx);
    }
  }

  saveAccess(person: Person): void {
    const form = this.createAccessForms.get(person.personId);
    if (!form || form.invalid) {
      form?.markAllAsTouched();
      return;
    }

    this.savingAccessFor = person.personId;

    const payload = {
      username: form.value.username,
      password: form.value.password,
      relationship: person.relationship,
      authorizations: form.value.authorizations as string[],
    };

    this.employeeService.createUserForPerson(person.personId, payload).subscribe({
      next: () => {
        this.toastr.success(`Acesso criado para ${person.name}!`);
        this.savingAccessFor = null;
        this.creatingAccessFor = null;
        this.createAccessForms.delete(person.personId);
        this.loadEmployees(); // Recarrega lista para atualizar hasUser
      },
      error: (err) => {
        console.error('Erro ao criar acesso:', err);
        const msg = err.error?.message || err.error || 'Erro ao criar acesso';
        this.toastr.error(typeof msg === 'string' ? msg : 'Erro ao criar acesso');
        this.savingAccessFor = null;
      },
    });
  }

  // ─────────────────────────────────────────
  // REVOGAR ACESSO
  // ─────────────────────────────────────────

  revokeAccess(person: Person): void {
    if (!person.user?.userId && !person.userId) {
      this.toastr.warning('Usuário não encontrado para revogar.');
      return;
    }

    const userId = person.user?.userId ?? person.userId!;
    const confirmed = confirm(
      `Tem certeza que deseja remover o acesso ao sistema de "${person.name}"?\n\nA pessoa continuará cadastrada, mas não poderá mais fazer login.`
    );
    if (!confirmed) return;

    this.revokingAccessFor = person.personId;

    this.employeeService.unlinkUser(userId).subscribe({
      next: () => {
        this.toastr.success(`Acesso de ${person.name} revogado com sucesso.`);
        this.revokingAccessFor = null;
        this.loadEmployees();
      },
      error: (err) => {
        console.error('Erro ao revogar acesso:', err);
        const msg = err.error?.message || err.error || 'Erro ao revogar acesso';
        this.toastr.error(typeof msg === 'string' ? msg : 'Erro ao revogar acesso');
        this.revokingAccessFor = null;
      },
    });
  }

  // ─────────────────────────────────────────
  // ALTERAÇÃO DE CARGO (RELATIONSHIP)
  // ─────────────────────────────────────────

  changeRelationship(person: Person, newType: RelationshipTypes): void {
    if (person.relationship === newType) return;

    // Se a pessoa ainda não tem usuário (está no fluxo de promoção), apenas altera localmente
    // e atualiza os presets do form se estiver aberto.
    if (!person.hasUser) {
      person.relationship = newType;
      const form = this.createAccessForms.get(person.personId);
      if (form) {
        this.applyPreset(person, form);
      }
      return;
    }

    this.updatingRelationshipFor = person.personId;

    this.employeeService.updateRelationship(person.personId, newType).subscribe({
      next: () => {
        this.toastr.success(`Cargo de ${person.name} alterado para ${this.getRelationshipLabel(newType)}`);
        this.updatingRelationshipFor = null;
        this.loadEmployees();
      },
      error: (err) => {
        console.error('Erro ao alterar cargo:', err);
        const msg = err.error?.message || err.error || 'Erro ao alterar cargo';
        this.toastr.error(typeof msg === 'string' ? msg : 'Erro ao alterar cargo');
        this.updatingRelationshipFor = null;
      },
    });
  }

  // ─────────────────────────────────────────
  // PERMISSÕES (dialog existente)
  // ─────────────────────────────────────────

  openAuthorizationsDialog(person: Person): void {
    const dialogRef = this.dialog.open(EmployeeAuthorizationsDialogComponent, {
      width: '600px',
      data: {
        person,
        store: this.data.store,
      },
    });

    dialogRef.afterClosed().subscribe((changed) => {
      if (changed) {
        this.loadEmployees();
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
