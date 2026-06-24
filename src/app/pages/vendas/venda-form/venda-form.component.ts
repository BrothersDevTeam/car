import { Component, OnDestroy, OnInit, Output, signal, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  finalize,
  Observable,
  of,
  Subscription,
  switchMap,
  tap,
} from 'rxjs';

import { ContentHeaderComponent } from '@components/content-header/content-header.component';
import { VendaService } from '@services/venda.service';
import { VehicleService } from '@services/vehicle.service';
import { PersonService } from '@services/person.service';
import { extractErrorMessage } from '@utils/error-utils';
import { CurrencyInputComponent } from '@components/currency-input/currency-input.component';
import { DateInputComponent } from '@components/date-input/date-input.component';
import { StoreContextService } from '@services/store-context.service';
import { ToastrService } from 'ngx-toastr';
import { MatTabsModule } from '@angular/material/tabs';
import { CustomSelectComponent } from '@components/custom-select/custom-select.component';
import { DrawerComponent } from '@components/drawer/drawer.component';
import { NaturalPersonFormComponent } from '@forms/client/natural-person-form/natural-person-form.component';
import { LegalEntityFormComponent } from '@forms/client/legal-entity-form/legal-entity-form.component';
import {
  SaveDraftDialogComponent,
  SaveDraftDialogResult,
} from '@components/dialogs/save-draft-dialog/save-draft-dialog.component';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
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
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { CanComponentDeactivate } from '@guards/unsaved-changes.guard';
import { FormDraftService, FormDraft } from '@services/form-draft.service';
import { ActionsService } from '@services/actions.service';

import { Vehicle, VehicleList } from '@interfaces/vehicle';
import { Person } from '@interfaces/person';
import { VendaRequestDto } from '@interfaces/venda';

@Component({
  selector: 'app-venda-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ContentHeaderComponent,
    MatButtonModule,
    MatExpansionModule,
    MatTabsModule,
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
    MatChipsModule,
    CurrencyInputComponent,
    DateInputComponent,
    CustomSelectComponent,
    DrawerComponent,
    NaturalPersonFormComponent,
    LegalEntityFormComponent,
  ],
  templateUrl: './venda-form.component.html',
  styleUrls: ['./venda-form.component.scss'],
})
export class VendaFormComponent implements OnInit, OnDestroy, CanComponentDeactivate {
  isEdit = false;
  vendaId: string | null = null;
  title = 'Nova Venda';
  subtitle = 'Registrar uma nova venda de veículo';
  loading = signal(false);
  isSubmitting = signal(false);
  isSaving = false;

  private initialFormValue: string = '';
  private readonly FORM_TYPE = 'venda';
  private lastSavedDraftValue: any = null;
  private subscriptions = new Subscription();

  draftSelectorClicked = false;
  availableDrafts: FormDraft[] = [];
  selectedDraft: FormDraft | null = null;
  showFormFields = false;

  // Formulário Reativo
  vendaForm: FormGroup;

  // Listas formatadas para o CustomSelect
  vehicles: { id: string; name: string }[] = [];
  buyers: { id: string; name: string }[] = [];
  sellers: { id: string; name: string }[] = [];
  avalistasOptions: { id: string; name: string }[] = [];
  selectedAvalistas: Person[] = [];

  // Sinais para controlar os drawers
  openPersonForm = signal(false);
  selectedPersonToEdit = signal<Person | null>(null);

  people: { id: string; name: string }[] = [];

  // Propriedades do Assistente Gerador de Parcelas
  geradorValorTotal = 0;
  geradorParcelas = 1;
  geradorPeriodicidadeTipo: 'MENSAL' | 'QUINZENAL' | 'SEMANAL' | 'CUSTOM' = 'MENSAL';
  geradorPeriodicidadeDias = 30;
  geradorPrimeiroVencimento = new Date();
  geradorFormaPagamento = 'PIX'; // Forma padrão de parcelamento

  get despesas() {
    return this.vendaForm.get('despesas') as FormArray;
  }

  get receitasControls() {
    return this.pagamentos.controls
      .map((control, index) => ({ control, index }))
      .filter(x => x.control.get('tipo')?.value !== 'D');
  }

  get debitosControls() {
    return this.pagamentos.controls
      .map((control, index) => ({ control, index }))
      .filter(x => x.control.get('tipo')?.value === 'D');
  }

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private vendaService: VendaService,
    private vehicleService: VehicleService,
    private personService: PersonService,
    private storeContextService: StoreContextService,
    private toastr: ToastrService,
    private formDraftService: FormDraftService,
    private actionsService: ActionsService,
    private dialog: MatDialog,
  ) {
    this.vendaForm = this.fb.group({
      vehicle: this.fb.group({
        id: ['', Validators.required],
        name: [''],
      }),
      buyer: this.fb.group({
        id: ['', Validators.required],
        name: [''],
      }),
      seller: this.fb.group({
        id: [''],
        name: [''],
      }),
      dataVenda: [new Date(), Validators.required],
      valor: [0, [Validators.required, Validators.min(0.01)]],
      valorFinal: [0, [Validators.required, Validators.min(0.01)]],
      observacao: [''],
      pagamentos: this.fb.array([]),
      avalistasIds: this.fb.array([]),
      avalistaSearchControl: [''], // Controle auxiliar para busca
      retornoBancoId: [''],
      retornoNumero: [null],
      retornoValor: [0],
      retornoCreditarDia: [null],
      despesas: this.fb.array([]),
    });
  }

  get pagamentos() {
    return this.vendaForm.get('pagamentos') as FormArray;
  }

  get avalistasIds() {
    return this.vendaForm.get('avalistasIds') as FormArray;
  }

  ngOnInit() {
    this.vendaId = this.route.snapshot.paramMap.get('id');
    if (this.vendaId) {
      this.isEdit = true;
      this.title = 'Editar Venda';
      this.subtitle = `Editando os detalhes da venda`;
      this.loadVenda();
    } else {
      // Começa com um pagamento padrão
      this.addPagamento();
    }

    this.loadInitialData();

    // Carrega o valor inicial para detectar mudanças
    setTimeout(() => {
      this.initialFormValue = JSON.stringify(this.vendaForm.value);
      this.lastSavedDraftValue = this.vendaForm.value;
      this.checkForDrafts();
    }, 500);

    this.subscriptions.add(
      this.vendaForm.valueChanges.subscribe(() => {
        this.actionsService.hasFormChanges.set(this.hasUnsavedChanges());
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

    // Carrega Veículos em Estoque
    this.vehicleService.getPaginatedData(0, 1000, { storeId, onlyInStock: true }).subscribe((response) => {
      this.vehicles = (response.content || []).map((v) => ({
        id: v.vehicleId,
        name: `${v.brand} ${v.model} (${v.plate})`,
      }));
    });

    // Carrega Pessoas (Compradores/Vendedores/Avalistas/Fornecedores/Bancos)
    this.personService.getPaginatedData(0, 1000, { storeId }).subscribe((response) => {
      const mapped = (response.content || []).map((p) => ({
        id: p.personId,
        name: p.cpf ? `${p.name} - CPF: ${p.cpf}` : `${p.name} - CNPJ: ${p.cnpj}`,
      }));
      this.buyers = [...mapped];
      this.sellers = [...mapped];
      this.avalistasOptions = [...mapped];
      this.people = [...mapped];
    });
  }

  // Métodos para o Drawer de Person
  onCreateNewPerson() {
    this.selectedPersonToEdit.set(null);
    this.openPersonForm.set(true);
  }

  onEditPerson(id: string) {
    this.personService.getById(id).subscribe((person) => {
      this.selectedPersonToEdit.set(person);
      this.openPersonForm.set(true);
    });
  }

  handleClosePersonDrawer() {
    this.openPersonForm.set(false);
    this.selectedPersonToEdit.set(null);
  }

  onPersonFormSubmitted() {
    this.handleClosePersonDrawer();
    this.loadInitialData();
  }

  onVehicleSelected(option: { id: string; name: string }) {
    this.vehicleService.getById(option.id).subscribe((vehicle) => {
      const valorVenda = vehicle.valorVenda ? parseFloat(vehicle.valorVenda.toString().replace(',', '.')) : 0;

      this.vendaForm.patchValue({
        valor: valorVenda,
        valorFinal: valorVenda,
      });
    });
  }

  // Gestão de Pagamentos
  createPagamentoFormGroup(data?: any): FormGroup {
    return this.fb.group({
      formaPagamento: [data?.formaPagamento || 'PIX', Validators.required],
      valor: [data?.valor || 0, [Validators.required, Validators.min(0.01)]],
      vencimento: [data?.vencimento ? new Date(data.vencimento) : new Date()],
      descricao: [data?.descricao || ''],
      tipo: [data?.tipo || 'R', Validators.required]
    });
  }

  addReceita() {
    this.pagamentos.push(this.createPagamentoFormGroup({ tipo: 'R' }));
  }

  addDebito() {
    this.pagamentos.push(this.createPagamentoFormGroup({ formaPagamento: 'TROCA', tipo: 'D' }));
  }

  addPagamento() {
    this.addReceita();
  }

  removePagamento(index: number) {
    this.pagamentos.removeAt(index);
  }

  createDespesaFormGroup(data?: any): FormGroup {
    const tipo = data?.tipo || 'LOJA';
    const isRecebida = tipo === 'RECEBIDA';
    
    // Para despesas RECEBIDA, o custo real não é obrigatório no cadastro inicial.
    const valorCustoValidators = isRecebida
      ? [Validators.min(0)]
      : [Validators.required, Validators.min(0)];

    return this.fb.group({
      descricao: [data?.descricao || '', Validators.required],
      valorCusto: [
        data?.valorCusto !== undefined && data?.valorCusto !== null
          ? data.valorCusto
          : (isRecebida ? null : 0),
        valorCustoValidators
      ],
      valorRecebido: [data?.valorRecebido || null],
      dataPagamento: [data?.dataPagamento ? new Date(data.dataPagamento) : new Date(), Validators.required],
      fornecedorId: [data?.fornecedorId || ''],
      tipo: [tipo, Validators.required]
    });
  }

  addDespesa(tipo: 'LOJA' | 'RECEBIDA') {
    this.despesas.push(this.createDespesaFormGroup({ tipo }));
  }

  removeDespesa(index: number) {
    this.despesas.removeAt(index);
  }

  adicionarMeses(dataBase: Date, meses: number): Date {
    const data = new Date(dataBase.getTime());
    const diaDesejado = dataBase.getDate();
    
    data.setMonth(data.getMonth() + meses);
    
    if (data.getDate() < diaDesejado) {
      data.setDate(0);
    }
    
    return data;
  }

  gerarParcelas() {
    if (this.geradorValorTotal <= 0) {
      this.toastr.warning('Digite um valor total maior que zero.');
      return;
    }
    if (this.geradorParcelas <= 0) {
      this.toastr.warning('O número de parcelas deve ser maior que zero.');
      return;
    }

    const indicesParaRemover = this.pagamentos.controls
      .map((control, index) => {
        const tipo = control.get('tipo')?.value;
        const valor = control.get('valor')?.value || 0;
        const descricao = control.get('descricao')?.value || '';

        // Remove apenas se for receita ('R') e (valor estiver zerado ou for uma parcela gerada anteriormente)
        const deveRemover = tipo === 'R' && (
          valor <= 0.009 ||
          (descricao.startsWith('Parcela ') && descricao.includes('/'))
        );
        return { deveRemover, index };
      })
      .filter(x => x.deveRemover)
      .map(x => x.index)
      .reverse();

    for (const index of indicesParaRemover) {
      this.pagamentos.removeAt(index);
    }

    const valorParcela = parseFloat((this.geradorValorTotal / this.geradorParcelas).toFixed(2));
    let totalAcumulado = 0;

    for (let i = 1; i <= this.geradorParcelas; i++) {
      let valorFinalParcela = valorParcela;
      
      if (i === this.geradorParcelas) {
        valorFinalParcela = parseFloat((this.geradorValorTotal - totalAcumulado).toFixed(2));
      } else {
        totalAcumulado += valorFinalParcela;
      }

      let vencimento = new Date(this.geradorPrimeiroVencimento);
      if (this.geradorPeriodicidadeTipo === 'MENSAL') {
        vencimento = this.adicionarMeses(this.geradorPrimeiroVencimento, i - 1);
      } else if (this.geradorPeriodicidadeTipo === 'QUINZENAL') {
        vencimento.setDate(vencimento.getDate() + (i - 1) * 15);
      } else if (this.geradorPeriodicidadeTipo === 'SEMANAL') {
        vencimento.setDate(vencimento.getDate() + (i - 1) * 7);
      } else {
        vencimento.setDate(vencimento.getDate() + (i - 1) * this.geradorPeriodicidadeDias);
      }

      const descricao = `Parcela ${i}/${this.geradorParcelas}`;

      this.pagamentos.push(this.createPagamentoFormGroup({
        formaPagamento: this.geradorFormaPagamento,
        valor: valorFinalParcela,
        vencimento: vencimento,
        descricao: descricao,
        tipo: 'R'
      }));
    }

    this.toastr.success(`${this.geradorParcelas} parcelas geradas com sucesso!`);
  }

  calcularLucroDespesa(despControl: any): number {
    const valorRec = despControl.get('valorRecebido')?.value || 0;
    const valorCusto = despControl.get('valorCusto')?.value || 0;
    return valorRec - valorCusto;
  }

  // Gestão de Avalistas
  addAvalistaDirectly(option: any) {
    if (!option || !option.id) return;

    if (this.avalistasIds.value.includes(option.id)) {
      this.toastr.warning('Avalista já adicionado');
      return;
    }
    this.avalistasIds.push(this.fb.control(option.id));
    // Criamos um objeto parcial de Person para manter a exibição no chip-set
    this.selectedAvalistas.push({
      personId: option.id,
      name: option.name,
    } as any);
    this.toastr.success(`Avalista ${option.name} adicionado`);
  }

  removeAvalista(index: number) {
    this.avalistasIds.removeAt(index);
    this.selectedAvalistas.splice(index, 1);
  }

  // ===== Implementação de CanComponentDeactivate / Rascunhos =====

  hasUnsavedChanges(): boolean {
    if (this.isSaving) return false;

    if (!this.initialFormValue) return false;

    const currentValue = JSON.stringify(this.vendaForm.value);
    const hasChanges = currentValue !== this.initialFormValue;

    return hasChanges;
  }

  hasChangesComparedToDraft(): boolean {
    if (!this.lastSavedDraftValue) {
      return this.hasUnsavedChanges();
    }
    const current = JSON.stringify(this.vendaForm.value);
    const draft = JSON.stringify(this.lastSavedDraftValue);
    return current !== draft;
  }

  get canShowDraftButton(): boolean {
    return !this.isSaving && !this.loading() && this.vendaForm.dirty && this.hasChangesComparedToDraft();
  }

  get currentDraftName(): string | undefined {
    return this.selectedDraft?.draftName;
  }

  get suggestedDraftName(): string {
    return `Venda em ${new Date().toLocaleString()}`;
  }

  get isSaveButtonDisabled(): boolean {
    if (this.isSaving || this.loading() || this.isSubmitting()) {
      return true;
    }

    const hasActiveDraft = !!this.selectedDraft;
    const isEditMode = this.isEdit;

    if (isEditMode) {
      if (hasActiveDraft) {
        return !this.vendaForm.valid;
      }
      return !this.hasUnsavedChanges();
    }
    return !this.vendaForm.valid;
  }

  canSaveForm(): boolean {
    // Para rascunho local, permitimos salvar se houver qualquer dado relevante
    const raw = this.vendaForm.value;
    return !!(raw.vehicle?.id || raw.buyer?.id || raw.seller?.id);
  }

  saveForm(isDraft: boolean): Observable<boolean> {
    if (isDraft) {
      this.saveLocalDraft();
      return of(true);
    }
    this.onSubmit();
    return of(true);
  }

  saveLocalDraft(
    silent: boolean = false,
    draftName?: string,
    existingDraftId?: string,
    closeAfterSave: boolean = false,
  ): void {
    this.isSaving = true;
    const name = draftName || `Venda em ${new Date().toLocaleString()}`;

    let effectiveEntityId = this.vendaId || undefined;

    if (!effectiveEntityId && existingDraftId) {
      const prefix = `${this.FORM_TYPE}_`;
      if (existingDraftId.startsWith(prefix)) {
        effectiveEntityId = existingDraftId.replace(prefix, '') as any;
      }
    }

    const draftData = {
      ...this.vendaForm.value,
      avalistasDetails: this.selectedAvalistas,
    };

    const draftId = this.formDraftService.saveDraft(this.FORM_TYPE, draftData, effectiveEntityId, name);

    this.selectedDraft = {
      id: draftId,
      formType: this.FORM_TYPE,
      data: draftData,
      draftName: name,
      lastModified: new Date(),
      status: 'em-preenchimento',
    };

    this.initialFormValue = JSON.stringify(this.vendaForm.value);
    this.lastSavedDraftValue = this.vendaForm.value;
    this.actionsService.hasFormChanges.set(false);
    this.vendaForm.markAsPristine();

    if (!silent) {
      this.toastr.info('Rascunho salvo localmente');
    }

    this.isSaving = false;

    if (closeAfterSave) {
      this.goBack();
    }
  }

  openSaveDraftDialog() {
    if (this.selectedDraft) {
      this.saveLocalDraft(false, this.selectedDraft.draftName, this.selectedDraft.id, false);
      return;
    }

    const suggestedName = `Venda em ${new Date().toLocaleString()}`;

    const dialogRef = this.dialog.open(SaveDraftDialogComponent, {
      data: {
        title: 'Salvar Rascunho',
        suggestedName,
      },
    });

    dialogRef.afterClosed().subscribe((result: SaveDraftDialogResult) => {
      if (result && result.confirmed) {
        const nameExists = this.availableDrafts.some((d) => d.draftName === result.draftName);

        if (nameExists) {
          this.toastr.error('Já existe um rascunho com este nome. Por favor, escolha outro.', 'Nome Duplicado');
          this.openSaveDraftDialog();
          return;
        }

        this.saveLocalDraft(false, result.draftName, undefined, false);
        this.checkForDrafts();
      }
    });
  }

  private checkForDrafts() {
    this.availableDrafts = this.formDraftService.getDraftsByType(this.FORM_TYPE);
    console.log('[checkForDrafts] Rascunhos encontrados:', this.availableDrafts);
    if (this.availableDrafts.length === 0) {
      this.showFormFields = true;
    } else if (this.isEdit || this.selectedDraft) {
      this.showFormFields = true;
    }
  }

  handleDraftSelection(draft: FormDraft | null) {
    this.showFormFields = true;
    if (!draft) {
      this.selectedDraft = null;
      this.selectedAvalistas = [];
      this.vendaForm.reset({
        dataVenda: new Date(),
        valor: 0,
        valorFinal: 0,
        observacao: '',
      });
      (this.vendaForm.get('pagamentos') as FormArray).clear();
      (this.vendaForm.get('avalistasIds') as FormArray).clear();
      this.addPagamento();
      this.initialFormValue = JSON.stringify(this.vendaForm.value);
      this.lastSavedDraftValue = this.vendaForm.value;
      this.actionsService.hasFormChanges.set(false);
      return;
    }

    this.selectedDraft = draft;
    this.vendaForm.patchValue(draft.data);

    // Se o rascunho tem pagamentos, reconstruímos o FormArray
    if (draft.data.pagamentos && Array.isArray(draft.data.pagamentos)) {
      const paymentsArray = this.vendaForm.get('pagamentos') as FormArray;
      paymentsArray.clear();
      draft.data.pagamentos.forEach((payment: any) => {
        paymentsArray.push(this.createPagamentoFormGroup(payment));
      });
    }

    // Se o rascunho tem avalistas, reconstruímos o FormArray
    if (draft.data.avalistasIds && Array.isArray(draft.data.avalistasIds)) {
      const avalistasArray = this.vendaForm.get('avalistasIds') as FormArray;
      avalistasArray.clear();
      this.selectedAvalistas = [];

      draft.data.avalistasIds.forEach((id: string, index: number) => {
        avalistasArray.push(this.fb.control(id));

        // Se temos os detalhes salvos, restauramos
        if (draft.data.avalistasDetails && draft.data.avalistasDetails[index]) {
          this.selectedAvalistas.push(draft.data.avalistasDetails[index]);
        } else {
          // Fallback caso não tenha detalhes (rascunhos antigos)
          this.selectedAvalistas.push({
            personId: id,
            name: `ID: ${id.slice(0, 8)}...`,
          } as any);
        }
      });
    }

    this.vendaForm.get('avalistaSearchControl')?.setValue('', { emitEvent: false });

    this.initialFormValue = JSON.stringify(this.vendaForm.value);
    this.lastSavedDraftValue = this.vendaForm.value;
    this.toastr.success('Rascunho carregado com sucesso');
    this.actionsService.hasFormChanges.set(false);
  }

  removeDraft(draft: FormDraft, event: MouseEvent) {
    event.stopPropagation(); // Evita selecionar o rascunho ao clicar em excluir
    this.formDraftService.removeDraftById(draft.id);
    this.availableDrafts = this.formDraftService.getDraftsByType(this.FORM_TYPE);

    if (this.selectedDraft?.id === draft.id) {
      this.selectedDraft = null;
    }

    if (this.availableDrafts.length === 0) {
      this.showFormFields = true;
    }

    this.toastr.info('Rascunho excluído');
  }

  // =============================================================

  private loadVenda() {
    if (!this.vendaId) return;
    this.loading.set(true);
    this.vendaService
      .getVendaById(this.vendaId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (venda) => {
          this.vendaForm.patchValue({
            vehicle: { id: venda.vehicleId, name: '' },
            buyer: { id: venda.buyerPersonId, name: '' },
            seller: { id: venda.sellerPersonId, name: '' },
            dataVenda: new Date(venda.dataVenda),
            valor: venda.valor,
            valorFinal: venda.valorFinal,
            observacao: venda.observacao,
            retornoBancoId: venda.retornoBancoId || '',
            retornoNumero: venda.retornoNumero || null,
            retornoValor: venda.retornoValor || 0,
            retornoCreditarDia: venda.retornoCreditarDia ? new Date(venda.retornoCreditarDia) : null,
          });

          // Reconstruir pagamentos
          this.pagamentos.clear();
          if (venda.pagamentos && Array.isArray(venda.pagamentos)) {
            venda.pagamentos.forEach((pag: any) => {
              this.pagamentos.push(this.createPagamentoFormGroup(pag));
            });
          }

          // Reconstruir avalistas
          this.avalistasIds.clear();
          this.selectedAvalistas = [];
          if (venda.avalistasIds && Array.isArray(venda.avalistasIds)) {
            venda.avalistasIds.forEach((id: string) => {
              this.avalistasIds.push(this.fb.control(id));
              this.selectedAvalistas.push({
                personId: id,
                name: `ID: ${id.slice(0, 8)}...`,
              } as any);
            });
          }

          // Reconstruir despesas
          this.despesas.clear();
          if (venda.despesas && Array.isArray(venda.despesas)) {
            venda.despesas.forEach((desp: any) => {
              this.despesas.push(this.createDespesaFormGroup(desp));
            });
          }

          // Força a atualização do valor inicial
          setTimeout(() => {
            this.initialFormValue = JSON.stringify(this.vendaForm.value);
            this.lastSavedDraftValue = this.vendaForm.value;
          }, 300);
        },
        error: () => this.toastr.error('Erro ao carregar dados da venda'),
      });
  }

  onSubmit() {
    if (this.vendaForm.invalid) {
      this.toastr.warning('Por favor, preencha todos os campos obrigatórios corretamente.');
      return;
    }

    this.isSaving = true;
    this.isSubmitting.set(true);
    const raw = this.vendaForm.value;

    // Serializa a data como 'yyyy-MM-dd' puro para evitar problema de
    // timezone com @PastOrPresent do backend (Date → ISO 8601 inclui offset)
    const dataVendaFormatted = this.formatDateToISO(raw.dataVenda);

    const formData: VendaRequestDto = {
      ...raw,
      vehicleId: raw.vehicle?.id,
      buyerPersonId: raw.buyer?.id,
      sellerPersonId: raw.seller?.id,
      dataVenda: dataVendaFormatted,
      valor: raw.valor || 0,
      valorFinal: raw.valorFinal || 0,
      retornoBancoId: raw.retornoBancoId || null,
      retornoNumero: raw.retornoNumero || null,
      retornoValor: raw.retornoValor || 0,
      retornoCreditarDia: raw.retornoCreditarDia ? this.formatDateToISO(raw.retornoCreditarDia) : null,
      despesas: (raw.despesas || []).map((d: any) => ({
        ...d,
        valorCusto: d.valorCusto !== null && d.valorCusto !== undefined ? d.valorCusto : 0,
        dataPagamento: this.formatDateToISO(d.dataPagamento)
      })),
      // Remove campos auxiliares
      vehicle: undefined,
      buyer: undefined,
      seller: undefined,
      avalistaSearchControl: undefined,
    };

    const request = this.isEdit
      ? this.vendaService.update(this.vendaId!, formData)
      : this.vendaService.create(formData);

    request.pipe(finalize(() => this.isSubmitting.set(false))).subscribe({
      next: () => {
        this.toastr.success(`Venda ${this.isEdit ? 'atualizada' : 'registrada'} com sucesso!`);

        // Se havia um rascunho selecionado via seletor, removemos ele pelo ID específico
        if (this.selectedDraft) {
          this.formDraftService.removeDraftById(this.selectedDraft.id);
        }

        // Limpa rascunhos vinculados ao ID (fallback e edição)
        this.formDraftService.removeDraft(this.FORM_TYPE, this.vendaId || undefined);

        this.initialFormValue = JSON.stringify(this.vendaForm.value);
        this.actionsService.hasFormChanges.set(false);
        this.router.navigate(['/vendas']);
      },
      error: (err) => {
        console.error(err);
        const msg = extractErrorMessage(err, 'Erro ao salvar venda. Verifique os dados e tente novamente.');
        this.toastr.error(msg);
      },
    });
  }

  /**
   * Formata um objeto Date para a string 'yyyy-MM-dd' sem timezone,
   * compatível com java.time.LocalDate no backend.
   */
  private formatDateToISO(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  goBack() {
    this.router.navigate(['/vendas']);
  }
}
