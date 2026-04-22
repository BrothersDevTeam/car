import { Component, Input, OnInit, inject } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';

import { PrimaryInputComponent } from '@components/primary-input/primary-input.component';
import { Authorizations } from '@enums/authorizations';
import { AuthService } from '@services/auth/auth.service';

interface AuthGroup {
  name: string;
  permissions: { key: string; label: string }[];
}

@Component({
  selector: 'app-access-data-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PrimaryInputComponent,
    MatCheckboxModule,
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

      <!-- Erros de validação de usuário/senha -->
      <div
        class="validation-errors"
        *ngIf="submitted"
      >
        @if (form.errors?.['passwordMismatch']) {
          <div class="error-message">As senhas não coincidem</div>
        }
        @if (form.get('username')?.invalid) {
          <div class="error-message">
            @if (form.get('username')?.hasError('usernameConflict')) {
              O nome de usuário já está em uso.
            } @else {
              Nome de usuário é obrigatório
            }
          </div>
        }
        @if (form.get('password')?.invalid) {
          <div class="error-message">
            Senha é obrigatória (mínimo 6 caracteres)
          </div>
        }
      </div>

      <!-- SEÇÃO DE PERMISSÕES GRANULARES -->
      <div class="permissions-container">
        <h3 class="permissions-title">Permissões de Acesso</h3>
        <p class="permissions-subtitle">
          Selecione as ações que este funcionário poderá realizar.
        </p>

        <div class="groups-grid">
          <div
            *ngFor="let group of authGroups"
            class="auth-group"
          >
            <h4 class="group-title">{{ group.name }}</h4>
            <div class="permissions-list">
              <mat-checkbox
                *ngFor="let perm of group.permissions"
                [checked]="isAuthorized(perm.key)"
                (change)="togglePermission(perm.key)"
                color="primary"
                class="permission-checkbox"
              >
                {{ perm.label }}
              </mat-checkbox>
            </div>
          </div>
        </div>
      </div>
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

      .validation-errors {
        margin-bottom: 24px;
      }

      .error-message {
        color: #ef4444;
        font-size: 0.875rem;
        margin-top: 0.25rem;
        font-weight: 500;
      }

      .permissions-container {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #e2e8f0;
      }

      .permissions-title {
        font-size: 1.125rem;
        font-weight: 600;
        color: #1e293b;
        margin-bottom: 0.25rem;
      }

      .permissions-subtitle {
        font-size: 0.875rem;
        color: #64748b;
        margin-bottom: 1.5rem;
      }

      .groups-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 2rem;
      }

      .auth-group {
        display: flex;
        flex-direction: column;
      }

      .group-title {
        font-size: 0.875rem;
        font-weight: 700;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.75rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #f1f5f9;
        display: flex;
        align-items: center;
      }

      .permissions-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .permission-checkbox {
        font-size: 0.875rem;
        color: #1e293b;
      }

      @media (max-width: 768px) {
        .form-row-2cols {
          grid-template-columns: 1fr;
        }

        .groups-grid {
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
      }
    `,
  ],
})
export class AccessDataFormComponent implements OnInit {
  @Input({ required: true }) form!: FormGroup;
  @Input() submitted = false;

  private authService = inject(AuthService);

  authGroups: AuthGroup[] = [
    {
      name: 'Vendas',
      permissions: [
        { key: Authorizations.READ_VENDA, label: 'Visualizar vendas' },
        { key: Authorizations.CREATE_VENDA, label: 'Registrar venda' },
        { key: Authorizations.EDIT_VENDA, label: 'Editar venda' },
        { key: Authorizations.CANCEL_VENDA, label: 'Cancelar venda' },
      ],
    },
    {
      name: 'Veículos',
      permissions: [
        { key: Authorizations.READ_VEHICLE, label: 'Visualizar estoque' },
        { key: Authorizations.CREATE_VEHICLE, label: 'Cadastrar veículos' },
        { key: Authorizations.EDIT_VEHICLE, label: 'Editar veículos' },
        { key: Authorizations.DELETE_VEHICLE, label: 'Excluir veículos' },
        {
          key: Authorizations.READ_VEHICLE_PURCHASE_PRICE,
          label: 'Ver preço de compra',
        },
        { key: Authorizations.READ_VEHICLE_PROFIT, label: 'Ver lucro/margem' },
      ],
    },
    {
      name: 'Clientes e Pessoas',
      permissions: [
        { key: Authorizations.READ_PERSON, label: 'Visualizar pessoas' },
        { key: Authorizations.CREATE_PERSON, label: 'Cadastrar pessoas' },
        { key: Authorizations.EDIT_PERSON, label: 'Editar pessoas' },
        { key: Authorizations.DELETE_PERSON, label: 'Excluir pessoas' },
      ],
    },
    {
      name: 'Notas Fiscais (NFe)',
      permissions: [
        { key: Authorizations.READ_NFE, label: 'Visualizar NFes' },
        { key: Authorizations.CREATE_NFE, label: 'Gerar NFes' },
        { key: Authorizations.EMITIR_NFE, label: 'Emitir para a Focus' },
        { key: Authorizations.CANCEL_NFE, label: 'Cancelar NFes' },
      ],
    },
    {
      name: 'Configurações de Loja',
      permissions: [
        { key: Authorizations.READ_STORE, label: 'Visualizar dados da loja' },
        {
          key: Authorizations.READ_STORE_OTHERS,
          label: 'Visualizar dados da rede (Filiais)',
        },
        { key: Authorizations.EDIT_STORE, label: 'Configurar loja/filiais' },
        { key: Authorizations.SYNC_FOCUSNFE, label: 'Sincronizar Focus NFe' },
      ],
    },
    {
      name: 'Super Admin',
      permissions: [
        { key: Authorizations.ROOT_ADMIN, label: 'Acesso Administrativo Root' },
      ],
    },
    {
      name: 'Usuários do Sistema',
      permissions: [
        {
          key: Authorizations.READ_USER_OTHERS,
          label: 'Visualizar outros usuários',
        },
        { key: Authorizations.CREATE_USER, label: 'Criar usuários' },
        {
          key: Authorizations.EDIT_USER_OTHERS,
          label: 'Editar outros usuários',
        },
        { key: Authorizations.DELETE_USER, label: 'Excluir usuários' },
      ],
    },
  ];

  ngOnInit() {
    // Garante que o controlador de authorizations exista no form
    if (!this.form.get('authorizations')) {
      console.error(
        'O form pai deve prover um FormArray chamado "authorizations"'
      );
    }

    // Filtra as permissões exclusivas de root se o usuário não for root
    if (!this.authService.hasAuthority(Authorizations.ROOT_ADMIN)) {
      const rootOnlyKeys = [Authorizations.ROOT_ADMIN];

      this.authGroups = this.authGroups
        .map((group) => ({
          ...group,
          permissions: group.permissions.filter(
            (p) => !rootOnlyKeys.includes(p.key as Authorizations)
          ),
        }))
        .filter((group) => group.permissions.length > 0);
    }
  }

  isAuthorized(key: string): boolean {
    const authArray = this.form.get('authorizations') as FormArray;
    if (!authArray) return false;
    return authArray.value.includes(key);
  }

  togglePermission(key: string) {
    const authArray = this.form.get('authorizations') as FormArray;
    if (!authArray) return;

    const index = authArray.value.indexOf(key);
    if (index === -1) {
      authArray.push(new FormControl(key));
    } else {
      authArray.removeAt(index);
    }
    this.form.markAsDirty();
  }
}
