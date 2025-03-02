import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  MatPaginatorIntl,
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';

@Component({
  selector: 'app-pagination',
  imports: [MatPaginatorModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
})
export class PaginationComponent {
  @Input() totalElement = 0;
  @Input() pageSizeOptions!: number[];
  @Output() pageEvent = new EventEmitter<PageEvent>();

  constructor(private paginatorIntl: MatPaginatorIntl) {
    this.paginatorIntl.itemsPerPageLabel = 'Total de itens por página';
    this.paginatorIntl.getRangeLabel = (
      page: number,
      pageSize: number,
      length: number
    ) => {
      if (length === 0) {
        return `0 de 0`;
      }
      const startIndex = page * pageSize;
      const endIndex = Math.min(startIndex + pageSize, length);
      return `${startIndex + 1} – ${endIndex} de ${length}`;
    };
    this.paginatorIntl.changes.next(); // Atualiza o paginator após a mudança
  }

  handlePageEvent(event: PageEvent) {
    this.pageEvent.emit(event);
  }
}
