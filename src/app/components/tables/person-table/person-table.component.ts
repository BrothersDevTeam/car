import {
  Input,
  OnInit,
  Output,
  Component,
  OnChanges,
  EventEmitter,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

import  { PaginationComponent } from '@components/pagination/pagination.component';
import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';

import type { Person } from '@interfaces/person';
import { PaginationResponse } from '@interfaces/pagination';
import { PersonService } from '@services/person.service';


@Component({
  selector: 'app-person-table',
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    PaginationComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './person-table.component.html',
  styleUrl: './person-table.component.scss',
})
export class PersonTableComponent implements OnInit, OnChanges {
  readonly dialog = inject(MatDialog);

  @Input() personPaginatedList!: PaginationResponse<Person>;
  @Input() searchValue?: string;
  @Output() selectedPerson = new EventEmitter<Person>();
  @Output() pageEvent = new EventEmitter<PageEvent>();
  @Output() personDeleted = new EventEmitter<void>();

  dataSource = new MatTableDataSource<Person>();

  displayedColumns: string[] = ['name', 'active', 'cpf', 'cnpj', 'actions'];
  pageSizeOptions = [1000, 100, 50, 20];
  filteredData: Person[] = [];

  constructor(
    private toastrService: ToastrService,
    private personService: PersonService
  ) {}

  ngAfterViewInit() { }

  ngOnInit(): void {
    if (this.personPaginatedList?.content) {
      this.dataSource.data = this.personPaginatedList.content;
    }
  }

  ngOnChanges() {
    this.filteringData();
  }


  //TODO : REVISAR O CODIGO ABAIXO
    filteringData() {
    if (this.searchValue?.length) {
      this.filteredData = this.personPaginatedList.content.filter((element) => {
        if (element.name || element.legalEntity === true) {
          return (element.name)
            .trim()
            .toLowerCase()
            .includes(this.searchValue!.trim().toLowerCase());
        } else return false;
      });
      this.dataSource.data = this.filteredData;
    } else {
      this.dataSource.data = this.personPaginatedList.content;
    }
  }

  // filteringData() {
  //   if (this.searchValue?.length) {
  //     this.filteredData = this.personPaginatedList.content.filter((element) => {
  //       if (element.person.fullName || element.person.legalName) {
  //         return (element.person.fullName || element.person.legalName)
  //           .trim()
  //           .toLowerCase()
  //           .includes(this.searchValue!.trim().toLowerCase());
  //       } else return false;
  //     });
  //     this.dataSource.data = this.filteredData;
  //   } else {
  //     this.dataSource.data = this.personPaginatedList.content;
  //   }
  // }

  onRowClick(row: Person) {
    this.selectedPerson.emit(row);
  }

  handlePageEvent(event: PageEvent) {
    this.pageEvent.emit(event);
  }

  onDeleteClick(event: Event, person: Person) {
    event.stopPropagation(); // Impede que o clique na linha seja acionado
    this.openDeleteDialog(person);
  }

  openDeleteDialog(person: Person) {
    const dialogRef: MatDialogRef<ConfirmDialogComponent> = this.dialog.open(
      ConfirmDialogComponent,
      {
        data: {
          title: 'Confirmar Exclusão',
          message: `Tem certeza que deseja <strong>excluir</strong> ${person.name}?`,
          confirmText: 'Sim',
          cancelText: 'Não',
        },
      }
    );

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.deleteConfirmed(person);
      }
    });
  }

  deleteConfirmed(person: Person) {
    if (person.personId) {
      this.personService.delete(person.personId).subscribe({
        next: (response) => {
          console.log('Exclusão bem-sucedida:', response);
          this.toastrService.success('Pessoa excluída com sucesso');
          this.personDeleted.emit();
        },
        error: (error) => {
          console.error('Erro ao excluir pessoa:', error);
          // Verifica se há mensagem de erro específica do backend
          const errorMessage = error?.error?.message || error?.message || 'Erro ao excluir pessoa';
          this.toastrService.error(errorMessage);
        },
      });
    } else {
      console.error('ID não encontrado para exclusão');
      this.toastrService.error('ID não encontrado para exclusão');
    }
  }
}
