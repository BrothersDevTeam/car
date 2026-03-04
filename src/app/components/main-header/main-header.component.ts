import {
  Component,
  EventEmitter,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { EventType } from '@angular/router';
import { AuthService } from '@services/auth/auth.service';
import { StoreService } from '@services/store.service';

@Component({
  selector: 'app-main-header',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule],
  templateUrl: './main-header.component.html',
  styleUrl: './main-header.component.scss',
})
export class MainHeaderComponent implements OnInit {
  @Output() collapsedEvent = new EventEmitter<EventType>();

  storeName = signal<string>('Carregando...');

  private authService = inject(AuthService);
  private storeService = inject(StoreService);

  ngOnInit(): void {
    const storeId = this.authService.getStoreId();
    if (storeId) {
      this.storeService.getById(storeId).subscribe({
        next: (store) => {
          this.storeName.set(store.tradeName || store.name || 'Filial');
        },
        error: () => this.storeName.set('Filial'),
      });
    } else {
      this.storeName.set('Filial');
    }
  }
}
