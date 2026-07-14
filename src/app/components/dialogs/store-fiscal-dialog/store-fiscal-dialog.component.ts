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
import { MatTooltipModule } from '@angular/material/tooltip';

// Services
import { ParametroFiscalService } from '@services/parametro-fiscal.service';
import { FocusNfeService } from '@services/focus-nfe.service';
import { StoreService } from '@services/store.service';
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
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './store-fiscal-dialog.component.html',
  styleUrl: './store-fiscal-dialog.component.scss',
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
    {
      value: 'SIMPLES_NACIONAL_EXCESSO_SUBLIMITE',
      label: 'Simples Nac. - Excesso Sublimite',
    },
    { value: 'LUCRO_PRESUMIDO', label: 'Lucro Presumido' },
    { value: 'LUCRO_REAL', label: 'Lucro Real' },
  ];

  constructor(
    private fb: FormBuilder,
    private storeService: StoreService,
    private parametroFiscalService: ParametroFiscalService,
    private focusNfeService: FocusNfeService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<StoreFiscalDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { store: Store },
  ) {
    this.form = this.fb.group({
      parametroFiscalId: [null],
      parametroFiscalRegimeTributario: ['', Validators.required],
      parametroFiscalInscricaoEstadual: ['', [Validators.required, Validators.maxLength(20)]],
      parametroFiscalCalculoAutomaticoImpostos: [true, Validators.required],
      parametroFiscalUtilizarCreditoIcms: [false],
      parametroFiscalUtilizarCreditoPisCofins: [false],
      parametroFiscalHabilitaNfe: [true],
      parametroFiscalSenhaCertificado: [''],
      parametroFiscalCertificadoBase64: [''],
      parametroFiscalCadastradoFocusNfe: [{ value: false, disabled: true }],
      parametroFiscalProximoNumeroNfe: [1, [Validators.required, Validators.min(1)]],
      parametroFiscalEmHomologacao: [true],
      parametroFiscalSincronizarRenavePadrao: [false],
      nfeEmails: [''],
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

    this.storeService.getById(this.data.store.storeId!).subscribe({
      next: (store) => {
        if (store) {
          this.data.store = store;
          this.form.patchValue({
            nfeEmails: store.nfeEmails || '',
          });
        }
      },
      error: (err) => console.error('Erro ao carregar dados da loja', err),
    });

    this.parametroFiscalService.getByStoreId(this.data.store.storeId!).subscribe({
      next: (config: any) => {
        if (config && config.parametroFiscalId) {
          this.hasExistingConfig = true;

          // Mapeia a propriedade do backend (model) para a esperada pelo frontend/form (DTO)
          if (config.parametroFiscalRegime && !config.parametroFiscalRegimeTributario) {
            config.parametroFiscalRegimeTributario = config.parametroFiscalRegime;
          }

          this.form.patchValue(config);
        }
        this.loading = false;
      },
      error: (err) => {
        // Se retornar 404/400 (nao existe), tudo bem, carregamos o form vazio
        this.loading = false;
      },
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
            parametroFiscalCertificadoBase64: base64String,
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

    const storeUpdateData = {
      name: this.data.store.name,
      tradeName: this.data.store.tradeName,
      cnpj: this.data.store.cnpj,
      email: this.data.store.email,
      phoneNumber: this.data.store.phone,
      nfeEmails: formData.nfeEmails,
    };

    const storeUpdateRequest =
      this.data.store.mainStoreId === null
        ? this.storeService.updateMainStore(this.data.store.storeId!, storeUpdateData)
        : this.storeService.update(this.data.store.storeId!, storeUpdateData);

    storeUpdateRequest.subscribe({
      next: (updatedStore) => {
        this.data.store = updatedStore;

        const fiscalRequest = this.hasExistingConfig
          ? this.parametroFiscalService.update(this.data.store.storeId!, formData)
          : this.parametroFiscalService.create(this.data.store.storeId!, formData);

        fiscalRequest.subscribe({
          next: (res) => {
            this.snackBar.open('Configurações fiscais e e-mails salvos com sucesso', 'Fechar', {
              duration: 3000,
            });
            this.saving = false;
            this.hasExistingConfig = true;
            this.form.patchValue(res);
          },
          error: (err) => {
            console.error(err);
            this.snackBar.open('Erro ao salvar parâmetros fiscais', 'Fechar', {
              duration: 4000,
            });
            this.saving = false;
          },
        });
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open('Erro ao salvar e-mails da loja', 'Fechar', {
          duration: 4000,
        });
        this.saving = false;
      },
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
        this.snackBar.open('Integração com Focus NFe realizada com sucesso!', 'OK', {
          duration: 5000,
          panelClass: 'success-snackbar',
        });
        this.syncing = false;
        this.form.patchValue({ parametroFiscalCadastradoFocusNfe: true });
        this.data.store = { ...this.data.store }; // Trigger a grid change se necessário
      },
      error: (err) => {
        console.error(err);
        const errMsg = err.error?.message || 'Erro ao comunicar com a Receita / Focus NFe.';
        this.snackBar.open(errMsg, 'Fechar', {
          duration: 5000,
          panelClass: 'error-snackbar',
        });
        this.syncing = false;
      },
    });
  }
}
