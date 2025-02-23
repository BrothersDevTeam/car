import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgxSpinnerModule } from 'ngx-spinner';

@Component({
  selector: 'app-login-layout',
  imports: [RouterOutlet, NgxSpinnerModule],
  templateUrl: './login-layout.component.html',
  styleUrl: './login-layout.component.scss',
})
export class LoginLayoutComponent {}
