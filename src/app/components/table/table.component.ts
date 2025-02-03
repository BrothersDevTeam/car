import { AfterViewInit, Component, Input, ViewChild } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Person } from '@interfaces/entity';

@Component({
  selector: 'app-table',
  imports: [MatTableModule, MatPaginatorModule],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss'
})
export class TableComponent implements AfterViewInit {
  @Input() displayedColumns: string[] = [];
  @Input() dataSource = new MatTableDataSource<Person>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }
}
