import { Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-content-header',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule],
  templateUrl: './content-header.component.html',
  styleUrl: './content-header.component.scss'
})
export class ContentHeaderComponent {
  @Input() title = '';
  @Input() btn_label = '';
  @Input() fontIcon = '';
}
