import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Address } from '@interfaces/address';
import { AddressTypeLabels, AddressTypeIcons } from '../../../enums/addressTypes';
import { AddressService } from '@services/address.service';

@Component({
  selector: 'app-address-card',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './address-card.component.html',
  styleUrl: './address-card.component.scss'
})
export class AddressCardComponent {
  @Input() address!: Address;
  @Input() canEdit = true;
  @Input() canDelete = true;
  @Input() canSetMain = true;

  @Output() edit = new EventEmitter<Address>();
  @Output() delete = new EventEmitter<Address>();
  @Output() setMain = new EventEmitter<Address>();

  constructor(private addressService: AddressService) {}

  get typeLabel(): string {
    return AddressTypeLabels[this.address.addressType];
  }

  get typeIcon(): string {
    return AddressTypeIcons[this.address.addressType];
  }

  get formattedCep(): string {
    return this.addressService.formatCep(this.address.cep);
  }

  get fullAddress(): string {
    const parts = [
      this.address.street,
      this.address.number,
      this.address.complement
    ].filter(Boolean);
    return parts.join(', ');
  }

  get cityState(): string {
    return `${this.address.city}/${this.address.state}`;
  }

  onEdit() {
    this.edit.emit(this.address);
  }

  onDelete() {
    this.delete.emit(this.address);
  }

  onSetMain() {
    this.setMain.emit(this.address);
  }
}
