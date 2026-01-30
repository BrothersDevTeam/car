import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { PrimaryInputComponent } from '@components/primary-input/primary-input.component';
import { PrimarySelectComponent } from '@components/primary-select/primary-select.component';

@Component({
  selector: 'app-access-data-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PrimaryInputComponent,
    PrimarySelectComponent,
  ],
  template: `
    <div [formGroup]="form">
      <div class="form-row-2cols">
        <app-primary-input
          formControlName="username"
          label="Nome de usuário *"
          inputName="username"
          type="text"
          [uppercase]="false"
          placeholder="Digite o nome de usuário"
          [error]="
            form.get('username')?.invalid &&
            (form.get('username')?.touched || submitted)
          "
        />

        <app-primary-select
          label="Função no Sistema *"
          placeholder="Selecione a função"
          inputName="roleName"
          formControlName="roleName"
          [error]="submitted && form.get('roleName')?.invalid"
          [options]="[
            { value: 'ROLE_OWNER', label: 'Proprietário' },
            { value: 'ROLE_MANAGER', label: 'Gerente' },
            { value: 'ROLE_SELLER', label: 'Vendedor' },
            { value: 'ROLE_FINANCIAL', label: 'Financeiro' },
          ]"
        />
      </div>

      <div class="form-row-2cols">
        <app-primary-input
          formControlName="password"
          label="Senha *"
          inputName="password"
          type="password"
          [uppercase]="false"
          placeholder="Mínimo 6 caracteres"
          [error]="
            form.get('password')?.invalid &&
            (form.get('password')?.touched || submitted)
          "
        />

        <app-primary-input
          formControlName="confirmPassword"
          label="Confirmar Senha *"
          inputName="confirmPassword"
          type="password"
          [uppercase]="false"
          placeholder="Digite a senha novamente"
          [error]="
            (form.get('confirmPassword')?.invalid ||
              form.errors?.['passwordMismatch']) &&
            (form.get('confirmPassword')?.touched || submitted)
          "
        />
      </div>

      <!-- Erros de validação -->
      @if (submitted && form.errors?.['passwordMismatch']) {
        <div class="error-message">As senhas não coincidem</div>
      }

      @if (submitted && form.get('username')?.invalid) {
        <div class="error-message">
          @if (form.get('username')?.hasError('usernameConflict')) {
            O nome de usuário já está em uso. Por favor, escolha outro.
          } @else {
            Nome de usuário é obrigatório (mínimo 3 caracteres)
          }
        </div>
      }

      @if (submitted && form.get('password')?.invalid) {
        <div class="error-message">
          Senha é obrigatória (mínimo 6 caracteres)
        </div>
      }

      @if (
        submitted &&
        form.get('confirmPassword')?.invalid &&
        !form.errors?.['passwordMismatch']
      ) {
        <div class="error-message">
          Confirmação de senha é obrigatória (mínimo 6 caracteres)
        </div>
      }

      @if (submitted && form.get('roleName')?.invalid) {
        <div class="error-message">Selecione uma função no sistema</div>
      }
    </div>
  `,
  styles: [
    `
      .form-row-2cols {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-bottom: 24px;
      }

      .error-message {
        color: #ef4444;
        font-size: 0.875rem;
        margin-top: 0.25rem;
        font-weight: 500;
      }

      @media (max-width: 768px) {
        .form-row-2cols {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AccessDataFormComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input() submitted = false;
}
