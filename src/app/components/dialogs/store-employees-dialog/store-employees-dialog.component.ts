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
import { AuthorizationsSelectorComponent } from '../../authorizations-selector/authorizations-selector.component';
import { EmployeeAuthorizationsDialogComponent } from '../employee-authorizations-dialog/employee-authorizations-dialog.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

export interface StoreEmployeesDialogData {
  store: Store;
  isRootAdmin?: boolean;
  targetPersonId?: string;
}

export interface Authorization {
  key: string;
  label: string;
}

export interface ModuleAuthorizations {
  module: string;
  authorizations: Authorization[];
}

// Presets de autorização por perfil
const PRESET_GERENTE: string[] = [
  // ABAS
  Authorizations.TAB_DASHBOARD,
  Authorizations.TAB_STORE,
  Authorizations.TAB_FINANCIAL,
  Authorizations.TAB_PERSON,
  Authorizations.TAB_VEHICLE,
  Authorizations.TAB_COMPRA,
  Authorizations.TAB_VENDA,
  Authorizations.TAB_NFE,
  Authorizations.TAB_REPORT,

  // DASHBOARD
  Authorizations.READ_DASHBOARD_STORE,
  Authorizations.READ_DASHBOARD_NETWORK,

  // STORE
  Authorizations.READ_STORE_SELF,
  Authorizations.READ_STORE_NETWORK,

  // FINANCIAL
  Authorizations.READ_FINANCIAL_STORE,
  Authorizations.READ_FINANCIAL_NETWORK,
  Authorizations.CREATE_FINANCIAL_STORE,
  Authorizations.CREATE_FINANCIAL_NETWORK,
  Authorizations.EDIT_FINANCIAL_STORE,
  Authorizations.EDIT_FINANCIAL_NETWORK,
  Authorizations.DELETE_FINANCIAL_STORE,

  // USER
  Authorizations.READ_USER_SELF,
  Authorizations.READ_USER_STORE,
  Authorizations.CREATE_USER_STORE,
  Authorizations.EDIT_USER_SELF,
  Authorizations.EDIT_USER_STORE,
  Authorizations.DELETE_USER_STORE,
  Authorizations.EDIT_SELLER_AUTH,

  // PERSON
  Authorizations.READ_PERSON_SELF,
  Authorizations.READ_PERSON_STORE,
  Authorizations.READ_PERSON_NETWORK,
  Authorizations.CREATE_PERSON_STORE,
  Authorizations.EDIT_PERSON_SELF,
  Authorizations.EDIT_PERSON_STORE,
  Authorizations.DELETE_PERSON_STORE,

  // VEHICLE
  Authorizations.READ_VEHICLE_STORE,
  Authorizations.READ_VEHICLE_NETWORK,
  Authorizations.CREATE_VEHICLE_STORE,
  Authorizations.EDIT_VEHICLE_STORE,
  Authorizations.READ_VEHICLE_PURCHASE_PRICE,
  Authorizations.READ_VEHICLE_PROFIT,

  // NFE
  Authorizations.READ_NFE_STORE,
  Authorizations.CREATE_NFE_STORE,
  Authorizations.EMITIR_NFE_STORE,
  Authorizations.CANCEL_NFE_STORE,

  // COMPRA
  Authorizations.READ_COMPRA_STORE,
  Authorizations.CREATE_COMPRA_STORE,
  Authorizations.EDIT_COMPRA_STORE,
  Authorizations.CANCEL_COMPRA_STORE,

  // VENDA
  Authorizations.READ_VENDA_STORE,
  Authorizations.CREATE_VENDA_STORE,
  Authorizations.EDIT_VENDA_STORE,
  Authorizations.CANCEL_VENDA_STORE,
];

const PRESET_VENDEDOR: string[] = [
  // ABAS
  Authorizations.TAB_PERSON,
  Authorizations.TAB_VEHICLE,
  Authorizations.TAB_VENDA,
  Authorizations.TAB_NFE,

  // STORE
  Authorizations.READ_STORE_SELF,

  // USER
  Authorizations.READ_USER_SELF,
  Authorizations.EDIT_USER_SELF,

  // PERSON
  Authorizations.READ_PERSON_SELF,
  Authorizations.READ_PERSON_STORE,
  Authorizations.CREATE_PERSON_STORE,
  Authorizations.EDIT_PERSON_SELF,
  Authorizations.EDIT_PERSON_STORE,

  // VEHICLE
  Authorizations.READ_VEHICLE_STORE,
  Authorizations.CREATE_VEHICLE_STORE,
  Authorizations.EDIT_VEHICLE_STORE,

  // NFE
  Authorizations.READ_NFE_STORE,
  Authorizations.CREATE_NFE_STORE,
  Authorizations.EMITIR_NFE_STORE,

  // VENDA
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
    AuthorizationsSelectorComponent,
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

  modules: ModuleAuthorizations[] = [];
  loadingAuthorizations = true;
  RelationshipTypes = RelationshipTypes;

  get currentUserId(): string | null {
    return this.authService.getUserId();
  }

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

  getTranslatedModule(moduleStr: string): string {
    const translations: Record<string, string> = {
      ABAS: 'Abas',
      FINANCIAL: 'Financeiro',
      DASHBOARD: 'Dashboard',
      VENDA: 'Vendas',
      COMPRA: 'Compras',
      VEHICLE: 'Veículos',
      PERSON: 'Pessoas',
      STORE: 'Lojas',
      NFE: 'Notas Fiscais (NFe)',
      USER: 'Usuários do Sistema',
      AUTH: 'Controle de Permissões',
      COBRANCA: 'Cobrança',
    };
    return translations[moduleStr] || moduleStr;
  }

  loadAuthorizations(): void {
    this.http.get<Record<string, Authorization[]>>('/api/authorizations').subscribe({
      next: (response) => {
        const isRoot = this.authService.hasAuthority(Authorizations.ROOT_ADMIN);
        const rootOnlyKeys = [Authorizations.ROOT_ADMIN];

        const moduleOrder = [
          'ABAS',
          'DASHBOARD',
          'STORE',
          'COBRANCA',
          'FINANCIAL',
          'PERSON',
          'VEHICLE',
          'COMPRA',
          'VENDA',
          'NFE',
          'USER',
          'AUTH',
        ];

        this.modules = Object.keys(response)
          .map((module) => {
            let auths = response[module];
            if (!isRoot) {
              auths = auths.filter(
                (a) =>
                  !rootOnlyKeys.includes(a.key as Authorizations) &&
                  this.authService.hasAuthority(a.key as Authorizations),
              );
            }
            return {
              module,
              authorizations: auths,
            };
          })
          .filter((m) => m.authorizations.length > 0)
          .sort((a, b) => moduleOrder.indexOf(a.module) - moduleOrder.indexOf(b.module));

        this.loadingAuthorizations = false;
      },
      error: (err) => {
        console.error('Falha ao carregar permissões', err);
        this.loadingAuthorizations = false;
      },
    });
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

    // Se a pessoa já está na lista (mas por algum motivo apareceu na busca), apenas abre o form
    const existing = this.employees.find((e) => e.personId === person.personId);
    if (existing) {
      setTimeout(() => this.toggleCreateAccess(existing));
      return;
    }

    // Se for CLIENTE ou sem perfil de funcionário, sugere VENDEDOR por padrão para o fluxo de promoção
    const relName = this.getRelationshipName(person.relationship);
    if (!relName || relName === 'CLIENTE') {
      const vendedorRel = this.relationships.find((r) => r.name.toUpperCase() === 'VENDEDOR');
      person.relationship = vendedorRel || ({ name: 'VENDEDOR', relationshipId: '' } as any);
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

        if (this.data.targetPersonId) {
          const target = this.employees.find((e) => e.personId === this.data.targetPersonId);
          if (target) {
            setTimeout(() => this.toggleCreateAccess(target), 150);
          } else {
            this.personService.getById(this.data.targetPersonId).subscribe({
              next: (person) => {
                this.employees.unshift(person);
                setTimeout(() => this.toggleCreateAccess(person), 150);
              },
            });
          }
        }
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

  getRelationshipName(rel: any): string {
    if (!rel) return '';
    const name = typeof rel === 'object' ? rel?.name || '' : rel;
    return (name || '').toUpperCase();
  }

  getRelationshipLabel(rel: any): string {
    if (!rel) return '';
    const relStr = typeof rel === 'object' ? rel?.name || '' : rel;
    const labels: Record<string, string> = {
      GERENTE: 'Gerente',
      VENDEDOR: 'Vendedor',
      PROPRIETARIO: 'Proprietário',
      CLIENTE: 'Cliente',
    };
    return labels[(relStr || '').toUpperCase()] || relStr;
  }

  getForm(personId: string): FormGroup {
    let form = this.createAccessForms.get(personId);
    if (!form) {
      const person = this.employees.find((e) => e.personId === personId);
      form = this.fb.group(
        {
          email: [person?.email || '', [Validators.required, Validators.email]],
          password: ['', [Validators.required, Validators.minLength(6)]],
          confirmPassword: ['', [Validators.required]],
          authorizations: this.fb.array<string>([]),
        },
        { validators: this.passwordMatchValidator },
      );
      if (person) {
        this.applyPreset(person, form);
      }
      this.createAccessForms.set(personId, form);
    }
    return form;
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

    // Garante que o form esteja inicializado e com preset
    const form = this.getForm(id);
    if (person.email && !form.get('email')?.value) {
      form.get('email')?.setValue(person.email);
    }
    this.applyPreset(person, form);

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

  onAuthorizationsChanged(personId: string, newAuths: string[]): void {
    const form = this.getForm(personId);
    const authArray = form.get('authorizations') as FormArray;
    authArray.clear();
    newAuths.forEach((auth) => authArray.push(new FormControl(auth)));
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
      width: '1200px',
      maxWidth: '95vw',
      maxHeight: '92vh',
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
