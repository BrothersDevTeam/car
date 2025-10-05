import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

import { AddressCardComponent } from '../address-card/address-card.component';
import { AddressFormComponent } from '../address-form/address-form.component';
import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';

import { AddressService } from '@services/address.service';
import { Address } from '@interfaces/address';

@Component({
  selector: 'app-address-list',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    AddressCardComponent,
    AddressFormComponent,
  ],
  templateUrl: './address-list.component.html',
  styleUrl: './address-list.component.scss'
})
export class AddressListComponent implements OnInit, OnChanges {
  @Input() personId!: string;
  @Input() canEdit = true;
  @Input() canDelete = true;
  @Input() canAdd = true;

  addresses: Address[] = [];
  loading = false;
  showForm = false;
  editingAddress: Address | null = null;

  constructor(
    private addressService: AddressService,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    if (this.personId) {
      this.loadAddresses();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['personId'] && !changes['personId'].firstChange) {
      this.loadAddresses();
    }
  }

  loadAddresses() {
    this.loading = true;
    this.addressService.getByPersonId(this.personId).subscribe({
      next: (addresses) => {
        this.addresses = this.addressService.sortAddresses(addresses);
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar endereços:', err);
        this.toastr.error('Erro ao carregar endereços');
        this.loading = false;
      }
    });
  }

  onAddNew() {
    this.editingAddress = null;
    this.showForm = true;
  }

  onEdit(address: Address) {
    this.editingAddress = address;
    this.showForm = true;
  }

  onDelete(address: Address) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirmar Exclusão',
        message: `Tem certeza que deseja excluir o endereço ${address.street}, ${address.number}?`,
        confirmText: 'Excluir',
        cancelText: 'Cancelar'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.addressService.delete(address.addressId!).subscribe({
          next: () => {
            this.toastr.success('Endereço excluído com sucesso');
            this.loadAddresses();
          },
          error: (err) => {
            console.error('Erro ao excluir:', err);
            this.toastr.error('Erro ao excluir endereço');
          }
        });
      }
    });
  }

  onSetMain(address: Address) {
    this.addressService.setMainAddress(address.addressId!).subscribe({
      next: () => {
        this.toastr.success('Endereço principal atualizado');
        this.loadAddresses();
      },
      error: (err) => {
        console.error('Erro ao definir principal:', err);
        this.toastr.error('Erro ao definir endereço principal');
      }
    });
  }

  onFormSubmitted() {
    this.showForm = false;
    this.editingAddress = null;
    this.loadAddresses();
  }

  onFormCancelled() {
    this.showForm = false;
    this.editingAddress = null;
  }

  get hasMainAddress(): boolean {
    return this.addressService.hasMainAddress(this.addresses);
  }

  get addressCount(): number {
    return this.addresses.length;
  }
}
