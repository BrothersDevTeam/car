import { HttpClient } from '@angular/common/http';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';

import { PrimaryInputComponent } from '@components/primary-input/primary-input.component';

import { LoginForm } from '@interfaces/login';

import { AuthService } from '@services/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [
    PrimaryInputComponent,
    ReactiveFormsModule,
    MatIconModule,
    CommonModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  loginForm!: FormGroup<LoginForm>;
  forgotPasswordForm!: FormGroup;

  disableBtn = signal(false);
  passwordVisible = signal(false);
  forgotPasswordMode = signal(false);

  constructor(
    private authService: AuthService,
    private toastrService: ToastrService,
    private httpClient: HttpClient
  ) {
    this.loginForm = new FormGroup({
      username: new FormControl('', [Validators.required]),
      password: new FormControl('', [
        Validators.required,
        Validators.minLength(4),
      ]),
    });

    this.forgotPasswordForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
    });
  }

  @Input() title: string = '';
  @Input() primaryBtnText: string = '';
  @Input() secondaryBtnText: string = '';
  @Input() disablePrimaryBtn: boolean = true;
  @Output('submit') onSubmit = new EventEmitter();
  @Output('navigate') onNavigate = new EventEmitter();

  submit() {
    this.authService
      .login(this.loginForm.value.username, this.loginForm.value.password)
      .subscribe({
        next: () => this.toastrService.success('Login feito com sucesso'),
        error: () =>
          this.toastrService.error(
            'Erro inesperado! Tente novamente mais tarde'
          ),
      });
  }

  togglePasswordVisibility() {
    this.passwordVisible.set(!this.passwordVisible());
  }

  // --- Recovery Logic ---
  // valid states: 'LOGIN', 'SELECTION', 'FORGOT_PASSWORD', 'FORGOT_USERNAME'
  viewState = signal<
    'LOGIN' | 'SELECTION' | 'FORGOT_PASSWORD' | 'FORGOT_USERNAME'
  >('LOGIN');

  setViewState(
    state: 'LOGIN' | 'SELECTION' | 'FORGOT_PASSWORD' | 'FORGOT_USERNAME'
  ) {
    this.viewState.set(state);
  }

  submitForgotUsername() {
    if (this.forgotPasswordForm.invalid) return;

    this.httpClient
      .post(
        '/api/auth/forgot-username',
        {
          email: this.forgotPasswordForm.value.email,
        },
        { responseType: 'text' }
      )
      .subscribe({
        next: () => {
          this.toastrService.success(
            'Nome de usuário enviado para seu email! Verifique sua caixa de entrada.'
          );
          this.setViewState('LOGIN');
        },
        error: (err) => {
          this.toastrService.error(
            err.error || 'Erro ao recuperar usuário. Verifique o email.'
          );
        },
      });
  }

  submitForgotPassword() {
    if (this.forgotPasswordForm.invalid) return;

    this.httpClient
      .post(
        '/api/auth/forgot-password',
        {
          email: this.forgotPasswordForm.value.email,
        },
        { responseType: 'text' }
      )
      .subscribe({
        next: () => {
          this.toastrService.success(
            'Email de recuperação enviado! Verifique sua caixa de entrada (ou logs).'
          );
          this.setViewState('LOGIN');
        },
        error: (err) => {
          this.toastrService.error(
            err.error || 'Erro ao solicitar recuperação de senha.'
          );
        },
      });
  }

  // Helper getters for template
  isLogin() {
    return this.viewState() === 'LOGIN';
  }
  isSelection() {
    return this.viewState() === 'SELECTION';
  }
  isForgotPassword() {
    return this.viewState() === 'FORGOT_PASSWORD';
  }
  isForgotUsername() {
    return this.viewState() === 'FORGOT_USERNAME';
  }
}
