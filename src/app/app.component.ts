import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NgxSpinnerModule } from 'ngx-spinner';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NgxSpinnerModule],
  template: `
    <router-outlet></router-outlet>
  `,
})
export class AppComponent {
  title = 'car';
}
