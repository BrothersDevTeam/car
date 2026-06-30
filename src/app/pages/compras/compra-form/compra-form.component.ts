import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, of, Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { ContentHeaderComponent } from '@components/content-header/content-header.component';
import { CompraService } from '@services/compra.service';
import { VehicleService } from '@services/vehicle.service';
import { PersonService } from '@services/person.service';
import { extractErrorMessage } from '@utils/error-utils';
import { CurrencyInputComponent } from '@components/currency-input/currency-input.component';
import { DateInputComponent } from '@components/date-input/date-input.component';
import { StoreContextService } from '@services/store-context.service';
import { ToastrService } from 'ngx-toastr';
import { CustomSelectComponent } from '@components/custom-select/custom-select.component';
import { CanComponentDeactivate } from '@guards/unsaved-changes.guard';
import { ActionsService } from '@services/actions.service';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTabsModule } from '@angular/material/tabs';

import { Compra } from '@interfaces/compra';
import type { Person } from '@interfaces/person';
import { LegalEntityFormComponent } from '@forms/client/legal-entity-form/legal-entity-form.component';
import { NaturalPersonFormComponent } from '@forms/client/natural-person-form/natural-person-form.component';
import { DrawerComponent } from '@components/drawer/drawer.component';
import { VehicleFormComponent } from '@forms/vehicle/vehicle-form/vehicle-form.component';

@Component({
  selector: 'app-compra-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ContentHeaderComponent,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatCardModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatButtonToggleModule,
    CurrencyInputComponent,
    DateInputComponent,
    CustomSelectComponent,
    DrawerComponent,
    LegalEntityFormComponent,
    NaturalPersonFormComponent,
    MatTabsModule,
    VehicleFormComponent,
  ],
  templateUrl: './compra-form.component.html',
  styleUrls: ['./compra-form.component.scss'],
})
export class CompraFormComponent implements OnInit, OnDestroy, CanComponentDeactivate {
  isEdit = false;
  compraId: string | null = null;
  title = 'Nova Compra';
  subtitle = 'Registrar uma nova aquisição de veículo';
  loading = signal(false);
  isSubmitting = signal(false);

  private initialFormValue = '';
  private subscriptions = new Subscription();

  compraForm: FormGroup;

  vehicles: { id: string; name: string }[] = [];
  suppliers: { id: string; name: string }[] = [];

  // Flags para controle do drawer de fornecedor (person)
  openPersonForm = signal(false);
  selectedPersonToEdit: Person | null = null;

  // Flags para controle do drawer de veículo
  openVehicleForm = signal(false);
  selectedVehicleToEdit: any = null;

  // Propriedades do Assistente Gerador de Parcelas
  geradorValorTotal = 0;
  geradorParcelas = 1;
  geradorPrimeiroVencimento = new Date();
  geradorFormaPagamento = 'PIX';

  get pagamentos() {
    return this.compraForm.get('pagamentos') as FormArray;
  }

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private compraService: CompraService,
    private vehicleService: VehicleService,
    private personService: PersonService,
    private storeContextService: StoreContextService,
    private toastr: ToastrService,
    private actionsService: ActionsService,
  ) {
    this.compraForm = this.fb.group({
      vehicle: this.fb.group({
        id: ['', Validators.required],
        name: [''],
      }),
      supplier: this.fb.group({
        id: ['', Validators.required],
        name: [''],
      }),
      dataCompra: [new Date(), Validators.required],
      valorCompra: [0, [Validators.required, Validators.min(0.01)]],
      observacao: [''],
      tipoEntrada: ['COMPRA', Validators.required],
      pagamentos: this.fb.array([]),
    });
  }

  ngOnInit() {
    this.compraId = this.route.snapshot.paramMap.get('id');
    const queryVehicleId = this.route.snapshot.queryParamMap.get('vehicleId');

    if (this.compraId) {
      this.isEdit = true;
      this.title = 'Editar Compra';
      this.subtitle = 'Editando os detalhes da compra';
      this.loadCompra();
    } else {
      this.addPagamento();
      if (queryVehicleId) {
        this.loadAndSetQueryVehicle(queryVehicleId);
      }
    }

    this.loadInitialData();

    setTimeout(() => {
      this.initialFormValue = JSON.stringify(this.compraForm.value);
    }, 800);

    this.subscriptions.add(
      this.compraForm.valueChanges.subscribe(() => {
        this.actionsService.hasFormChanges.set(this.hasUnsavedChanges());
        this.geradorValorTotal = this.totalDiferenca;
      }),
    );
  }

  ngOnDestroy() {
    this.actionsService.hasFormChanges.set(false);
    this.subscriptions.unsubscribe();
  }

  private loadInitialData() {
    const storeId = this.storeContextService.currentStoreId;
    if (!storeId) return;

    // Carrega Veículos
    this.reloadVehicles();

    // Carrega Fornecedores (Todas as Pessoas)
    this.reloadSuppliers();
  }

  /**
   * Recarrega a lista de fornecedores
   */
  private reloadSuppliers() {
    const storeId = this.storeContextService.currentStoreId;
    if (!storeId) return;

    this.personService.getPaginatedData(0, 1000, { storeId }).subscribe({
      next: (response) => {
        this.suppliers = (response.content || []).map((p) => ({
          id: p.personId,
          name: p.cpf ? `${p.name} - CPF: ${p.cpf}` : `${p.name} - CNPJ: ${p.cnpj}`,
        }));
      },
      error: (error) => {
        console.error('Erro ao carregar fornecedores:', error);
        this.toastr.error('Erro ao carregar fornecedores');
      }
    });
  }

  private loadAndSetQueryVehicle(vehicleId: string) {
    this.loading.set(true);
    this.vehicleService.getById(vehicleId).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (v) => {
        this.compraForm.get('vehicle')?.patchValue({
          id: v.vehicleId,
          name: `${v.brand} ${v.model} (${v.plate})`
        });
      },
      error: () => this.toastr.error('Erro ao carregar dados do veículo selecionado')
    });
  }

  private loadCompra() {
    if (!this.compraId) return;

    this.loading.set(true);
    this.compraService.getCompraById(this.compraId).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (compra) => {
        this.compraForm.patchValue({
          vehicle: {
            id: compra.vehicleId,
            name: `${compra.vehicleBrand} ${compra.vehicleModel} (${compra.vehiclePlate})`
          },
          supplier: {
            id: compra.supplierId,
            name: compra.supplierName
          },
          dataCompra: compra.dataCompra ? new Date(compra.dataCompra) : new Date(),
          valorCompra: compra.valorCompra,
          observacao: compra.observacao || '',
          tipoEntrada: compra.tipoEntrada || 'COMPRA',
        });

        this.geradorValorTotal = compra.valorCompra;

        // Limpa e preenche pagamentos
        this.pagamentos.clear();
        if (compra.pagamentos && compra.pagamentos.length > 0) {
          compra.pagamentos.forEach((pag) => {
            this.pagamentos.push(
              this.fb.group({
                formaPagamento: [pag.formaPagamento, Validators.required],
                descricao: [pag.descricao || ''],
                valor: [pag.valor, [Validators.required, Validators.min(0.01)]],
                vencimento: [pag.vencimento ? new Date(pag.vencimento) : new Date(), Validators.required],
                tipo: [pag.tipo || 'D'],
              })
            );
          });
        }

        setTimeout(() => {
          this.initialFormValue = JSON.stringify(this.compraForm.value);
        }, 300);
      },
      error: () => {
        this.toastr.error('Erro ao carregar detalhes da compra');
        this.router.navigate(['/compras']);
      }
    });
  }

  addPagamento() {
    this.pagamentos.push(
      this.fb.group({
        formaPagamento: ['PIX', Validators.required],
        descricao: [''],
        valor: [0, [Validators.required, Validators.min(0.01)]],
        vencimento: [new Date(), Validators.required],
        tipo: ['D'], // Débito / Despesa
      })
    );
  }

  removePagamento(index: number) {
    if (this.pagamentos.length > 1) {
      this.pagamentos.removeAt(index);
    } else {
      this.toastr.warning('A compra deve possuir ao menos uma forma de pagamento.');
    }
  }

  // Assistente de geração automática de parcelas
  gerarParcelasAutomaticas() {
    if (this.geradorValorTotal <= 0) {
      this.toastr.warning('Defina o valor a ser parcelado antes de gerar.');
      return;
    }

    if (this.geradorParcelas <= 0) {
      this.toastr.warning('A quantidade de parcelas deve ser maior que zero.');
      return;
    }

    const valorParcela = Number((this.geradorValorTotal / this.geradorParcelas).toFixed(2));
    const confirm = window.confirm(
      `Deseja adicionar ${this.geradorParcelas} parcelas de ${this.currencyFormat(valorParcela)} às formas de pagamento atuais?`
    );

    if (!confirm) return;

    // Se houver apenas uma parcela e ela for de valor zero, podemos limpá-la
    const pagamentosAtuais = this.pagamentos.value;
    if (pagamentosAtuais.length === 1 && pagamentosAtuais[0].valor === 0) {
      this.pagamentos.clear();
    }

    let diferenca = Number((this.geradorValorTotal - (valorParcela * this.geradorParcelas)).toFixed(2));
    const dataBase = new Date(this.geradorPrimeiroVencimento);

    for (let i = 0; i < this.geradorParcelas; i++) {
      const valorFinalParcela = i === this.geradorParcelas - 1 ? (valorParcela + diferenca) : valorParcela;
      
      const vencimento = new Date(dataBase);
      vencimento.setMonth(dataBase.getMonth() + i);

      this.pagamentos.push(
        this.fb.group({
          formaPagamento: [this.geradorFormaPagamento, Validators.required],
          descricao: [`Parcela ${i + 1}/${this.geradorParcelas}`],
          valor: [valorFinalParcela, [Validators.required, Validators.min(0.01)]],
          vencimento: [vencimento, Validators.required],
          tipo: ['D'],
        })
      );
    }

    this.toastr.success('Parcelas geradas com sucesso!');
  }

  currencyFormat(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  get totalPagamentos(): number {
    return this.pagamentos.controls.reduce((sum, ctrl) => sum + (ctrl.get('valor')?.value || 0), 0);
  }

  get totalDiferenca(): number {
    const valorCompra = this.compraForm.get('valorCompra')?.value || 0;
    return Number((valorCompra - this.totalPagamentos).toFixed(2));
  }

  hasUnsavedChanges(): boolean {
    return this.initialFormValue !== JSON.stringify(this.compraForm.value);
  }

  onSubmit() {
    if (!this.storeContextService.validateStoreSelection()) return;

    if (this.compraForm.invalid) {
      this.compraForm.markAllAsTouched();
      this.toastr.error('Preencha todos os campos obrigatórios corretamente.');
      return;
    }

    const valorCompra = this.compraForm.get('valorCompra')?.value || 0;
    if (Math.abs(valorCompra - this.totalPagamentos) > 0.01) {
      this.toastr.error('A soma das parcelas deve ser igual ao valor da compra.');
      return;
    }

    this.isSubmitting.set(true);

    const formValues = this.compraForm.value;
    const requestPayload: Compra = {
      storeId: this.storeContextService.currentStoreId!,
      vehicleId: formValues.vehicle.id,
      supplierId: formValues.supplier.id,
      dataCompra: formValues.dataCompra,
      valorCompra: formValues.valorCompra,
      observacao: formValues.observacao,
      tipoEntrada: formValues.tipoEntrada,
      pagamentos: formValues.pagamentos.map((p: any) => ({
        formaPagamento: p.formaPagamento,
        descricao: p.descricao,
        valor: p.valor,
        vencimento: p.vencimento,
        tipo: p.tipo,
      })),
    };

    const request$ = this.isEdit
      ? this.compraService.update(this.compraId!, requestPayload)
      : this.compraService.create(requestPayload);

    request$.pipe(
      finalize(() => this.isSubmitting.set(false))
    ).subscribe({
      next: () => {
        this.toastr.success(this.isEdit ? 'Compra atualizada com sucesso!' : 'Compra registrada com sucesso!');
        this.initialFormValue = JSON.stringify(this.compraForm.value); // reseta controle de mudanças
        this.router.navigate(['/compras']);
      },
      error: (err) => {
        const errorMsg = extractErrorMessage(err, 'Erro ao salvar registro de compra');
        this.toastr.error(errorMsg);
      }
    });
  }

  canSaveForm(): boolean {
    return this.compraForm.valid && this.totalDiferenca === 0;
  }

  saveForm(isDraft: boolean): Observable<boolean> {
    this.onSubmit();
    return of(true);
  }

  saveLocalDraft(silent?: boolean, name?: string): void {
    this.toastr.info('Rascunhos locais de compras não estão habilitados.');
  }

  /**
   * Abre o drawer para criar novo fornecedor
   */
  onCreateNewSupplier() {
    this.selectedPersonToEdit = null;
    this.openPersonForm.set(true);
  }

  /**
   * Abre o drawer para editar fornecedor existente
   */
  onEditSupplier(personId: string) {
    this.personService.getById(personId).subscribe({
      next: (person) => {
        this.selectedPersonToEdit = person;
        this.openPersonForm.set(true);
      },
      error: (error) => {
        console.error('Erro ao carregar fornecedor:', error);
        this.toastr.error('Erro ao carregar fornecedor');
      },
    });
  }

  /**
   * Fecha o drawer de fornecedor
   */
  handleClosePersonDrawer() {
    this.openPersonForm.set(false);
    this.selectedPersonToEdit = null;
  }

  /**
   * Callback quando o formulário de fornecedor é submetido
   */
  onPersonFormSubmitted() {
    this.reloadSuppliers();
    this.handleClosePersonDrawer();
  }

  /**
   * Recarrega a lista de veículos
   */
  private reloadVehicles(selectNewId?: boolean) {
    const storeId = this.storeContextService.currentStoreId;
    if (!storeId) return;

    const previousIds = this.vehicles.map((v) => v.id);

    this.vehicleService.getPaginatedData(0, 1000, { storeId }).subscribe({
      next: (response) => {
        this.vehicles = (response.content || []).map((v) => ({
          id: v.vehicleId,
          name: `${v.brand} ${v.model} (${v.plate})`,
        }));

        if (selectNewId) {
          const newVehicle = this.vehicles.find((v) => !previousIds.includes(v.id));
          if (newVehicle) {
            this.compraForm.get('vehicle')?.patchValue({
              id: newVehicle.id,
              name: newVehicle.name,
            });
            this.compraForm.get('vehicle')?.get('id')?.markAsDirty();
          }
        }
      },
      error: (error) => {
        console.error('Erro ao recarregar veículos:', error);
        this.toastr.error('Erro ao recarregar veículos');
      },
    });
  }

  /**
   * Abre o drawer para criar novo veículo
   */
  onCreateNewVehicle() {
    this.selectedVehicleToEdit = null;
    this.openVehicleForm.set(true);
  }

  /**
   * Abre o drawer para editar veículo existente
   */
  onEditVehicle(vehicleId: string) {
    this.vehicleService.getById(vehicleId).subscribe({
      next: (vehicle) => {
        this.selectedVehicleToEdit = vehicle;
        this.openVehicleForm.set(true);
      },
      error: (error) => {
        console.error('Erro ao carregar veículo:', error);
        this.toastr.error('Erro ao carregar veículo');
      },
    });
  }

  /**
   * Fecha o drawer de veículo
   */
  handleCloseVehicleDrawer() {
    this.openVehicleForm.set(false);
    this.selectedVehicleToEdit = null;
  }

  /**
   * Callback quando o formulário de veículo é submetido
   */
  onVehicleFormSubmitted() {
    this.reloadVehicles(true);
    this.handleCloseVehicleDrawer();
  }

  cancel() {
    this.router.navigate(['/compras']);
  }
}
