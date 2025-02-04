import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Person } from '@interfaces/entity';

@Component({
  selector: 'app-table',
  imports: [
    MatTableModule,
    MatPaginatorModule
  ],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss'
})
export class TableComponent implements OnInit {
  @Input() displayedColumns: string[] = [];
  @Input() dataSource!: Person[];

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

}
