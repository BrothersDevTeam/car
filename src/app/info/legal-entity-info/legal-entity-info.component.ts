import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import { EventType } from '@angular/router';
import { GenericClient } from '@interfaces/entity';

@Component({
  selector: 'app-legal-entity-info',
  imports: [MatButtonModule, MatCardModule],
  templateUrl: './legal-entity-info.component.html',
  styleUrl: './legal-entity-info.component.scss',
})
export class LegalEntityInfoComponent {
  @Input() person!: GenericClient;
  @Output() editEvent = new EventEmitter<EventType>();
}
