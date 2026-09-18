import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { CustomSelectComponent, CustomSelectOption } from '@components/custom-select/custom-select.component';
import { VehicleOwnerService } from '@services/vehicle-owner.service';
import { PersonService } from '@services/person.service';
import { StoreContextService } from '@services/store-context.service';
import { Person } from '@interfaces/person';
import { ToastrService } from 'ngx-toastr';

export interface VehicleOwnerDialogData {
  vehicleId: string;
  isFirstOwner?: boolean;
}

@Component({
  selector: 'app-vehicle-owner-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    CustomSelectComponent,
  ],
  templateUrl: './vehicle-owner-dialog.component.html',
  styleUrls: ['./vehicle-owner-dialog.component.scss'],
})
export class VehicleOwnerDialogComponent implements OnInit {
  form!: FormGroup;
  submitting = false;
  persons: CustomSelectOption[] = [];
  loadingPersons = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<VehicleOwnerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: VehicleOwnerDialogData,
    private vehicleOwnerService: VehicleOwnerService,
    private personService: PersonService,
    private storeContextService: StoreContextService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      person: this.fb.group({
        id: ['', Validators.required],
        name: [''],
      }),
      isCurrentOwner: [this.data?.isFirstOwner ?? false],
      observation: [''],
    });

    this.loadPersons();
  }

  get personControl(): FormGroup {
    return this.form.get('person') as FormGroup;
  }

  loadPersons(preSelectPersonId?: string): void {
    this.loadingPersons = true;
    const storeId = this.storeContextService.currentStoreId;
    const params = storeId ? { storeId } : undefined;

    this.personService.getPaginatedData(0, 1000, params).subscribe({
      next: (response) => {
        this.loadingPersons = false;
        this.persons = (response.content || []).map((p) => ({
          id: p.personId,
          name: this.getPersonDisplay(p),
          raw: p,
        }));

        if (preSelectPersonId) {
          const selected = this.persons.find((p) => p.id === preSelectPersonId);
          if (selected) {
            this.personControl.patchValue({
              id: selected.id,
              name: selected.name,
            });
          }
        }
      },
      error: (err) => {
        this.loadingPersons = false;
        console.error('Erro ao carregar pessoas:', err);
        this.toastr.error('Erro ao carregar lista de pessoas');
      },
    });
  }

  getPersonDisplay(person: Person): string {
    if (!person) return '';
    const doc = person.cpf || person.cnpj;
    return doc ? `${person.name} (${doc})` : person.name;
  }

  handleCreateNewPerson(): void {
    this.dialogRef.close({
      createNewPerson: true,
      vehicleId: this.data.vehicleId,
      isCurrentOwner: this.form.get('isCurrentOwner')?.value ?? false,
      observation: this.form.get('observation')?.value || undefined,
    });
  }

  onSubmit(): void {
    const personId = this.personControl.get('id')?.value;
    if (!personId) {
      this.toastr.warning('Por favor, selecione uma pessoa para vincular.', 'Atenção');
      return;
    }

    this.submitting = true;
    const payload = {
      personId,
      isCurrentOwner: this.form.get('isCurrentOwner')?.value || false,
      observation: this.form.get('observation')?.value || undefined,
    };

    this.vehicleOwnerService.addOwner(this.data.vehicleId, payload).subscribe({
      next: (created) => {
        this.toastr.success('Proprietário vinculado com sucesso!', 'Sucesso');
        this.dialogRef.close(created);
      },
      error: (err) => {
        this.submitting = false;
        const msg = err.error?.message || err.error?.[0]?.defaultMessage || 'Erro ao vincular proprietário.';
        this.toastr.error(msg, 'Erro');
      },
    });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
