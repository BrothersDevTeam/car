import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { Person } from '@interfaces/person';
import { Store } from '@interfaces/store';
import { AuthorizationsSelectorComponent } from '../../authorizations-selector/authorizations-selector.component';

export interface EmployeeAuthorizationsDialogData {
  person: Person;
  store: Store;
}

@Component({
  selector: 'app-employee-authorizations-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    AuthorizationsSelectorComponent,
  ],
  templateUrl: './employee-authorizations-dialog.component.html',
  styleUrls: ['./employee-authorizations-dialog.component.scss'],
})
export class EmployeeAuthorizationsDialogComponent implements OnInit {
  selectedAuths: string[] = [];
  loading = true;
  saving = false;
  otherEmployees: Person[] = [];

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<EmployeeAuthorizationsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EmployeeAuthorizationsDialogData,
  ) {}

  ngOnInit(): void {
    this.loadUserAuthorizations();
    this.loadOtherEmployees();
  }

  loadUserAuthorizations(): void {
    this.http
      .get<{ authorizations: string[] }>(`/api/persons/${this.data.person.personId}/authorizations`)
      .subscribe({
        next: (userAuths) => {
          if (userAuths && userAuths.authorizations) {
            this.selectedAuths = [...userAuths.authorizations];
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load user authorizations', err);
          this.snackBar.open('Erro ao carregar permissões atuais do funcionário.', 'Fechar', { duration: 3000 });
          this.loading = false;
        },
      });
  }

  loadOtherEmployees(): void {
    const storeId = this.data.store?.storeId;
    if (!storeId) return;

    this.http.get<{ content: Person[] }>(`/api/persons/employees?storeId=${storeId}&size=100`).subscribe({
      next: (response) => {
        if (response && response.content) {
          this.otherEmployees = response.content.filter((e) => e.personId !== this.data.person.personId && e.hasUser);
        }
      },
      error: (err) => console.error('Erro ao carregar equipe para cópia:', err),
    });
  }

  onAuthsChanged(newAuths: string[]): void {
    this.selectedAuths = newAuths;
  }

  save(): void {
    this.saving = true;

    this.http.put(`/api/employees/${this.data.person.personId}/authorizations`, this.selectedAuths).subscribe({
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
