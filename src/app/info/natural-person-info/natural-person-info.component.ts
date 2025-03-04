import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { EventType } from '@angular/router';
import { GenericClient } from '@interfaces/entity';

@Component({
  selector: 'app-natural-person-info',
  imports: [MatButtonModule, MatCardModule],
  templateUrl: './natural-person-info.component.html',
  styleUrl: './natural-person-info.component.scss',
})
export class NaturalPersonInfoComponent {
  @Input() person!: GenericClient;
  @Output() editEvent = new EventEmitter<EventType>();
}
