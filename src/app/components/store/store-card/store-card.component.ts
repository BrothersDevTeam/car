import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Store } from '@interfaces/store';
import {
  StoreType,
  StoreStatus,
  StoreTypeLabels,
  StoreTypeIcons,
  StoreStatusLabels,
  StoreStatusIcons,
  StoreStatusColors,
} from '../../../enums/storeTypes';

@Component({
  selector: 'app-store-card',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './store-card.component.html',
  styleUrl: './store-card.component.scss',
})
export class StoreCardComponent {
  @Input() store!: Store;
  @Input() canEdit = true;
  @Input() canDelete = false;
  @Input() canViewBranches = false;
  @Input() canManageOwner = false;
  @Input() canUploadImage = true;
  @Input() isHighlighted = false;
  @Input() showFullDetails = false;
  @Input() compactMode = false;

  @Output() edit = new EventEmitter<Store>();
  @Output() delete = new EventEmitter<Store>();
  @Output() viewBranches = new EventEmitter<Store>();
  @Output() manageOwner = new EventEmitter<Store>();
  @Output() uploadImage = new EventEmitter<Store>();
  @Output() viewDetails = new EventEmitter<Store>();

  StoreType = StoreType;
  StoreStatus = StoreStatus;

  get typeLabel(): string {
    return StoreTypeLabels[this.store.storeType];
  }
  get typeIcon(): string {
    return StoreTypeIcons[this.store.storeType];
  }
  get statusLabel(): string {
    return StoreStatusLabels[this.store.storeStatus];
  }
  get statusIcon(): string {
    return StoreStatusIcons[this.store.storeStatus];
  }
  get statusColor(): string {
    return StoreStatusColors[this.store.storeStatus];
  }

  get formattedCnpj(): string {
    if (!this.store.cnpj) return '';
    const cnpj = this.store.cnpj.replace(/\D/g, '');
    if (cnpj.length !== 14) return this.store.cnpj;
    return cnpj.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    );
  }

  get formattedPhone(): string {
    if (!this.store.phone) return '';
    const phone = this.store.phone.replace(/\D/g, '');
    if (phone.length === 11)
      return phone.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    if (phone.length === 10)
      return phone.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    return this.store.phone;
  }

  get displayName(): string {
    return this.store.tradeName || this.store.name;
  }
  get hasValidImage(): boolean {
    return !!this.store.imageUrl && this.store.imageUrl.length > 0;
  }
  get isMainStore(): boolean {
    return this.store.storeType === StoreType.MATRIZ;
  }
  get isBranchStore(): boolean {
    return this.store.storeType === StoreType.BRANCH;
  }
  get isActive(): boolean {
    return this.store.storeStatus === StoreStatus.ACTIVE;
  }
  get shouldShowViewBranches(): boolean {
    return this.canViewBranches && this.isMainStore;
  }

  onEdit(): void {
    this.edit.emit(this.store);
  }
  onDelete(): void {
    this.delete.emit(this.store);
  }
  onViewBranches(): void {
    this.viewBranches.emit(this.store);
  }
  onManageOwner(): void {
    this.manageOwner.emit(this.store);
  }
  onUploadImage(): void {
    this.uploadImage.emit(this.store);
  }
  onViewDetails(): void {
    this.viewDetails.emit(this.store);
  }

  getRegimeTributarioLabel(crt: string | undefined): string {
    if (!crt) return 'Não informado';
    const regimes: Record<string, string> = {
      '1': 'Simples Nacional',
      '2': 'Simples Nacional - Excesso',
      '3': 'Regime Normal',
    };
    return regimes[crt] || crt;
  }

  getOwnerName(owner: string | any): string {
    if (!owner) return 'Não definido';
    if (typeof owner === 'object' && owner.name) return owner.name;
    if (typeof owner === 'string') return 'Proprietário cadastrado';
    return 'Não definido';
  }
}
