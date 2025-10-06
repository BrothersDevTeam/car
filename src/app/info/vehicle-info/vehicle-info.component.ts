import { ToastrService } from 'ngx-toastr';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';

import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';
import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';

import { VehicleForm } from '@interfaces/vehicle';
import { VehicleService } from '@services/vehicle.service';
import { PersonService } from '@services/person.service';
import { Person } from '@interfaces/person';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-vehicle-info',
  imports: [
    MatButtonModule,
    MatCardModule,
    WrapperCardComponent,
    MatIconModule,
  ],
  templateUrl: './vehicle-info.component.html',
  styleUrl: './vehicle-info.component.scss',
})
export class VehicleInfoComponent implements OnChanges {
  readonly dialog = inject(MatDialog);

  proprietario: Person | null = null;

  @Input() vehicle!: VehicleForm;
  @Output() editEvent = new EventEmitter<VehicleForm>();
  @Output() formSubmitted = new EventEmitter<void>();

  constructor(
    private toastrService: ToastrService,
    private vehicleService: VehicleService,
    private personService: PersonService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vehicle'] && this.vehicle?.owner) {
      // Busca o proprietário quando o veículo mudar
      this.personService.getById(this.vehicle.owner).subscribe({
        next: (person) => {
          this.proprietario = person;
        },
        error: (error) => {
          console.error('Erro ao carregar proprietário:', error);
          this.proprietario = null;
        },
      });
    } else {
      this.proprietario = null;
    }
  }

  onEdit() {
    this.editEvent.emit(this.vehicle);
  }

  onDelete() {
    this.openDialog();
  }

  openDialog() {
    const dialogRef: MatDialogRef<ConfirmDialogComponent> = this.dialog.open(
      ConfirmDialogComponent,
      {
        data: {
          title: 'Confirmar exclusão',
          message: `Deseja realmente excluir o veículo <strong>${this.vehicle.plate}</strong>?`,
          confirmText: 'Sim, excluir',
          cancelText: 'Cancelar',
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
          console.error('Erro ao excluir veículo', error);
          this.toastrService.error('Erro ao excluir veículo');
        },
      });
    } else {
      console.error('ID nao encontrado para exclusao');
      this.toastrService.error('ID nao encontrado para exclusao');
    }
  }
}
