import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { Person } from '@interfaces/person';
import { Store } from '@interfaces/store';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '@services/auth/auth.service';
import { Authorizations } from '@enums/authorizations';

export interface EmployeeAuthorizationsDialogData {
  person: Person;
  store: Store;
}

interface Authorization {
  key: string;
  label: string;
}

interface ModuleAuthorizations {
  module: string;
  authorizations: Authorization[];
}

@Component({
  selector: 'app-employee-authorizations-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  templateUrl: './employee-authorizations-dialog.component.html',
  styleUrls: ['./employee-authorizations-dialog.component.scss'],
})
export class EmployeeAuthorizationsDialogComponent implements OnInit {
  modules: ModuleAuthorizations[] = [];
  selectedAuths = new Set<string>();
  loading = true;
  saving = false;
  otherEmployees: Person[] = [];

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    public dialogRef: MatDialogRef<EmployeeAuthorizationsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EmployeeAuthorizationsDialogData,
  ) {}

  getTranslatedModule(moduleStr: string): string {
    const translations: Record<string, string> = {
      VENDA: 'Vendas',
      VEHICLE: 'Veículos',
      PERSON: 'Clientes',
      STORE: 'Configurações de Loja',
      NFE: 'Notas Fiscais (NFe)',
      USER: 'Usuários do Sistema',
      AUTH: 'Controle de Permissões',
    };
    return translations[moduleStr] || moduleStr;
  }

  onToggleAuth(key: string): void {
    if (this.selectedAuths.has(key)) {
      this.selectedAuths.delete(key);
    } else {
      this.selectedAuths.add(key);
    }
  }

  isAllModuleSelected(module: any): boolean {
    return module.authorizations.every((auth: any) => this.selectedAuths.has(auth.key));
  }

  isSomeModuleSelected(module: any): boolean {
    const checkedCount = module.authorizations.filter((auth: any) => this.selectedAuths.has(auth.key)).length;
    return checkedCount > 0 && checkedCount < module.authorizations.length;
  }

  toggleAllModule(module: any, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    module.authorizations.forEach((auth: any) => {
      if (checked) {
        this.selectedAuths.add(auth.key);
      } else {
        this.selectedAuths.delete(auth.key);
      }
    });
  }

  ngOnInit(): void {
    this.loadAuthorizations();
    this.loadOtherEmployees();
  }

  loadAuthorizations(): void {
    // 1. Carrega o mapa de permissões disponíveis no sistema
    this.http.get<Record<string, Authorization[]>>('/api/authorizations').subscribe({
      next: (response) => {
        const isRoot = this.authService.hasAuthority(Authorizations.ROOT_ADMIN);
        const rootOnlyKeys = [Authorizations.ROOT_ADMIN];

        const moduleOrder = ['VENDA', 'VEHICLE', 'PERSON', 'NFE', 'STORE', 'USER', 'AUTH'];

        this.modules = Object.keys(response)
          .map((module) => {
            let auths = response[module];
            if (!isRoot) {
              auths = auths.filter((a) => !rootOnlyKeys.includes(a.key as Authorizations));
            }
            return {
              module,
              authorizations: auths,
            };
          })
          .filter((m) => m.authorizations.length > 0)
          .sort((a, b) => moduleOrder.indexOf(a.module) - moduleOrder.indexOf(b.module));

        // 2. Carrega as permissões atuais do usuário (apenas se for necessário)
        this.http
          .get<{ authorizations: string[] }>(`/api/persons/${this.data.person.personId}/authorizations`)
          .subscribe({
            next: (userAuths) => {
              if (userAuths && userAuths.authorizations) {
                userAuths.authorizations.forEach((auth) => this.selectedAuths.add(auth));
              }
              this.loading = false;
            },
            error: (err) => {
              console.error('Failed to load user authorizations', err);
              this.snackBar.open('Erro ao carregar permissões atuais do funcionário.', 'Fechar', { duration: 3000 });
              this.loading = false;
            },
          });
      },
      error: (err) => {
        console.error('Failed to load authorizations map', err);
        this.snackBar.open('Erro ao carregar lista de permissões disponíveis.', 'Fechar', { duration: 3000 });
        this.loading = false;
      },
    });
  }

  hasAuth(key: string): boolean {
    return this.selectedAuths.has(key);
  }

  save(): void {
    this.saving = true;
    const authsArray = Array.from(this.selectedAuths);

    this.http.put(`/api/employees/${this.data.person.personId}/authorizations`, authsArray).subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open('Permissões atualizadas com sucesso!', 'Fechar', {
          duration: 3000,
        });
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error(err);
        this.saving = false;
        this.snackBar.open(err.error?.message || 'Erro ao salvar permissões', 'Fechar', { duration: 3000 });
      },
    });
  }

  loadOtherEmployees(): void {
    const storeId = this.data.store?.storeId;
    if (!storeId) return;

    this.http.get<{ content: Person[] }>(`/api/persons/employees?storeId=${storeId}&size=100`).subscribe({
      next: (response) => {
        if (response && response.content) {
          const list = response.content.filter(
            (e) =>
              e.personId !== this.data.person.personId &&
              e.hasUser &&
              e.relationship?.name?.toUpperCase() !== 'PROPRIETARIO',
          );
          this.otherEmployees = list;

          // Carrega em background as permissões para cada um
          list.forEach((emp) => {
            this.http.get<{ authorizations: string[] }>(`/api/persons/${emp.personId}/authorizations`).subscribe({
              next: (res) => {
                if (res && res.authorizations) {
                  emp.authorizations = res.authorizations;
                }
              },
              error: (err) => console.error(err),
            });
          });
        }
      },
      error: (err) => console.error('Erro ao carregar equipe para cópia:', err),
    });
  }

  copyPermissionsFrom(sourcePerson: Person): void {
    if (!sourcePerson.authorizations) return;
    this.selectedAuths.clear();
    sourcePerson.authorizations.forEach((auth) => this.selectedAuths.add(auth));
    this.snackBar.open(`Permissões copiadas com sucesso de ${sourcePerson.name}!`, 'Fechar', { duration: 3000 });
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

  close(): void {
    this.dialogRef.close(false);
  }
}
