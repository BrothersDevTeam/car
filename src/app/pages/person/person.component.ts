import { Component } from '@angular/core';

import { ContentHeaderComponent } from '@components/content-header/content-header.component';

@Component({
  selector: 'app-person',
  imports: [ContentHeaderComponent],
  templateUrl: './person.component.html',
  styleUrl: './person.component.scss'
})
export class PersonComponent {

}
