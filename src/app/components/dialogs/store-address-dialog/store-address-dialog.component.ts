import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AddressListComponent } from '../../address/address-list/address-list.component';
import { Store } from '@interfaces/store';

@Component({
  selector: 'app-store-address-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    AddressListComponent,
  ],
  templateUrl: './store-address-dialog.component.html',
  styleUrls: ['./store-address-dialog.component.scss'],
})
export class StoreAddressDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<StoreAddressDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { store: Store }
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}
