import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  MatCheckboxChange,
  MatCheckboxModule,
} from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { Person } from '@interfaces/person';
import { Store } from '@interfaces/store';
import { MatDividerModule } from '@angular/material/divider';

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
    public dialogRef: MatDialogRef<EmployeeAuthorizationsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EmployeeAuthorizationsDialogData
  ) {}

  getTranslatedModule(moduleStr: string): string {
    const translations: Record<string, string> = {
      VEHICLE: 'Veículo',
      PERSON: 'Pessoa',
      STORE: 'Loja',
      NFE: 'Notas Fiscais',
      USER: 'Usuário',
    };
    return translations[moduleStr] || moduleStr;
  }

  isModuleAllSelected(module: ModuleAuthorizations): boolean {
    if (!module || !module.authorizations || module.authorizations.length === 0)
      return false;
    return module.authorizations.every((auth) =>
      this.selectedAuths.has(auth.key)
    );
  }

  isModulePartiallySelected(module: ModuleAuthorizations): boolean {
    if (!module || !module.authorizations || module.authorizations.length === 0)
      return false;
    const selectedCount = module.authorizations.filter((auth) =>
      this.selectedAuths.has(auth.key)
    ).length;
    return selectedCount > 0 && selectedCount < module.authorizations.length;
  }

  toggleModuleAuths(
    module: ModuleAuthorizations,
    event: MatCheckboxChange
  ): void {
    if (event.checked) {
      module.authorizations.forEach((auth) => this.selectedAuths.add(auth.key));
    } else {
      module.authorizations.forEach((auth) =>
        this.selectedAuths.delete(auth.key)
      );
    }
  }

  ngOnInit(): void {
    if (this.data.person.authorizations) {
      this.data.person.authorizations.forEach((auth) =>
        this.selectedAuths.add(auth)
      );
    }
    this.loadAuthorizations();
  }

  loadAuthorizations(): void {
    this.http
      .get<Record<string, Authorization[]>>('/api/authorizations')
      .subscribe({
        next: (response) => {
          this.modules = Object.keys(response).map((module) => ({
            module,
            authorizations: response[module],
          }));
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load authorizations', err);
          this.snackBar.open(
            'Erro ao carregar lista de permissões.',
            'Fechar',
            { duration: 3000 }
          );
          this.loading = false;
        },
      });
  }

  onToggleAuth(key: string, event: MatCheckboxChange): void {
    if (event.checked) {
      this.selectedAuths.add(key);
    } else {
      this.selectedAuths.delete(key);
    }
  }

  hasAuth(key: string): boolean {
    return this.selectedAuths.has(key);
  }

  save(): void {
    this.saving = true;
    const authsArray = Array.from(this.selectedAuths);

    this.http
      .put(
        `/api/employees/${this.data.person.personId}/authorizations`,
        authsArray
      )
      .subscribe({
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
          this.snackBar.open(
            err.error?.message || 'Erro ao salvar permissões',
            'Fechar',
            { duration: 3000 }
          );
        },
      });
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
