import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { StoreService } from '@services/store.service';
import { AuthService } from '@services/auth/auth.service';

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './subscription.component.html',
  styleUrl: './subscription.component.scss'
})
export class SubscriptionComponent implements OnInit {
  storeId: string | null = null;
  loading = false;

  constructor(
    private storeService: StoreService,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.storeId = this.authService.getStoreId();
    if (!this.storeId) {
      this.toastr.error('Não foi possível identificar a loja do usuário.', 'Erro');
      this.authService.logout();
    }
  }

  onSubscribe(): void {
    if (!this.storeId) return;

    this.loading = true;
    this.storeService.subscribeBasicStore(this.storeId).subscribe({
      next: () => {
        // Atualiza a sessão e as claims do token local sem exigir relogar
        this.authService.refreshToken().subscribe({
          next: () => {
            this.loading = false;
            this.toastr.success('Assinatura ativada com sucesso!', 'Parabéns');
            this.router.navigate(['/dashboard']);
          },
          error: (err) => {
            this.loading = false;
            console.error('Erro ao atualizar a sessão', err);
            this.toastr.warning('Assinatura ativada, por favor faça login novamente.', 'Sucesso');
            this.authService.logout();
          }
        });
      },
      error: (err) => {
        this.loading = false;
        console.error('Erro ao contratar assinatura', err);
        this.toastr.error('Ocorreu um erro ao ativar a assinatura. Tente novamente.', 'Falha');
      }
    });
  }

  onLogout(): void {
    this.authService.logout();
  }
}
