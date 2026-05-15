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
  ],
  templateUrl: './employee-authorizations-dialog.component.html',
  styleUrls: ['./employee-authorizations-dialog.component.scss'],
})
export class EmployeeAuthorizationsDialogComponent implements OnInit {
  modules: ModuleAuthorizations[] = [];
  selectedAuths = new Set<string>();
  loading = true;
  saving = false;

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    public dialogRef: MatDialogRef<EmployeeAuthorizationsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EmployeeAuthorizationsDialogData,
  ) {}

  getTranslatedModule(moduleStr: string): string {
    const translations: Record<string, string> = {
      VEHICLE: 'Veículo',
      PERSON: 'Pessoa',
      STORE: 'Loja',
      NFE: 'Notas Fiscais',
      USER: 'Usuário',
      AUTH: 'Autorizações',
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

  ngOnInit(): void {
    this.loadAuthorizations();
  }

  loadAuthorizations(): void {
    // 1. Carrega o mapa de permissões disponíveis no sistema
    this.http.get<Record<string, Authorization[]>>('/api/authorizations').subscribe({
      next: (response) => {
        const isRoot = this.authService.hasAuthority(Authorizations.ROOT_ADMIN);
        const rootOnlyKeys = [Authorizations.ROOT_ADMIN];

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
          .filter((m) => m.authorizations.length > 0);

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

  close(): void {
    this.dialogRef.close(false);
  }
}
