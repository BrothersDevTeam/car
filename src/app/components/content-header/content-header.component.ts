import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { EventType } from '@angular/router';

@Component({
  selector: 'app-content-header',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule],
  templateUrl: './content-header.component.html',
  styleUrl: './content-header.component.scss',
})
export class ContentHeaderComponent {
  @Input() title = '';
  @Input() btn_label = '';
  @Input() fontIcon = '';

  @Output() onClick = new EventEmitter<EventType>();

  handleAction() {
    this.onClick.emit();
  }
}
