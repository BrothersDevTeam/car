import { Component, EventEmitter, Input, OnChanges, Output, signal, Signal } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { PrimaryInputComponent } from '../../components/primary-input/primary-input.component';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoginForm } from '../../interfaces/login';
import { MatIconModule } from '@angular/material/icon';

import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login',
  imports: [PrimaryInputComponent,
    ReactiveFormsModule,
    MatIconModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  loginForm!: FormGroup<LoginForm>;

  disableBtn = signal(false);

  constructor(
    private authService: AuthService,
    private toastrService: ToastrService
  ) {
    this.loginForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required, Validators.minLength(4)])
    })
  }

  @Input() title: string = '';
  @Input() primaryBtnText: string = '';
  @Input() secondaryBtnText: string = '';
  @Input() disablePrimaryBtn: boolean = true;
  @Output("submit") onSubmit = new EventEmitter();
  @Output("navigate") onNavigate = new EventEmitter();

  submit() {
    this.authService.login(
      this.loginForm.value.email,
      this.loginForm.value.password
    ).subscribe({
      next: () => this.toastrService.success("Login feito com sucesso"),
      error: () => this.toastrService.error("Erro inesperado! Tente novamente mais tarde")
    })
  }
}
