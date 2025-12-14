import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';

import { EventType } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';

import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';
import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';
import { AddressListComponent } from '@components/address/address-list/address-list.component';

import type { Person } from '@interfaces/person';

import { PersonService } from '@services/person.service';

@Component({
  selector: 'app-legal-entity-info',
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    WrapperCardComponent,
    AddressListComponent,
  ],
  templateUrl: './legal-entity-info.component.html',
  styleUrl: './legal-entity-info.component.scss',
})
export class LegalEntityInfoComponent {
  readonly dialog = inject(MatDialog);

  @Input() person!: Person;
  @Output() editEvent = new EventEmitter<EventType>();
  @Output() formSubmitted = new EventEmitter<void>();

  constructor(
    private toastrService: ToastrService,
    private personService: PersonService
  ) {}

  onDelete() {
    this.openDialog();
  }

  openDialog() {
    const dialogRef: MatDialogRef<ConfirmDialogComponent> = this.dialog.open(
      ConfirmDialogComponent,
      {
        data: {
          title: 'Confirmar Exclusão',
          message:
            'Tem certeza que deseja <strong>excluir</strong> este registro?',
          confirmText: 'Sim',
          cancelText: 'Nao',
        },
      }
    );

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.deleteConfirmed();
      }
    });
  }

  deleteConfirmed() {
    if (this.person.personId) {
      this.personService.delete(this.person.personId).subscribe({
        next: (response) => {
          console.log('Exclusão bem-sucedida:', response);
          this.toastrService.success('Pessoa excluída com sucesso');
          this.formSubmitted.emit();
        },
        error: (error) => {
          console.error('Erro ao excluir pessoa:', error);
          const errorMessage =
            error?.error?.message || error?.message || 'Erro ao excluir pessoa';
          this.toastrService.error(errorMessage);
        },
      });
    } else {
      console.error('ID não encontrado para exclusão');
      this.toastrService.error('ID não encontrado para exclusão');
    }
  }
}
