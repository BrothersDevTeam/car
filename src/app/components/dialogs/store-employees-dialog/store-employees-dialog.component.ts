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
import { PersonService } from '@services/person.service';
import { Person } from '@interfaces/person';
import { Store } from '@interfaces/store';
import { EmployeeAuthorizationsDialogComponent } from '../employee-authorizations-dialog/employee-authorizations-dialog.component';

export interface StoreEmployeesDialogData {
  store: Store;
}

@Component({
  selector: 'app-store-employees-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatDividerModule,
  ],
  templateUrl: './store-employees-dialog.component.html',
  styleUrls: ['./store-employees-dialog.component.scss'],
})
export class StoreEmployeesDialogComponent implements OnInit {
  employees: Person[] = [];
  loading = true;
  error = false;

  constructor(
    private personService: PersonService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<StoreEmployeesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: StoreEmployeesDialogData
  ) {}

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.loading = true;
    this.error = false;

    // Busca funcionários da loja: proprietários, gerentes e vendedores
    const params = {
      storeId: this.data.store.storeId,
      relationship: ['PROPRIETARIO', 'GERENTE', 'VENDEDOR'],
      includeInactive: true,
    };

    this.personService.getPaginatedData(0, 100, params).subscribe({
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
        // Option to reload if needed
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
