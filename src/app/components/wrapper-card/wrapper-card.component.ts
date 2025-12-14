import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-wrapper-card',
  imports: [],
  templateUrl: './wrapper-card.component.html',
  styleUrl: './wrapper-card.component.scss',
})
export class WrapperCardComponent {
  @Input() title: string = '';
}
