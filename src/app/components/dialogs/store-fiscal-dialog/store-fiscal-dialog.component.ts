import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';

// Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Services
import { ParametroFiscalService, ParametroFiscal } from '@services/parametro-fiscal.service';
import { FocusNfeService } from '@services/focus-nfe.service';
import { Store } from '@interfaces/store';

@Component({
  selector: 'app-store-fiscal-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './store-fiscal-dialog.component.html',
  styleUrl: './store-fiscal-dialog.component.scss'
})
export class StoreFiscalDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;
  saving = false;
  syncing = false;
  hasExistingConfig = false;
  selectedFileName = '';

  regimes = [
    { value: 'SIMPLES_NACIONAL', label: 'Simples Nacional' },
    { value: 'LUCRO_PRESUMIDO', label: 'Lucro Presumido' },
    { value: 'LUCRO_REAL', label: 'Lucro Real' }
  ];

  constructor(
    private fb: FormBuilder,
    private parametroFiscalService: ParametroFiscalService,
    private focusNfeService: FocusNfeService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<StoreFiscalDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { store: Store }
  ) {
    this.form = this.fb.group({
      parametroFiscalId: [null],
      parametroFiscalRegimeTributario: ['', Validators.required],
      parametroFiscalCalculoAutomaticoImpostos: [true, Validators.required],
      parametroFiscalUtilizarCreditoIcms: [false],
      parametroFiscalUtilizarCreditoPisCofins: [false],
      parametroFiscalHabilitaNfe: [true],
      parametroFiscalHabilitaNfce: [false],
      parametroFiscalSenhaCertificado: [''],
      parametroFiscalCertificadoBase64: [''],
      parametroFiscalCadastradoFocusNfe: [{value: false, disabled: true}]
    });
  }

  ngOnInit(): void {
    this.loadParametros();
  }

  get isSync(): boolean {
    return this.form.get('parametroFiscalCadastradoFocusNfe')?.value === true;
  }

  loadParametros(): void {
    this.loading = true;
    this.parametroFiscalService.getByStoreId(this.data.store.storeId!).subscribe({
      next: (config) => {
        if (config && config.parametroFiscalRegimeTributario) {
          this.hasExistingConfig = true;
          this.form.patchValue(config);
        }
        this.loading = false;
      },
      error: (err) => {
        // Se retornar 404/400 (nao existe), tudo bem, carregamos o form vazio
        this.loading = false;
      }
    });
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFileName = file.name;
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (reader.result) {
          // Extrair apenas o Base64 sem o cabeçalho 'data:application/x-pkcs12;base64,'
          const base64String = reader.result.toString().split(',')[1];
          this.form.patchValue({
            parametroFiscalCertificadoBase64: base64String
          });
          this.form.markAsDirty();
        }
      };
    }
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    const formData = this.form.getRawValue();

    // Decide se é POST (create) ou PUT (update)
    const request = this.hasExistingConfig
      ? this.parametroFiscalService.update(this.data.store.storeId!, formData)
      : this.parametroFiscalService.create(this.data.store.storeId!, formData);

    request.subscribe({
      next: (res) => {
        this.snackBar.open('Parâmetros fiscais salvos com sucesso', 'Fechar', { duration: 3000 });
        this.saving = false;
        this.hasExistingConfig = true;
        this.form.patchValue(res);
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open('Erro ao salvar configurações fiscais', 'Fechar', { duration: 4000 });
        this.saving = false;
      }
    });
  }

  onSyncFocusNfe(): void {
    if (this.saving || this.loading || !this.hasExistingConfig) {
      this.snackBar.open('Salve os parâmetros fiscais primeiro antes de sincronizar.', 'Fechar', { duration: 4000 });
      return;
    }

    this.syncing = true;
    this.focusNfeService.syncStore(this.data.store.storeId!).subscribe({
      next: (res) => {
        this.snackBar.open('Integração com Focus NFe realizada com sucesso!', 'OK', { duration: 5000, panelClass: 'success-snackbar' });
        this.syncing = false;
        this.form.patchValue({ parametroFiscalCadastradoFocusNfe: true });
        this.data.store = { ...this.data.store }; // Trigger a grid change se necessário
      },
      error: (err) => {
        console.error(err);
        const errMsg = err.error?.message || 'Erro ao comunicar com a Receita / Focus NFe.';
        this.snackBar.open(errMsg, 'Fechar', { duration: 5000, panelClass: 'error-snackbar' });
        this.syncing = false;
      }
    });
  }
}
