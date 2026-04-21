import { Component, OnInit, signal, LOCALE_ID } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { ActivatedRoute, Router } from '@angular/router';
import { MAT_DATE_LOCALE } from '@angular/material/core';
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
  switchMap,
  tap,
} from 'rxjs';

import { ContentHeaderComponent } from '@components/content-header/content-header.component';
import { VendaService } from '@services/venda.service';
import { VehicleService } from '@services/vehicle.service';
import { PersonService } from '@services/person.service';
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

import { Vehicle } from '@interfaces/vehicle';
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
  ],
  templateUrl: './venda-form.component.html',
  styleUrls: ['./venda-form.component.scss'],
  providers: [
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: MAT_DATE_LOCALE, useValue: 'pt-BR' },
  ],
})
export class VendaFormComponent implements OnInit {
  isEdit = false;
  vendaId: string | null = null;
  title = 'Nova Venda';
  subtitle = 'Registrar uma nova venda de veículo';
  loading = signal(false);
  isSubmitting = signal(false);

  // Formulário Reativo
  vendaForm: FormGroup;

  // Listas de Autocomplete
  filteredVehicles: Vehicle[] = [];
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
    private toastr: ToastrService
  ) {
    // Registra o locale pt-BR globalmente para o datepicker
    registerLocaleData(localePt, 'pt-BR');

    this.vendaForm = this.fb.group({
      vehicleId: ['', Validators.required],
      vehicleDisplay: ['', Validators.required], // Campo apenas para o autocomplete
      buyerPersonId: ['', Validators.required],
      buyerDisplay: ['', Validators.required], // Campo apenas para o autocomplete
      sellerPersonId: [''],
      sellerDisplay: [''], // Campo apenas para o autocomplete
      dataVenda: [new Date(), Validators.required],
      valor: ['0,00', [Validators.required]],
      valorFinal: ['0,00', [Validators.required]],
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

  /**
   * Ao ganhar foco, converte a string formatada de volta para número puro
   * para facilitar a edição pelo usuário (ex: "150.000,00" → "150000")
   */
  onValorFocus(field: 'valor' | 'valorFinal') {
    const ctrl = this.vendaForm.get(field);
    if (!ctrl) return;
    const numericValue = this.parseBRLToNumber(ctrl.value.toString());
    ctrl.setValue(numericValue === 0 ? '' : numericValue.toString(), { emitEvent: false });
  }

  /**
   * Ao perder foco, formata o número como moeda pt-BR
   * (ex: 150000 → "150.000,00")
   */
  onValorBlur(field: 'valor' | 'valorFinal') {
    const ctrl = this.vendaForm.get(field);
    if (!ctrl) return;
    const numericValue = this.parseBRLToNumber(ctrl.value.toString());
    ctrl.setValue(this.formatBRL(numericValue), { emitEvent: false });
  }

  /** Converte string BRL para número: "150.000,00" → 150000 */
  private parseBRLToNumber(value: string): number {
    if (!value) return 0;
    // Remove pontos de milhar e substitui vírgula por ponto decimal
    const clean = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  }

  /** Formata número como moeda BRL: 150000 → "150.000,00" */
  private formatBRL(value: number): string {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  }

  private initAutocompletes() {
    const storeId = this.storeContextService.currentStoreId;

    // Busca de Veículos (Somente em estoque e da loja atual)
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
      });

    // Busca de Compradores
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
      });

    // Busca de Vendedores
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
      });

    // Busca de Avalistas
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
      });
  }

  // Handlers de seleção do Autocomplete
  onVehicleSelected(vehicle: Vehicle) {
    const valorVenda = vehicle.valorVenda ? parseFloat(vehicle.valorVenda.toString().replace(',', '.')) : 0;
    const valorFormatted = this.formatBRL(valorVenda);
    this.vendaForm.patchValue({
      vehicleId: vehicle.vehicleId,
      vehicleDisplay: `${vehicle.brand || ''} ${vehicle.model || ''} (${vehicle.plate})`.trim(),
      valor: valorFormatted,
      valorFinal: valorFormatted,
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
  addPagamento() {
    const pagamentoForm = this.fb.group({
      formaPagamento: ['PIX', Validators.required],
      valor: [0, [Validators.required, Validators.min(0.01)]],
      vencimento: [new Date()],
      descricao: [''],
    });
    this.pagamentos.push(pagamentoForm);
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

    this.isSubmitting.set(true);
    const raw = this.vendaForm.value;

    // Serializa a data como 'yyyy-MM-dd' puro para evitar problema de
    // timezone com @PastOrPresent do backend (Date → ISO 8601 inclui offset)
    const dataVendaFormatted = this.formatDateToISO(raw.dataVenda);

    const formData: VendaRequestDto = {
      ...raw,
      dataVenda: dataVendaFormatted,
      // Converte os valores formatados (string BRL) de volta para número
      valor: this.parseBRLToNumber(raw.valor?.toString() || '0'),
      valorFinal: this.parseBRLToNumber(raw.valorFinal?.toString() || '0'),
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
        this.router.navigate(['/vendas']);
      },
      error: (err) => {
        console.error(err);
        // Extrai mensagem específica do backend se disponível
        const msg =
          err?.error?.errorMessage ||
          err?.error?.message ||
          'Erro ao salvar venda. Verifique os dados e tente novamente.';
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
