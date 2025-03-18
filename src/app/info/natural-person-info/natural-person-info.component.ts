import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { EventType } from '@angular/router';
import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';
import { GenericClient } from '@interfaces/person';

@Component({
  selector: 'app-natural-person-info',
  imports: [MatButtonModule, MatCardModule, WrapperCardComponent],
  templateUrl: './natural-person-info.component.html',
  styleUrl: './natural-person-info.component.scss',
})
export class NaturalPersonInfoComponent {
  @Input() person!: GenericClient;
  @Output() editEvent = new EventEmitter<EventType>();
}
