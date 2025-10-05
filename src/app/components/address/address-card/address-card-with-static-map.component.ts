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

  // NOVO: Controla se o mapa está visível
  showMap = false;

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

  get fullAddressForMap(): string {
    const parts = [
      this.address.street,
      this.address.number,
      this.address.neighborhood,
      this.address.city,
      this.address.state,
      'Brasil'
    ].filter(Boolean);
    return parts.join(', ');
  }

  // NOVO: URL para imagem estática do Google Maps
  get staticMapUrl(): string {
    const encodedAddress = encodeURIComponent(this.fullAddressForMap);
    // API de imagem estática - não precisa API key para uso básico
    return `https://maps.googleapis.com/maps/api/staticmap?center=${encodedAddress}&zoom=15&size=600x300&markers=color:red%7C${encodedAddress}&maptype=roadmap`;
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

  openInGoogleMaps() {
    const encodedAddress = encodeURIComponent(this.fullAddressForMap);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    window.open(googleMapsUrl, '_blank');
  }

  // NOVO: Toggle mapa embutido
  toggleMap() {
    this.showMap = !this.showMap;
  }
}
