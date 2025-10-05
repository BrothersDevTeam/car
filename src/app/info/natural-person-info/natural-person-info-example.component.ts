import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';

import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';
import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';
import { AddressListComponent } from '@components/address/address-list/address-list.component';

import { Person } from '@interfaces/person';
import { PersonService } from '@services/person.service';

@Component({
  selector: 'app-natural-person-info-example',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    WrapperCardComponent,
    AddressListComponent, // NOVO: Componente de endereços
  ],
  templateUrl: './natural-person-info-example.component.html',
  styleUrl: './natural-person-info-example.component.scss'
})
export class NaturalPersonInfoExampleComponent {
  @Input() person!: Person;
  @Output() editEvent = new EventEmitter<void>();

  constructor(
    private personService: PersonService,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {}

  onDelete() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirmar Exclusão',
        message: `Tem certeza que deseja excluir ${this.person.name}?`,
        confirmText: 'Excluir',
        cancelText: 'Cancelar'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed && this.person.personId) {
        this.personService.delete(this.person.personId).subscribe({
          next: () => {
            this.toastr.success('Pessoa excluída com sucesso');
          },
          error: () => {
            this.toastr.error('Erro ao excluir pessoa');
          }
        });
      }
    });
  }
}
