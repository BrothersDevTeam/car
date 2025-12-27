import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { PrimaryInputComponent } from '../../components/primary-input/primary-input.component';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PrimaryInputComponent,
    MatIconModule,
  ],
  template: `
    <main class="login-container">
      <div class="content">
        <!-- Left Panel (Same as Login) -->
        <div class="left-panel">
          <h1>
            C A R
            <br />
          </h1>
          <div class="footer-text">
            <p>Bem-vindo de volta!</p>
            <h2>CONTROLE DE AUTO REVENDA</h2>
          </div>
        </div>

        <!-- Glass Card -->
        <section class="glass-card">
          <form
            [formGroup]="resetForm"
            (keydown.enter)="submit()"
          >
            <div style="margin-bottom: 20px; text-align: center;">
              <h2 style="color: white; font-weight: 300;">Redefinir Senha</h2>
              <p style="color: rgba(255,255,255,0.7); font-size: 0.9rem;">
                Crie uma nova senha segura para sua conta.
              </p>
            </div>

            <div class="input-group">
              <app-primary-input
                formControlName="password"
                inputName="password"
                [type]="passwordVisible() ? 'text' : 'password'"
                placeholder="NOVA SENHA"
                [uppercase]="false"
              >
                <mat-icon
                  (click)="togglePasswordVisibility()"
                  style="cursor: pointer"
                >
                  {{ passwordVisible() ? 'visibility' : 'visibility_off' }}
                </mat-icon>
              </app-primary-input>
            </div>

            <div class="input-group">
              <app-primary-input
                formControlName="confirmPassword"
                inputName="confirmPassword"
                [type]="confirmPasswordVisible() ? 'text' : 'password'"
                placeholder="CONFIRME A SENHA"
                [uppercase]="false"
              >
                <mat-icon
                  (click)="toggleConfirmPasswordVisibility()"
                  style="cursor: pointer"
                >
                  {{
                    confirmPasswordVisible() ? 'visibility' : 'visibility_off'
                  }}
                </mat-icon>
              </app-primary-input>
            </div>

            <button
              class="login-btn"
              (click)="submit()"
              [disabled]="resetForm.invalid"
              type="button"
            >
              REDEFINIR SENHA
            </button>

            <div
              class="form-footer"
              style="justify-content: center; margin-top: 1rem;"
            >
              <a
                class="forgot-password"
                style="cursor: pointer; text-decoration: none; color: rgba(255,255,255,0.8); border-bottom: 1px solid rgba(255,255,255,0.5);"
                (click)="goToLogin()"
              >
                Voltar ao Login
              </a>
            </div>
          </form>
        </section>
      </div>
    </main>
  `,
  styles: [
    `
      /* COPIED FROM login.component.scss */
      .login-container {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100vw;
        height: 100vh;
        background:
          linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)),
          url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80')
            no-repeat center center;
        background-size: cover;
        overflow: hidden;
        font-family: 'Roboto', sans-serif;
      }

      .content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        max-width: 1200px;
        padding: 2rem;
        height: 80vh;
      }

      .left-panel {
        flex: 1;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        color: white;
        padding-right: 2rem;
      }

      .left-panel h1 {
        font-size: 5rem;
        font-weight: 800;
        line-height: 1;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.8);
        mask-image: linear-gradient(
          to bottom,
          rgba(0, 0, 0, 1),
          rgba(0, 0, 0, 0.6)
        );
        -webkit-mask-image: linear-gradient(
          to bottom,
          rgba(0, 0, 0, 1),
          rgba(0, 0, 0, 0.6)
        );
      }

      .left-panel .footer-text p {
        font-size: 1.5rem;
        font-weight: 500;
        margin-bottom: 0.5rem;
      }

      .left-panel .footer-text h2 {
        font-size: 2.5rem;
        font-weight: 800;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.5);
      }

      .glass-card {
        width: 400px;
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-radius: 30px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        padding: 3rem 2rem;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
      }

      .glass-card form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .input-group {
        width: 100%;
      }

      .login-btn {
        width: 100%;
        padding: 15px;
        border-radius: 50px;
        background: linear-gradient(90deg, #3b82f6 0%, #a855f7 100%);
        border: none;
        color: white;
        font-size: 1rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        cursor: pointer;
        transition:
          transform 0.2s,
          box-shadow 0.2s;
        margin-top: 1rem;
      }

      .login-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 20px rgba(59, 130, 246, 0.5);
      }

      .login-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }

      /* Responsive adjustments */
      @media (max-width: 1024px) {
        .content {
          flex-direction: column;
          justify-content: center;
          gap: 2rem;
          height: auto;
          min-height: 100vh;
          padding: 2rem 1rem;
        }

        .left-panel {
          width: 100%;
          padding-right: 0;
          align-items: center;
          text-align: center;
          flex: 0 0 auto;
          height: auto;
          margin-bottom: 1rem;
        }

        .left-panel h1 {
          font-size: 3.5rem;
          margin-bottom: 1rem;
        }

        .glass-card {
          width: 100%;
          max-width: 450px;
        }
      }

      /* Specific override for app-primary-input to match login */
      ::ng-deep app-primary-input .input-wrapper {
        margin-top: 0 !important;
      }
      ::ng-deep app-primary-input .input-wrapper label {
        display: none !important;
      }
      ::ng-deep app-primary-input .input-container {
        margin-top: 0 !important;
      }
      ::ng-deep app-primary-input .input-content {
        background: rgba(255, 255, 255, 0.1) !important;
        border: 1px solid rgba(255, 255, 255, 0.3) !important;
        border-radius: 50px !important;
        padding-right: 0 !important;
      }
      ::ng-deep app-primary-input input {
        background: transparent !important;
        color: white !important;
        padding: 15px 20px !important;
        padding-left: 50px !important;
      }
      ::ng-deep app-primary-input mat-icon {
        position: absolute;
        left: 15px !important;
        right: auto !important;
        color: #a855f7;
      }
    `,
  ],
})
export class ResetPasswordComponent {
  resetForm: FormGroup;
  token: string = '';
  passwordVisible = signal(false);
  confirmPasswordVisible = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private httpClient: HttpClient,
    private toastrService: ToastrService
  ) {
    this.resetForm = new FormGroup({
      password: new FormControl('', [
        Validators.required,
        Validators.minLength(4),
      ]),
      confirmPassword: new FormControl('', [Validators.required]),
    });

    this.route.queryParams.subscribe((params) => {
      this.token = params['token'];
      if (!this.token) {
        this.toastrService.error('Token de recuperação inválido ou ausente.');
        this.router.navigate(['/login']);
      }
    });
  }

  submit() {
    if (this.resetForm.invalid) return;

    if (
      this.resetForm.value.password !== this.resetForm.value.confirmPassword
    ) {
      this.toastrService.error('As senhas não coincidem!');
      return;
    }

    this.httpClient
      .post(
        '/api/auth/reset-password',
        {
          token: this.token,
          password: this.resetForm.value.password,
        },
        { responseType: 'text' }
      )
      .subscribe({
        next: () => {
          this.toastrService.success(
            'Senha redefinida com sucesso! Faça login.'
          );
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.toastrService.error(
            err.error || 'Erro ao redefinir senha. O link pode ter expirado.'
          );
        },
      });
  }

  togglePasswordVisibility() {
    this.passwordVisible.set(!this.passwordVisible());
  }

  toggleConfirmPasswordVisibility() {
    this.confirmPasswordVisible.set(!this.confirmPasswordVisible());
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
