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
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
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
