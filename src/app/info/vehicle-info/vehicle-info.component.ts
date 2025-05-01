import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { EventType } from '@angular/router';

import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';

import { VehicleForm } from '@interfaces/vehicle';

@Component({
  selector: 'app-vehicle-info',
  imports: [MatButtonModule, MatCardModule, WrapperCardComponent],
  templateUrl: './vehicle-info.component.html',
  styleUrl: './vehicle-info.component.scss',
})
export class VehicleInfoComponent {
  @Input() vehicle!: VehicleForm;
  @Output() editEvent = new EventEmitter<EventType>();
}
