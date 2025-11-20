import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Store } from '@interfaces/store';
import { Person } from '@interfaces/person';
import { PersonService } from '@services/person.service';

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
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './store-owner-dialog.component.html',
  styleUrls: ['./store-owner-dialog.component.scss'],
})
export class StoreOwnerDialogComponent implements OnInit {
  ownerForm!: FormGroup;
  persons: Person[] = [];
  loading = true;
  error = false;

  constructor(
    private fb: FormBuilder,
    private personService: PersonService,
    public dialogRef: MatDialogRef<StoreOwnerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: StoreOwnerDialogData
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadPersons();
  }

  private initForm(): void {
    this.ownerForm = this.fb.group({
      personId: ['', Validators.required]
    });
  }

  private loadPersons(): void {
    this.loading = true;
    this.error = false;

    console.log('🔍 Buscando pessoas da loja:', this.data.store.storeId, '- Nome:', this.data.store.name);

    this.personService.getPaginatedData(0, 100, {
      storeId: this.data.store.storeId
    }).subscribe({
      next: (response) => {
        console.log('✅ Pessoas encontradas:', response.content.length, response.content);
        this.persons = response.content;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar pessoas:', err);
        this.error = true;
        this.loading = false;
      }
    });
  }

  getPersonDisplay(person: Person): string {
    const type = person.legalEntity ? 'CNPJ' : 'CPF';
    const doc = person.legalEntity ? person.cnpj : person.cpf;
    return `${person.name} - ${type}: ${doc}`;
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSubmit(): void {
    if (this.ownerForm.valid) {
      this.dialogRef.close(this.ownerForm.value.personId);
    }
  }
}
