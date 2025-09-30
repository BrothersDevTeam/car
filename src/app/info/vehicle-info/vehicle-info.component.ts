import { ToastrService } from 'ngx-toastr';
import { EventType } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';

import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';

import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';

import { VehicleForm } from '@interfaces/vehicle';

import { VehicleService } from '@services/vehicle.service';

@Component({
  selector: 'app-vehicle-info',
  imports: [MatButtonModule, MatCardModule, WrapperCardComponent],
  templateUrl: './vehicle-info.component.html',
  styleUrl: './vehicle-info.component.scss',
})
export class VehicleInfoComponent {
  readonly dialog = inject(MatDialog);

  @Input() vehicle!: VehicleForm;
  @Output() editEvent = new EventEmitter<EventType>();
  @Output() formSubmitted = new EventEmitter<void>();

  constructor(
    private toastrService: ToastrService,
    private vehicleService: VehicleService
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
    if (this.vehicle.vehicleId) {
      this.vehicleService.delete(this.vehicle.vehicleId).subscribe({
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
      console.error('ID nao encontrado para exclusao');
      this.toastrService.error('ID nao encontrado para exclusao');
    }
  }
}
