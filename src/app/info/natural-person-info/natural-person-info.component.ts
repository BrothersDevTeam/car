import { Component, EventEmitter, inject, Input, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventType } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';
import { AddressListComponent } from '@components/address/address-list/address-list.component';

import { Person } from '@interfaces/person';
import { PersonService } from '@services/person.service';
import { AuthService } from '@services/auth/auth.service';
import { Authorizations } from '../../enums/authorizations';

@Component({
  selector: 'app-natural-person-info',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    AddressListComponent,
    MatIconModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  templateUrl: './natural-person-info.component.html',
  styleUrl: './natural-person-info.component.scss',
})
export class NaturalPersonInfoComponent implements OnInit {
  readonly dialog = inject(MatDialog);

  @Input() person!: Person;
  @Input() initialAddressDraftId: string | null = null;
  @Output() editEvent = new EventEmitter<EventType>();
  @Output() formSubmitted = new EventEmitter<void>();
  @ViewChild(AddressListComponent) addressList?: AddressListComponent;

  /** Indica se o usuário pode editar a pessoa exibida. */
  canEdit: boolean = false;

  /** Indica se o usuário pode excluir a pessoa exibida. */
  canDelete: boolean = false;

  /** Retorna o componente de formulário ativo (usado pelo drawer para controle de estado). */
  getActiveFormComponent(): any {
    return this.addressList?.addressForm;
  }

  constructor(
    private toastrService: ToastrService,
    private personService: PersonService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.checkPermissions();
  }

  checkPermissions() {
    // Utiliza authorizations granulares: sem dependência de ROLE_
    this.canEdit = this.authService.hasAuthority(Authorizations.EDIT_PERSON);
    this.canDelete = this.authService.hasAuthority(Authorizations.DELETE_PERSON);
  }

  onDelete() {
    this.openDialog();
  }

  openDialog() {
    const dialogRef: MatDialogRef<ConfirmDialogComponent> = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirmar Exclusão',
        message: 'Você tem certeza que deseja <strong>excluir</strong> este registro?',
        confirmText: 'Sim',
        cancelText: 'Não',
      },
    });

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
          const errorMessage = error?.error?.message || error?.message || 'Erro ao excluir pessoa';
          this.toastrService.error(errorMessage);
        },
      });
    } else {
      console.error('ID não encontrado para exclusão');
      this.toastrService.error('ID não encontrado para exclusão');
    }
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }

  getRelationshipIcon(type: string): string {
    const t = type?.toUpperCase();
    if (t === 'CLIENTE') return 'person';
    if (t === 'VENDEDOR') return 'sell';
    if (t === 'GERENTE') return 'manage_accounts';
    if (t === 'PROPRIETARIO') return 'stars';
    return 'account_circle';
  }
}
