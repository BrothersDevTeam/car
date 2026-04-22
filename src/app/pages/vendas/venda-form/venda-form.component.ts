import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
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
import { MatChipsModule } from '@angular/material/chips';
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
  ],
  templateUrl: './venda-form.component.html',
  styleUrls: ['./venda-form.component.scss'],
})
export class VendaFormComponent
  implements OnInit, OnDestroy, CanComponentDeactivate
{
  isEdit = false;
  vendaId: string | null = null;
  title = 'Nova Venda';
  subtitle = 'Registrar uma nova venda de veículo';
  loading = signal(false);
  isSubmitting = signal(false);
  isSaving = false;

  private initialFormValue: string = '';
  private readonly FORM_TYPE = 'venda';
  private subscriptions = new Subscription();

  availableDrafts: FormDraft[] = [];
  selectedDraft: FormDraft | null = null;

  // Formulário Reativo
  vendaForm: FormGroup;

  // Listas de Autocomplete
  filteredVehicles: VehicleList[] | Vehicle[] = [];
  filteredBuyers: Person[] = [];
  filteredSellers: Person[] = [];
  filteredAvalistas: Person[] = [];

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
    private actionsService: ActionsService
  ) {
    this.vendaForm = this.fb.group({
      vehicleId: ['', Validators.required],
      vehicleDisplay: ['', Validators.required], // Campo apenas para o autocomplete
      buyerPersonId: ['', Validators.required],
      buyerDisplay: ['', Validators.required], // Campo apenas para o autocomplete
      sellerPersonId: [''],
      sellerDisplay: [''], // Campo apenas para o autocomplete
      dataVenda: [new Date(), Validators.required],
      valor: [0, [Validators.required, Validators.min(0.01)]],
      valorFinal: [0, [Validators.required, Validators.min(0.01)]],
      observacao: [''],
      pagamentos: this.fb.array([]),
      avalistasIds: this.fb.array([]),
      avalistaSearchControl: [''], // Controle auxiliar para busca
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

    this.initAutocompletes();

    // Carrega o valor inicial para detectar mudanças
    setTimeout(() => {
      this.initialFormValue = JSON.stringify(this.vendaForm.value);
      this.checkForDrafts();
    }, 500);

    this.subscriptions.add(
      this.vendaForm.valueChanges.subscribe(() => {
        this.actionsService.hasFormChanges.set(this.hasUnsavedChanges());
      })
    );
  }

  ngOnDestroy() {
    this.actionsService.hasFormChanges.set(false);
    this.subscriptions.unsubscribe();
  }

  private initAutocompletes() {
    const storeId = this.storeContextService.currentStoreId;

    // Busca de Veículos (Somente em estoque e da loja atual)
    this.subscriptions.add(
      this.vendaForm
        .get('vehicleDisplay')
        ?.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged(),
          filter((value) => typeof value === 'string' && value.length >= 2),
          switchMap((value) =>
            this.vehicleService.getPaginatedData(0, 50, {
              search: value,
              onlyInStock: true,
              storeId: storeId || undefined,
            })
          )
        )
        .subscribe((response) => {
          this.filteredVehicles = response.content;
        })
    );

    // Busca de Compradores
    this.subscriptions.add(
      this.vendaForm
        .get('buyerDisplay')
        ?.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged(),
          filter((value) => typeof value === 'string' && value.length >= 2),
          switchMap((value) =>
            this.personService.getPaginatedData(0, 50, {
              search: value,
              storeId: storeId || undefined,
            })
          )
        )
        .subscribe((response) => {
          this.filteredBuyers = response.content;
        })
    );

    // Busca de Vendedores
    this.subscriptions.add(
      this.vendaForm
        .get('sellerDisplay')
        ?.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged(),
          filter((value) => typeof value === 'string' && value.length >= 2),
          switchMap((value) =>
            this.personService.getPaginatedData(0, 50, {
              search: value,
              storeId: storeId || undefined,
            })
          )
        )
        .subscribe((response) => {
          this.filteredSellers = response.content;
        })
    );

    // Busca de Avalistas
    this.subscriptions.add(
      this.vendaForm
        .get('avalistaSearchControl')
        ?.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged(),
          filter((value) => typeof value === 'string' && value.length >= 2),
          switchMap((value) =>
            this.personService.getPaginatedData(0, 50, {
              search: value,
              storeId: storeId || undefined,
            })
          )
        )
        .subscribe((response) => {
          this.filteredAvalistas = response.content;
        })
    );
  }

  // Handlers de seleção do Autocomplete
  onVehicleSelected(vehicle: Vehicle | VehicleList) {
    const valorVenda = vehicle.valorVenda
      ? parseFloat(vehicle.valorVenda.toString().replace(',', '.'))
      : 0;

    this.vendaForm.patchValue({
      vehicleId: vehicle.vehicleId,
      vehicleDisplay:
        `${vehicle.brand || ''} ${vehicle.model || ''} (${vehicle.plate})`.trim(),
      valor: valorVenda,
      valorFinal: valorVenda,
    });
  }

  onBuyerSelected(person: Person) {
    this.vendaForm.patchValue({
      buyerPersonId: person.personId,
      buyerDisplay: person.name,
    });
  }

  onSellerSelected(person: Person) {
    this.vendaForm.patchValue({
      sellerPersonId: person.personId,
      sellerDisplay: person.name,
    });
  }

  // Gestão de Pagamentos
  private createPagamentoFormGroup(data?: any): FormGroup {
    return this.fb.group({
      formaPagamento: [data?.formaPagamento || 'PIX', Validators.required],
      valor: [data?.valor || 0, [Validators.required, Validators.min(0.01)]],
      vencimento: [data?.vencimento ? new Date(data.vencimento) : new Date()],
      descricao: [data?.descricao || ''],
    });
  }

  addPagamento() {
    this.pagamentos.push(this.createPagamentoFormGroup());
  }

  removePagamento(index: number) {
    this.pagamentos.removeAt(index);
  }

  // Gestão de Avalistas
  addAvalistaDirectly(person: Person) {
    if (this.avalistasIds.value.includes(person.personId)) {
      this.toastr.warning('Avalista já adicionado');
      return;
    }
    this.avalistasIds.push(this.fb.control(person.personId));
    // Podemos manter uma lista local para exibição dos nomes se necessário
    this.toastr.success(`Avalista ${person.name} adicionado`);
  }

  removeAvalista(index: number) {
    this.avalistasIds.removeAt(index);
  }

  // ===== Implementação de CanComponentDeactivate / Rascunhos =====

  hasUnsavedChanges(): boolean {
    if (this.isSaving) return false;

    if (!this.initialFormValue) return false;

    const currentValue = JSON.stringify(this.vendaForm.value);
    const hasChanges = currentValue !== this.initialFormValue;

    return hasChanges;
  }

  canSaveForm(): boolean {
    // Para rascunho local, permitimos salvar se houver qualquer dado relevante
    const raw = this.vendaForm.value;
    return !!(raw.vehicleId || raw.buyerPersonId || raw.sellerPersonId);
  }

  saveForm(isDraft: boolean): Observable<boolean> {
    if (isDraft) {
      this.saveLocalDraft();
      return of(true);
    }
    this.onSubmit();
    return of(true);
  }

  saveLocalDraft(silent: boolean = false, name?: string): void {
    this.isSaving = true;
    const draftName = name || `Venda em ${new Date().toLocaleString()}`;

    this.formDraftService.saveDraft(
      this.FORM_TYPE,
      this.vendaForm.value,
      this.vendaId || undefined,
      draftName
    );

    // Resetamos o estado de mudanças para permitir a navegação fluida
    this.initialFormValue = JSON.stringify(this.vendaForm.value);
    this.actionsService.hasFormChanges.set(false);
    this.vendaForm.markAsPristine();

    if (!silent) {
      this.toastr.info('Rascunho salvo localmente');
    }

    this.isSaving = false;
  }

  private checkForDrafts() {
    this.availableDrafts = this.formDraftService.getDraftsByType(
      this.FORM_TYPE
    );
    console.log(
      '[checkForDrafts] Rascunhos encontrados:',
      this.availableDrafts
    );
  }

  handleDraftSelection(draft: FormDraft | null) {
    if (!draft) {
      this.selectedDraft = null;
      this.vendaForm.reset({
        saleDate: new Date(),
        items: [],
        payments: [],
      });
      this.initialFormValue = JSON.stringify(this.vendaForm.value);
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
      draft.data.avalistasIds.forEach((id: string) => {
        avalistasArray.push(this.fb.control(id));
      });
    }

    this.initialFormValue = JSON.stringify(this.vendaForm.value);
    this.toastr.success('Rascunho carregado com sucesso');
    this.actionsService.hasFormChanges.set(false);
  }

  removeDraft(draft: FormDraft, event: MouseEvent) {
    event.stopPropagation(); // Evita selecionar o rascunho ao clicar em excluir
    this.formDraftService.removeDraftById(draft.id);
    this.availableDrafts = this.formDraftService.getDraftsByType(
      this.FORM_TYPE
    );

    if (this.selectedDraft?.id === draft.id) {
      this.selectedDraft = null;
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
            vehicleId: venda.vehicleId,
            buyerPersonId: venda.buyerPersonId,
            sellerPersonId: venda.sellerPersonId,
            dataVenda: new Date(venda.dataVenda),
            valor: venda.valor,
            valorFinal: venda.valorFinal,
            observacao: venda.observacao,
          });

          // TODO: Popular displays e FormArrays em uma implementação real refinada
          // Para simplificar agora, focamos na criação.
        },
        error: () => this.toastr.error('Erro ao carregar dados da venda'),
      });
  }

  onSubmit() {
    if (this.vendaForm.invalid) {
      this.toastr.warning(
        'Por favor, preencha todos os campos obrigatórios corretamente.'
      );
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
      dataVenda: dataVendaFormatted,
      // Converte os valores formatados (string BRL) de volta para número
      valor: raw.valor || 0,
      valorFinal: raw.valorFinal || 0,
      // Remove campos auxiliares de display que não fazem parte do DTO
      vehicleDisplay: undefined,
      buyerDisplay: undefined,
      sellerDisplay: undefined,
      avalistaSearchControl: undefined,
    };

    const request = this.isEdit
      ? this.vendaService.update(this.vendaId!, formData)
      : this.vendaService.create(formData);

    request.pipe(finalize(() => this.isSubmitting.set(false))).subscribe({
      next: () => {
        this.toastr.success(
          `Venda ${this.isEdit ? 'atualizada' : 'registrada'} com sucesso!`
        );

        // Se havia um rascunho selecionado via seletor, removemos ele pelo ID específico
        if (this.selectedDraft) {
          this.formDraftService.removeDraftById(this.selectedDraft.id);
        }

        // Limpa rascunhos vinculados ao ID (fallback e edição)
        this.formDraftService.removeDraft(
          this.FORM_TYPE,
          this.vendaId || undefined
        );

        this.initialFormValue = JSON.stringify(this.vendaForm.value);
        this.actionsService.hasFormChanges.set(false);
        this.router.navigate(['/vendas']);
      },
      error: (err) => {
        console.error(err);
        const msg = extractErrorMessage(
          err,
          'Erro ao salvar venda. Verifique os dados e tente novamente.'
        );
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
