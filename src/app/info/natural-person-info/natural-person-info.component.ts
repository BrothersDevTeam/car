import { ToastrService } from 'ngx-toastr';
import { EventType } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { PersonService } from '@services/person.service';
import { GenericClient, Person } from '@interfaces/person';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DialogComponent } from '@components/dialog/dialog.component';
import { Component, EventEmitter, inject, Input, Output, OnInit } from '@angular/core';
import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';
import { PersonTableComponent } from "../../components/tables/person-table/person-table.component";

@Component({
  selector: 'app-natural-person-info',
  imports: [MatButtonModule, MatCardModule, WrapperCardComponent],
  templateUrl: './natural-person-info.component.html',
  styleUrl: './natural-person-info.component.scss',
})
export class NaturalPersonInfoComponent {

  readonly dialog = inject(MatDialog);



  // @Input() dataForm: GenericClient | null = null;
  @Input() person!: Person;
  // @Input() selectedPerson!: Person;
  @Output() editEvent = new EventEmitter<EventType>();
  @Output() formSubmitted = new EventEmitter<void>(); //confirmar essa linha

  constructor(private toastrService: ToastrService, private personService: PersonService) { }

  onDelete() {
    this.openDialog();
  }



  openDialog() {
    const dialogRef: MatDialogRef<DialogComponent> = this.dialog.open(
      DialogComponent,
      {
        data: {
          title: 'Confirmar Deleção',
          message: 'Você tem certeza que deseja deletar este registro?',
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
    if (this.person.id) {

      this.personService.delete(this.person.id).subscribe({
        next: (response) => {
          console.log('Deleção bem-sucedida', response);
          this.toastrService.success('Deleção bem-sucedida');
          this.formSubmitted.emit();
        },
        error: (error) => {
          console.error('Erro ao deletar cliente', error);
          this.toastrService.error('Erro ao deletar cliente');
        },
      });
    } else {
      console.error('ID não encontrado para deleção');
      this.toastrService.error('ID não encontrado para deleção');
    }
  }
}
