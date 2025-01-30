import { Component, EventEmitter, Output, signal } from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatToolbarModule} from '@angular/material/toolbar';
import { EventType } from '@angular/router';

@Component({
  selector: 'app-main-header',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule],
  templateUrl: './main-header.component.html',
  styleUrl: './main-header.component.scss'
})
export class MainHeaderComponent {
  @Output() collapsedEvent = new EventEmitter<EventType>();
}
