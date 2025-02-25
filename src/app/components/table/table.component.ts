import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';

import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { Person } from '@interfaces/entity';

@Component({
  selector: 'app-table',
  imports: [MatTableModule, MatPaginatorModule],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss',
})
export class TableComponent implements OnInit {
  @Input() dataSource!: Person[];

  @Output() selectedPerson = new EventEmitter<Person>();

  displayedColumns: string[] = ['id', 'fullName', 'cpf', 'cnpj'];
  matDataSource = new MatTableDataSource<Person>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit() {
    this.matDataSource.data = this.dataSource;
  }

  ngOnChanges() {
    this.matDataSource.data = this.dataSource; // Atualizar o DataSource da tabela
  }

  ngAfterViewInit() {
    this.matDataSource.paginator = this.paginator; // Vincular o paginador
  }

  onRowClick(row: Person) {
    this.selectedPerson.emit(row); // Emitir a pessoa selecionada
  }
}
