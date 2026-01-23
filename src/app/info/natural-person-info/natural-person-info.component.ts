import {
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventType } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';
import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';
import { AddressListComponent } from '@components/address/address-list/address-list.component';
import { UserAccessManagementComponent } from '../../components/user-access-management/user-access-management.component';

import { Person } from '@interfaces/person';
import { PersonService } from '@services/person.service';

@Component({
  selector: 'app-natural-person-info',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    WrapperCardComponent,
    AddressListComponent,
    UserAccessManagementComponent,
  ],
  templateUrl: './natural-person-info.component.html',
  styleUrl: './natural-person-info.component.scss',
})
export class NaturalPersonInfoComponent {
  readonly dialog = inject(MatDialog);

  @Input() person!: Person;
  @Output() editEvent = new EventEmitter<EventType>();
  @Output() formSubmitted = new EventEmitter<void>();
  @ViewChild(AddressListComponent) addressList?: AddressListComponent;

  getActiveFormComponent(): any {
    return this.addressList?.addressForm;
  }

  constructor(
    private toastrService: ToastrService,
    private personService: PersonService
  ) {}

  onDelete() {
    this.openDialog();
  }

  onAccessUpdated() {
    this.formSubmitted.emit(); // Refresh list to get updated data from backend
  }

  openDialog() {
    const dialogRef: MatDialogRef<ConfirmDialogComponent> = this.dialog.open(
      ConfirmDialogComponent,
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
