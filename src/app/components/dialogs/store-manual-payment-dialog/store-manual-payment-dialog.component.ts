import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';

import { Store } from '@interfaces/store';
import { SubscriptionPayment } from '@interfaces/subscription-payment';
import { StoreService } from '@services/store.service';

@Component({
  selector: 'app-store-manual-payment-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTabsModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './store-manual-payment-dialog.component.html',
  styleUrl: './store-manual-payment-dialog.component.scss',
})
export class StoreManualPaymentDialogComponent implements OnInit {
  store: Store;
  paymentForm: FormGroup;
  historyList: SubscriptionPayment[] = [];
  loadingHistory = false;
  saving = false;

  displayedColumns: string[] = [
    'paymentDate',
    'amount',
    'paymentMethod',
    'newDueDate',
    'note',
    'registeredBy',
  ];

  paymentMethods = [
    { value: 'PIX', label: 'PIX' },
    { value: 'BOLETO', label: 'Boleto Bancário' },
    { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito' },
    { value: 'DINHEIRO', label: 'Dinheiro' },
    { value: 'OUTRO', label: 'Outro' },
  ];

  constructor(
    private fb: FormBuilder,
    private storeService: StoreService,
    private toastr: ToastrService,
    private dialogRef: MatDialogRef<StoreManualPaymentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { store: Store }
  ) {
    this.store = data.store;

    const todayStr = new Date().toISOString().substring(0, 10);

    this.paymentForm = this.fb.group({
      amount: [199.90, [Validators.required, Validators.min(0.01)]],
      paymentDate: [todayStr, [Validators.required]],
      paymentMethod: ['PIX', [Validators.required]],
      extensionPeriod: ['30', [Validators.required]],
      customDueDate: [''],
      note: ['', [Validators.required, Validators.maxLength(500)]],
    });
  }

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    if (!this.store?.storeId) return;
    this.loadingHistory = true;
    this.storeService.getStorePaymentHistory(this.store.storeId).subscribe({
      next: (response) => {
        this.historyList = response?.content || response || [];
        this.loadingHistory = false;
      },
      error: (err) => {
        console.error('Erro ao carregar histórico de pagamentos:', err);
        this.toastr.error('Não foi possível carregar o histórico de pagamentos.');
        this.loadingHistory = false;
      },
    });
  }

  onSubmit(): void {
    if (this.paymentForm.invalid || !this.store.storeId) return;

    this.saving = true;
    const formVal = this.paymentForm.value;

    const payload: any = {
      amount: formVal.amount,
      paymentDate: formVal.paymentDate,
      paymentMethod: formVal.paymentMethod,
      note: formVal.note,
    };

    if (formVal.extensionPeriod === 'CUSTOM' && formVal.customDueDate) {
      payload.customDueDate = formVal.customDueDate;
    } else {
      payload.extensionDays = parseInt(formVal.extensionPeriod, 10) || 30;
    }

    this.storeService.registerManualPayment(this.store.storeId, payload).subscribe({
      next: (updatedStore) => {
        this.toastr.success(
          `Pagamento registrado! A loja "${updatedStore.tradeName || updatedStore.name}" foi ativada com sucesso.`
        );
        this.storeService.notifyStoreUpdated();
        this.saving = false;
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('Erro ao registrar pagamento manual:', err);
        this.toastr.error('Erro ao registrar pagamento. Verifique os dados e tente novamente.');
        this.saving = false;
      },
    });
  }

  getPaymentMethodLabel(method: string): string {
    const found = this.paymentMethods.find((m) => m.value === method);
    return found ? found.label : method;
  }
}
