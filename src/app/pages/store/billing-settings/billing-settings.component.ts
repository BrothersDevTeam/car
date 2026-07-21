import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { ToastrService } from 'ngx-toastr';
import { BillingSettingsService, BillingSettings } from '../../../services/billing-settings.service';
import { ContentHeaderComponent } from '../../../components/content-header/content-header.component';

@Component({
  selector: 'app-billing-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    ContentHeaderComponent
  ],
  templateUrl: './billing-settings.component.html',
  styleUrl: './billing-settings.component.scss'
})
export class BillingSettingsComponent implements OnInit {
  billingForm!: FormGroup;
  loading = true;
  saving = false;

  constructor(
    private fb: FormBuilder,
    private billingSettingsService: BillingSettingsService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadSettings();
  }

  private initForm(): void {
    this.billingForm = this.fb.group({
      nfeBlockDays: [6, [Validators.required, Validators.min(0)]],
      softBlockDays: [20, [Validators.required, Validators.min(0)]],
      hardBlockDays: [30, [Validators.required, Validators.min(0)]]
    });
  }

  private loadSettings(): void {
    this.loading = true;
    this.billingSettingsService.getSettings().subscribe({
      next: (settings: BillingSettings) => {
        this.billingForm.patchValue(settings);
        this.loading = false;
      },
      error: (err) => {
        this.toastr.error('Erro ao carregar as configurações de faturamento.', 'Erro');
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.billingForm.invalid) {
      this.toastr.warning('Por favor, preencha todos os campos corretamente.', 'Aviso');
      return;
    }

    const { nfeBlockDays, softBlockDays, hardBlockDays } = this.billingForm.value;

    // Validar coerência dos limites
    if (nfeBlockDays >= softBlockDays) {
      this.toastr.warning('Os dias para bloqueio de NFe devem ser menores que os dias de Soft Block.', 'Aviso');
      return;
    }
    if (softBlockDays >= hardBlockDays) {
      this.toastr.warning('Os dias para Soft Block devem ser menores que os dias de Hard Block.', 'Aviso');
      return;
    }

    this.saving = true;
    const settings: BillingSettings = this.billingForm.value;

    this.billingSettingsService.updateSettings(settings).subscribe({
      next: () => {
        this.toastr.success('Configurações de faturamento salvas com sucesso!', 'Sucesso');
        this.saving = false;
      },
      error: (err) => {
        this.toastr.error('Erro ao salvar as configurações de faturamento.', 'Erro');
        this.saving = false;
      }
    });
  }
}
