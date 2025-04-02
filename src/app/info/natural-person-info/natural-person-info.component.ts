import { ToastrService } from 'ngx-toastr';

import { EventType } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';

import { DialogComponent } from '@components/dialog/dialog.component';
import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';

import type { Person } from '@interfaces/person';

import { PersonService } from '@services/person.service';

@Component({
  selector: 'app-natural-person-info',
  imports: [MatButtonModule, MatCardModule, WrapperCardComponent],
  templateUrl: './natural-person-info.component.html',
  styleUrl: './natural-person-info.component.scss',
})
export class NaturalPersonInfoComponent {
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
    const dialogRef: MatDialogRef<DialogComponent> = this.dialog.open(
      DialogComponent,
      {
        data: {
          title: 'Confirmar Exclusão',
          message:
            'Você tem certeza que deseja <strong>excluir</strong> este registro?',
          confirmText: 'Sim',
          cancelText: 'Não',
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
    if (this.person.id) {
      this.personService.delete(this.person.id).subscribe({
        next: (response) => {
          console.log('Exclusão bem-sucedida', response);
          this.toastrService.success('Exclusão bem-sucedida');
          this.formSubmitted.emit();
        },
        error: (error) => {
          console.error('Erro ao excluir cliente', error);
          this.toastrService.error('Erro ao excluir cliente');
        },
      });
    } else {
      console.error('ID não encontrado para exclusão');
      this.toastrService.error('ID não encontrado para exclusão');
    }
  }
}
