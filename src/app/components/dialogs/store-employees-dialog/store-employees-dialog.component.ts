import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
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
import { MatSelectModule } from '@angular/material/select';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { debounceTime, distinctUntilChanged, switchMap, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

import { EmployeeService } from '@services/employee.service';
import { PersonService } from '@services/person.service';
import { AuthService } from '@services/auth/auth.service';
import { RelationshipService } from '@services/relationship.service';
import { Person } from '@interfaces/person';
import { Store } from '@interfaces/store';
import { RelationshipResponse } from '@interfaces/relationship';
import { Authorizations } from '@enums/authorizations';
import { RelationshipTypes } from '../../../enums/relationshipTypes';
import { EmployeeAuthorizationsDialogComponent } from '../employee-authorizations-dialog/employee-authorizations-dialog.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

export interface StoreEmployeesDialogData {
  store: Store;
  isRootAdmin?: boolean;
}

// Grupos de autorização padrão (mesmos presets do natural-person-form)
const AUTH_GROUPS = [
  {
    name: 'Vendas',
    permissions: [
      { key: Authorizations.READ_VENDA_STORE, label: 'Visualizar vendas (loja)' },
      { key: Authorizations.READ_VENDA_NETWORK, label: 'Visualizar vendas (rede)' },
      { key: Authorizations.CREATE_VENDA_STORE, label: 'Registrar venda (loja)' },
      { key: Authorizations.CREATE_VENDA_NETWORK, label: 'Registrar venda (rede)' },
      { key: Authorizations.EDIT_VENDA_STORE, label: 'Editar venda (loja)' },
      { key: Authorizations.EDIT_VENDA_NETWORK, label: 'Editar venda (rede)' },
      { key: Authorizations.CANCEL_VENDA_STORE, label: 'Cancelar venda (loja)' },
      { key: Authorizations.CANCEL_VENDA_NETWORK, label: 'Cancelar venda (rede)' },
    ],
  },
  {
    name: 'Veículos',
    permissions: [
      { key: Authorizations.READ_VEHICLE_STORE, label: 'Visualizar estoque (loja)' },
      { key: Authorizations.READ_VEHICLE_NETWORK, label: 'Visualizar estoque (rede)' },
      { key: Authorizations.CREATE_VEHICLE_STORE, label: 'Cadastrar veículos (loja)' },
      { key: Authorizations.CREATE_VEHICLE_NETWORK, label: 'Cadastrar veículos (rede)' },
      { key: Authorizations.EDIT_VEHICLE_STORE, label: 'Editar veículos (loja)' },
      { key: Authorizations.EDIT_VEHICLE_NETWORK, label: 'Editar veículos (rede)' },
      { key: Authorizations.DELETE_VEHICLE_STORE, label: 'Excluir veículos (loja)' },
      { key: Authorizations.DELETE_VEHICLE_NETWORK, label: 'Excluir veículos (rede)' },
      { key: Authorizations.READ_VEHICLE_PURCHASE_PRICE, label: 'Ver preço de compra' },
      { key: Authorizations.READ_VEHICLE_PROFIT, label: 'Ver lucro/margem' },
    ],
  },
  {
    name: 'Clientes e Pessoas',
    permissions: [
      { key: Authorizations.READ_PERSON_SELF, label: 'Visualizar próprio registro' },
      { key: Authorizations.READ_PERSON_STORE, label: 'Visualizar pessoas (loja)' },
      { key: Authorizations.READ_PERSON_NETWORK, label: 'Visualizar pessoas (rede)' },
      { key: Authorizations.CREATE_PERSON_STORE, label: 'Cadastrar pessoas (loja)' },
      { key: Authorizations.CREATE_PERSON_NETWORK, label: 'Cadastrar pessoas (rede)' },
      { key: Authorizations.EDIT_PERSON_SELF, label: 'Editar próprio registro' },
      { key: Authorizations.EDIT_PERSON_STORE, label: 'Editar pessoas (loja)' },
      { key: Authorizations.EDIT_PERSON_NETWORK, label: 'Editar pessoas (rede)' },
      { key: Authorizations.DELETE_PERSON_STORE, label: 'Excluir pessoas (loja)' },
      { key: Authorizations.DELETE_PERSON_NETWORK, label: 'Excluir pessoas (rede)' },
    ],
  },
  {
    name: 'Notas Fiscais (NFe)',
    permissions: [
      { key: Authorizations.READ_NFE_STORE, label: 'Visualizar NFes (loja)' },
      { key: Authorizations.READ_NFE_NETWORK, label: 'Visualizar NFes (rede)' },
      { key: Authorizations.CREATE_NFE_STORE, label: 'Gerar NFes (loja)' },
      { key: Authorizations.CREATE_NFE_NETWORK, label: 'Gerar NFes (rede)' },
      { key: Authorizations.EMITIR_NFE_STORE, label: 'Emitir NFes (loja)' },
      { key: Authorizations.EMITIR_NFE_NETWORK, label: 'Emitir NFes (rede)' },
      { key: Authorizations.EDIT_NFE_NETWORK, label: 'Editar NFes (rede)' },
      { key: Authorizations.CANCEL_NFE_STORE, label: 'Cancelar NFes (loja)' },
      { key: Authorizations.CANCEL_NFE_NETWORK, label: 'Cancelar NFes (rede)' },
    ],
  },
  {
    name: 'Configurações de Loja',
    permissions: [
      { key: Authorizations.READ_STORE_SELF, label: 'Visualizar dados (loja)' },
      { key: Authorizations.READ_STORE_NETWORK, label: 'Visualizar dados (rede)' },
      { key: Authorizations.EDIT_STORE_SELF, label: 'Configurar própria loja' },
      { key: Authorizations.EDIT_STORE_NETWORK, label: 'Configurar lojas da rede' },
      { key: Authorizations.SYNC_FOCUSNFE, label: 'Sincronizar Focus NFe' },
    ],
  },
  {
    name: 'Usuários do Sistema',
    permissions: [
      { key: Authorizations.READ_USER_SELF, label: 'Ver próprio perfil' },
      { key: Authorizations.READ_USER_STORE, label: 'Visualizar usuários (loja)' },
      { key: Authorizations.READ_USER_NETWORK, label: 'Visualizar usuários (rede)' },
      { key: Authorizations.CREATE_USER_STORE, label: 'Criar usuários (loja)' },
      { key: Authorizations.CREATE_USER_NETWORK, label: 'Criar usuários (rede)' },
      { key: Authorizations.EDIT_USER_SELF, label: 'Editar próprio perfil' },
      { key: Authorizations.EDIT_USER_STORE, label: 'Editar outros usuários' },
      { key: Authorizations.EDIT_USER_NETWORK, label: 'Editar usuários (rede)' },
      { key: Authorizations.DELETE_USER_STORE, label: 'Excluir usuários (loja)' },
      { key: Authorizations.DELETE_USER_NETWORK, label: 'Excluir usuários (rede)' },
    ],
  },
  {
    name: 'Controle de Permissões',
    permissions: [
      { key: Authorizations.EDIT_MANAGER_AUTH, label: 'Editar permissões de Gerentes' },
      { key: Authorizations.EDIT_SELLER_AUTH, label: 'Editar permissões de Vendedores' },
    ],
  },
];

// Presets de autorização por perfil
const PRESET_GERENTE: string[] = [
  Authorizations.READ_STORE_SELF,
  Authorizations.READ_STORE_NETWORK,
  Authorizations.READ_USER_SELF,
  Authorizations.READ_USER_STORE,
  Authorizations.CREATE_USER_STORE,
  Authorizations.EDIT_USER_SELF,
  Authorizations.EDIT_USER_STORE,
  Authorizations.DELETE_USER_STORE,
  Authorizations.EDIT_SELLER_AUTH,
  Authorizations.READ_PERSON_SELF,
  Authorizations.READ_PERSON_STORE,
  Authorizations.READ_PERSON_NETWORK,
  Authorizations.CREATE_PERSON_STORE,
  Authorizations.EDIT_PERSON_SELF,
  Authorizations.EDIT_PERSON_STORE,
  Authorizations.DELETE_PERSON_STORE,
  Authorizations.READ_VEHICLE_STORE,
  Authorizations.READ_VEHICLE_NETWORK,
  Authorizations.CREATE_VEHICLE_STORE,
  Authorizations.EDIT_VEHICLE_STORE,
  Authorizations.READ_VEHICLE_PURCHASE_PRICE,
  Authorizations.READ_VEHICLE_PROFIT,
  Authorizations.READ_NFE_STORE,
  Authorizations.CREATE_NFE_STORE,
  Authorizations.EMITIR_NFE_STORE,
  Authorizations.CANCEL_NFE_STORE,
  Authorizations.READ_VENDA_STORE,
  Authorizations.CREATE_VENDA_STORE,
  Authorizations.EDIT_VENDA_STORE,
  Authorizations.CANCEL_VENDA_STORE,
];

const PRESET_VENDEDOR: string[] = [
  Authorizations.READ_STORE_SELF,
  Authorizations.READ_USER_SELF,
  Authorizations.EDIT_USER_SELF,
  Authorizations.READ_PERSON_SELF,
  Authorizations.READ_PERSON_STORE,
  Authorizations.CREATE_PERSON_STORE,
  Authorizations.EDIT_PERSON_SELF,
  Authorizations.EDIT_PERSON_STORE,
  Authorizations.READ_VEHICLE_STORE,
  Authorizations.CREATE_VEHICLE_STORE,
  Authorizations.EDIT_VEHICLE_STORE,
  Authorizations.READ_NFE_STORE,
  Authorizations.CREATE_NFE_STORE,
  Authorizations.EMITIR_NFE_STORE,
  Authorizations.READ_VENDA_STORE,
  Authorizations.CREATE_VENDA_STORE,
  Authorizations.EDIT_VENDA_STORE,
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
    MatSelectModule,
  ],
  templateUrl: './store-employees-dialog.component.html',
  styleUrls: ['./store-employees-dialog.component.scss'],
})
export class StoreEmployeesDialogComponent implements OnInit {
  employees: Person[] = [];
  relationships: RelationshipResponse[] = [];
  loading = true;
  error = false;

  // Formulário embutido para criar acesso (ativo quando expandindo um funcionário sem acesso)
  createAccessForms: Map<string, FormGroup> = new Map();
  creatingAccessFor: string | null = null; // personId com form expandido
  savingAccessFor: string | null = null; // personId sendo salvo
  revokingAccessFor: string | null = null; // personId com revogação em andamento
  updatingRelationshipFor: string | null = null; // personId mudando cargo

  // Controle de visibilidade das senhas
  passwordVisible = false;
  confirmPasswordVisible = false;

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
    private relationshipService: RelationshipService,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private http: HttpClient,
    public dialogRef: MatDialogRef<StoreEmployeesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: StoreEmployeesDialogData,
  ) {}

  ngOnInit(): void {
    this.loadEmployees();
    this.loadRelationships();
    this.setupPersonSearch();
  }

  private setupPersonSearch(): void {
    this.personSearchControl.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((value) => {
          if (!value || value.length < 3) {
            this.searchPeopleResults = [];
            return of(null);
          }
          this.searchingPeople = true;
          return this.personService
            .getPaginatedData(0, 10, {
              search: value,
              storeId: this.data.store.storeId,
              includeInactive: true,
            })
            .pipe(finalize(() => (this.searchingPeople = false)));
        }),
      )
      .subscribe({
        next: (response) => {
          if (response) {
            // Filtra pessoas que já estão na lista de funcionários
            const employeeIds = new Set(this.employees.map((e) => e.personId));
            this.searchPeopleResults = response.content.filter((p) => !employeeIds.has(p.personId));
          }
        },
        error: (err) => {
          console.error('Erro na busca de pessoas:', err);
          this.toastr.error('Erro ao pesquisar pessoas.');
        },
      });
  }

  selectPersonToPromote(person: Person): void {
    this.searchPeopleResults = [];
    this.personSearchControl.setValue('', { emitEvent: false });

    // Se a pessoa já está na lista (mas por algum motivo apareceu na busca), ignora
    if (this.employees.some((e) => e.personId === person.personId)) {
      return;
    }

    // Se for CLIENTE, sugere VENDEDOR por padrão para o fluxo de promoção
    const relName = person.relationship?.name?.toUpperCase() || '';
    if (relName === 'CLIENTE') {
      person.relationship = {
        name: 'VENDEDOR',
        relationshipId: '',
      } as any;
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
    return (
      this.authService.hasAuthority(Authorizations.CREATE_USER_STORE) ||
      this.authService.hasAuthority(Authorizations.EDIT_STORE_SELF) ||
      this.isRootAdmin
    );
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

  loadRelationships(): void {
    this.relationshipService.getAll().subscribe({
      next: (data) => {
        // Filtrar PROPRIETARIO para evitar atribuí-lo manualmente a funcionários comuns
        this.relationships = data.filter((r) => r.name.toUpperCase() !== 'PROPRIETARIO');
      },
      error: (err) => {
        console.error('Erro ao carregar relacionamentos:', err);
      },
    });
  }

  getRelationshipLabel(rel: any): string {
    const relStr = typeof rel === 'object' ? rel?.name || '' : rel;
    const labels: Record<string, string> = {
      GERENTE: 'Gerente',
      VENDEDOR: 'Vendedor',
      PROPRIETARIO: 'Proprietário',
      CLIENTE: 'Cliente',
    };
    return labels[relStr.toUpperCase()] || relStr;
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

    this.passwordVisible = false;
    this.confirmPasswordVisible = false;

    // Cria o form e aplica preset baseado no perfil da pessoa
    const form = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
        authorizations: this.fb.array<string>([]),
      },
      { validators: this.passwordMatchValidator },
    );

    this.applyPreset(person, form);

    this.createAccessForms.set(id, form);
    this.creatingAccessFor = id;
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
    const relName = person.relationship?.name?.toUpperCase() || '';
    if (relName === 'GERENTE') {
      defaults = PRESET_GERENTE;
    } else if (relName === 'VENDEDOR') {
      defaults = PRESET_VENDEDOR;
    }

    defaults.forEach((auth) => authArray.push(new FormControl(auth)));
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

  isAllGroupSelected(personId: string, group: any): boolean {
    const form = this.createAccessForms.get(personId);
    if (!form) return false;
    const arr = form.get('authorizations') as FormArray;
    return group.permissions.every((perm: any) => arr.value.includes(perm.key));
  }

  isSomeGroupSelected(personId: string, group: any): boolean {
    const form = this.createAccessForms.get(personId);
    if (!form) return false;
    const arr = form.get('authorizations') as FormArray;
    const checkedCount = group.permissions.filter((perm: any) => arr.value.includes(perm.key)).length;
    return checkedCount > 0 && checkedCount < group.permissions.length;
  }

  toggleAllGroup(personId: string, group: any, event: Event): void {
    const form = this.createAccessForms.get(personId);
    if (!form) return;
    const arr = form.get('authorizations') as FormArray;
    const checked = (event.target as HTMLInputElement).checked;

    group.permissions.forEach((perm: any) => {
      const idx = arr.value.indexOf(perm.key);
      if (checked) {
        if (idx === -1) {
          arr.push(new FormControl(perm.key));
        }
      } else {
        if (idx !== -1) {
          arr.removeAt(idx);
        }
      }
    });
  }

  saveAccess(person: Person): void {
    const form = this.createAccessForms.get(person.personId);
    if (!form || form.invalid) {
      form?.markAllAsTouched();
      return;
    }

    this.savingAccessFor = person.personId;

    const payload = {
      email: form.value.email,
      password: form.value.password,
      relationship: person.relationship?.name?.toUpperCase() || '',
      authorizations: form.value.authorizations as string[],
    };

    this.employeeService.createUserForPerson(person.personId, payload).subscribe({
      next: () => {
        this.toastr.success(`Acesso criado para ${person.name}!`);
        this.savingAccessFor = null;
        this.creatingAccessFor = null;
        this.passwordVisible = false;
        this.confirmPasswordVisible = false;
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

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      disableClose: true,
      data: {
        title: 'Confirmar Revogação de Acesso',
        message: `Tem certeza que deseja remover o acesso ao sistema de <strong>"${person.name}"</strong>?<br><br>A pessoa continuará cadastrada, mas não poderá mais fazer login.`,
        confirmText: 'Sim, Revogar',
        cancelText: 'Cancelar',
        icon: 'person_remove',
        type: 'danger',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
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
    });
  }

  // ─────────────────────────────────────────
  // ALTERAÇÃO DE CARGO (RELATIONSHIP)
  // ─────────────────────────────────────────

  changeRelationship(person: Person, rel: RelationshipResponse): void {
    const currentRelName = person.relationship?.name?.toUpperCase() || '';
    if (currentRelName === rel.name.toUpperCase()) return;

    // Se estiver ativamente no painel de criação de acesso para esta pessoa localmente (e ela não tem usuário),
    // apenas altera localmente e atualiza os presets do formulário aberto em tela.
    if (this.creatingAccessFor === person.personId && !person.hasUser) {
      person.relationship = rel;
      return;
    }

    this.updatingRelationshipFor = person.personId;

    this.employeeService.updateRelationship(person.personId, rel.relationshipId).subscribe({
      next: () => {
        this.toastr.success(`Cargo de ${person.name} alterado para ${this.getRelationshipLabel(rel)}`);
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
      width: '900px',
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

  getEmployeesWithAccess(excludePersonId: string): Person[] {
    return this.employees.filter((e) => e.personId !== excludePersonId && e.hasUser);
  }

  copyPermissions(personId: string, sourcePerson: Person): void {
    const form = this.createAccessForms.get(personId);
    if (!form) return;

    this.http.get<{ authorizations: string[] }>(`/api/persons/${sourcePerson.personId}/authorizations`).subscribe({
      next: (res) => {
        const authArray = form.get('authorizations') as FormArray;
        authArray.clear();

        if (res && res.authorizations) {
          res.authorizations.forEach((auth) => {
            authArray.push(new FormControl(auth));
          });
        }

        this.toastr.success(`Permissões copiadas com sucesso de ${sourcePerson.name}!`);
      },
      error: (err) => {
        console.error('Erro ao buscar permissões para cópia:', err);
        this.toastr.error('Erro ao buscar permissões do funcionário selecionado.');
      },
    });
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  close(): void {
    this.dialogRef.close();
  }
}
