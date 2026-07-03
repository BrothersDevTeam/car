import {
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  signal,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ToastrService } from 'ngx-toastr';
import { Subscription, of, Observable } from 'rxjs';
import { CurrencyInputComponent } from '@components/currency-input/currency-input.component';

import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';
import { PrimarySelectComponent } from '@components/primary-select/primary-select.component';
import { CustomSelectComponent } from '@components/custom-select/custom-select.component';
import { DrawerComponent } from '@components/drawer/drawer.component';
import { NaturalPersonFormComponent } from '@forms/client/natural-person-form/natural-person-form.component';
import { LegalEntityFormComponent } from '@forms/client/legal-entity-form/legal-entity-form.component';
import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';
import { SaveDraftDialogComponent, SaveDraftDialogResult } from '@components/dialogs/save-draft-dialog/save-draft-dialog.component';

import type { NaturezaOperacao, Nfe } from '@interfaces/nfe';
import type { Person } from '@interfaces/person';
import { Vehicle, VehicleList } from '@interfaces/vehicle';

import { NfeService } from '@services/nfe.service';
import { PersonService } from '@services/person.service';
import { VehicleService } from '@services/vehicle.service';
import { extractErrorMessage } from '@utils/error-utils';
import { StoreContextService } from '@services/store-context.service';
import { ParametroFiscalService, ParametroFiscal } from '@services/parametro-fiscal.service';
import { FormDraftService, FormDraft } from '@services/form-draft.service';

@Component({
  selector: 'app-nfe-saida-form',
  imports: [
    PrimarySelectComponent,
    ReactiveFormsModule,
    MatButtonModule,
    CurrencyInputComponent,
    MatTabsModule,
    MatIconModule,
    MatRadioModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCardModule,
    MatTooltipModule,
    CustomSelectComponent,
    DrawerComponent,
    NaturalPersonFormComponent,
    LegalEntityFormComponent,
  ],
  templateUrl: './nfe-saida-form.component.html',
  styleUrl: './nfe-saida-form.component.scss',
})
export class NfeSaidaFormComponent implements OnInit, OnChanges, OnDestroy {
  private subscriptions = new Subscription();
  submitted = false;

  private readonly FORM_TYPE = 'nfe-saida';
  protected availableDrafts: FormDraft[] = [];
  public selectedDraftId: string | null = null;
  protected lastSavedDraftValue: any = null;
  protected draftSelectorClicked = false;
  protected showFormFields = false;
  private initialFormValue: any = null;
  protected isSaving = false;
  protected isInitializing = false;

  // Listas para os selects/autocompletes
  // Listas para os selects formatadas para o CustomSelect
  vehicles: { id: string; name: string }[] = [];
  persons: { id: string; name: string }[] = [];

  // Sinais para controlar os drawers
  openPersonForm = signal(false);
  selectedPersonToEdit = signal<Person | null>(null);
  openVehicleForm = signal(false); // No futuro podemos abrir o form de veículo aqui também
  tiposNfeSaida: { value: NaturezaOperacao; label: string }[] = [
    {
      value: 'VENDA DE VEICULO USADO' as NaturezaOperacao,
      label: 'Venda de Veículo Usado',
    },
    {
      value: 'DEVOLUÇÃO DE CONSIGNAÇÃO' as NaturezaOperacao,
      label: 'Devolução de Consignação',
    },
    {
      value: 'VENDA EM CONSIGNAÇÃO' as NaturezaOperacao,
      label: 'Venda em Consignação',
    },
    {
      value: 'DEVOLUÇÃO SIMBÓLICA DE CONSIGNAÇÃO' as NaturezaOperacao,
      label: 'Devolução Simbólica de Consignação',
    },
    {
      value: 'DEVOLUÇÃO DE COMPRA' as NaturezaOperacao,
      label: 'Devolução de Compra',
    },
    {
      value: 'SAÍDA PARA CONTRATO EM COMISSÃO' as NaturezaOperacao,
      label: 'Saída para Contrato em Comissão',
    },
    {
      value: 'TRANSFERÊNCIA DE MERCADORIA ADQUIRIDA OU RECEBIDA DE TERCEIROS' as NaturezaOperacao,
      label: 'Transferência de Mercadoria',
    },
  ];

  finalidadesEmissao = [
    { value: '1', label: '1 - Normal' },
    { value: '2', label: '2 - Complementar' },
    { value: '3', label: '3 - Devolução de Mercadoria' },
    { value: '4', label: '4 - Ajuste' },
  ];

  consumidoresFinais = [
    { value: '0', label: '0 - Normal' },
    { value: '1', label: '1 - Consumidor Final' },
  ];

  presencasComprador = [
    { value: '0', label: '0 - Não se aplica' },
    { value: '1', label: '1 - Operação presencial' },
    { value: '2', label: '2 - Operação não presencial, Internet' },
    { value: '3', label: '3 - Operação não presencial, Teleatendimento' },
    { value: '4', label: '4 - NFC-e com entrega a domicílio' },
    { value: '5', label: '5 - Operação presencial, fora do estabelecimento' },
    { value: '9', label: '9 - Operação não presencial, outros' },
  ];

  indicadoresIntermediario = [
    { value: '0', label: '0 - Sem intermediário (venda direta)' },
    { value: '1', label: '1 - Em site/plataforma de terceiros (marketplace)' },
  ];

  modalidadesFrete = [
    { value: '0', label: '0 - Contratação por conta do Remetente (CIF)' },
    { value: '1', label: '1 - Contratação por conta do Destinatário (FOB)' },
    { value: '2', label: '2 - Contratação por conta de Terceiros' },
    { value: '3', label: '3 - Transporte Próprio por conta do Remetente' },
    { value: '4', label: '4 - Transporte Próprio por conta do Destinatário' },
    { value: '9', label: '9 - Sem Ocorrência de Transporte' },
  ];

  readonly dialog = inject(MatDialog);
  private formBuilderService = inject(FormBuilder);
  private storeContextService = inject(StoreContextService);

  @ViewChild('submitButton', { static: false, read: ElementRef })
  submitButton!: ElementRef<HTMLButtonElement>;

  @Input() dataForm: Nfe | null = null;
  @Input() draft: FormDraft | null | undefined = null;
  @Output() formSubmitted = new EventEmitter<void>();
  @Output() formChanged = new EventEmitter<boolean>();

  private nfeService = inject(NfeService);
  private personService = inject(PersonService);
  private vehicleService = inject(VehicleService);
  private toastrService = inject(ToastrService);
  private parametroFiscalService = inject(ParametroFiscalService);
  private formDraftService = inject(FormDraftService);

  parametroFiscal: ParametroFiscal | null = null;
  loadingParametros = false;

  public get nfeForm(): FormGroup {
    return this.form;
  }

  protected form: FormGroup = this.formBuilderService.group({
    storeId: [''],
    person: this.formBuilderService.group({
      id: ['', Validators.required],
      name: [''],
    }),
    nfeNaturezaOperacao: ['', Validators.required],
    nfePreenchimentoManualImpostos: [false],
    itemTipo: ['veiculo'], // 'veiculo' ou 'produto'
    nfeItens: this.formBuilderService.array([]),
    nfeFinalidadeEmissao: ['1', Validators.required],
    nfeConsumidorFinal: ['1', Validators.required],
    nfePresencaComprador: ['1', Validators.required],
    nfeIndicadorIntermediario: ['0', Validators.required],
    modalidadeFrete: ['9', Validators.required],
    nfeInformacoesAdicionaisFisco: [
      'BASE DE CALCULO DO ICMS REDUZIDA 72.22% DE ACORDO COM O ITEM 11 DO ANEXO IV DO RICMS-MG. DECRETO 48.055/2020, OBSERVANDO O DISPOSTO NO SUBITEM 11.7. OS TRIBUTOS FEDERAIS INCIDENTES SOBRE ESTA OPERAÇÃO SERÃO RECOLHIDOS CONFORME ART.5 LEI Nº 9.716/98. PERCENTUAL DE IMPOSTOS CONFORME LEI 12.741 / 8,65%.\nNF DE ENTRADA N.: SERIE: DATA: ',
    ],
    nfeSincronizarRenave: [false],
  });

  constructor() {}

  ngOnInit(): void {
    this.isInitializing = true;
    this.showFormFields = !!this.dataForm || !!this.draft;

    if (!this.dataForm && !this.draft) {
      this.addItem();
    }

    // Observar mudanças no formulário
    this.subscriptions.add(
      this.form.valueChanges.subscribe(() => {
        const hasChanges = this.hasUnsavedChanges();
        this.formChanged.emit(hasChanges);
      }),
    );

    // Contexto Global de Loja
    this.subscriptions.add(
      this.storeContextService.currentStoreId$.subscribe((storeId) => {
        if (storeId) {
          this.loadInitialData(storeId);
          this.loadParametrosFiscais(storeId);
        }
      }),
    );

    // Observar mudanças no itemTipo para ajustar a lista
    this.subscriptions.add(
      this.form.get('itemTipo')?.valueChanges.subscribe(() => {
        this.itens.clear();
        this.addItem();
      }),
    );

    // Inscreve para atualizar lista quando rascunhos mudarem
    this.subscriptions.add(
      this.formDraftService.draftsChanges.subscribe(() => {
        this.loadAvailableDrafts();
      }),
    );

    this.loadAvailableDrafts();

    setTimeout(() => {
      this.captureInitialFormValue();
      this.isInitializing = false;
    }, 500);
  }

  get itens(): FormArray {
    return this.form.get('nfeItens') as FormArray;
  }

  createItem(data: any = {}): FormGroup {
    const isVeiculo = this.form?.get('itemTipo')?.value === 'veiculo';

    const group = this.formBuilderService.group({
      vehicle: this.formBuilderService.group({
        id: [data.vehicleId || '', isVeiculo ? [Validators.required] : []],
        name: [data.vehicleName || ''],
      }),
      itemDescricao: [data.itemDescricao || '', !isVeiculo ? [Validators.required] : []],
      itemCodigoProduto: [data.itemCodigoProduto || ''],
      itemUnidadeComercial: [data.itemUnidadeComercial || 'UN'],
      itemQuantidadeComercial: [data.itemQuantidadeComercial || 1, [Validators.required]],
      itemValorUnitarioComercial: [data.itemValorUnitarioComercial || '', [Validators.required]],
      itemValorBruto: [{ value: data.itemValorBruto || '', disabled: true }],

      // Campos fiscais
      itemCodigoNcm: [data.itemCodigoNcm || ''],
      itemCfop: [data.itemCfop || ''],
      icmsOrigem: [data.icmsOrigem || '0'],
      icmsSituacaoTributaria: [data.icmsSituacaoTributaria || ''],
      icmsValorBaseCalculo: [data.icmsValorBaseCalculo || ''],
      icmsAliquota: [data.icmsAliquota || ''],
      icmsValor: [data.icmsValor || ''],
      pisSituacaoTributaria: [data.pisSituacaoTributaria || ''],
      pisValorBaseCalculo: [data.pisValorBaseCalculo || ''],
      pisAliquota: [data.pisAliquota || ''],
      pisValor: [data.pisValor || ''],
      cofinsSituacaoTributaria: [data.cofinsSituacaoTributaria || ''],
      cofinsValorBaseCalculo: [data.cofinsValorBaseCalculo || ''],
      cofinsAliquota: [data.cofinsAliquota || ''],
      cofinsValor: [data.cofinsValor || ''],
    });

    this.subscriptions.add(
      group.valueChanges.subscribe((vals) => {
        const qtd = Number(vals.itemQuantidadeComercial || 0);
        const unit = Number(vals.itemValorUnitarioComercial || 0);
        const total = (qtd * unit).toFixed(2);
        if (group.get('itemValorBruto')?.value !== total) {
          group.get('itemValorBruto')?.setValue(total, { emitEvent: false });
        }
      }),
    );

    return group;
  }

  addItem(): void {
    if (this.form.get('itemTipo')?.value === 'veiculo' && this.itens.length >= 1) {
      return;
    }
    this.itens.push(this.createItem());
  }

  removeItem(index: number): void {
    if (this.itens.length > 1) {
      this.itens.removeAt(index);
    }
  }

  /**
   * Carrega os parâmetros fiscais da loja selecionada.
   * Além de armazenar as configurações gerais de tributação e numeração, define a preferência padrão
   * de sincronização automática com o RENAVE (true ou false) caso seja um preenchimento de nota nova.
   */
  private loadParametrosFiscais(storeId: string) {
    this.loadingParametros = true;
    this.parametroFiscalService.getByStoreId(storeId).subscribe({
      next: (params) => {
        this.parametroFiscal = params;
        this.loadingParametros = false;

        // Define a preferência padrão de sincronização do RENAVE configurada na loja.
        // Isso só ocorre quando for uma nova nota (sem rascunho em andamento e sem edição de nota existente).
        if (params && !this.dataForm && !this.draft) {
          const syncDefault = params.parametroFiscalSincronizarRenavePadrao === true;
          this.form.patchValue({ nfeSincronizarRenave: syncDefault });
        }
      },
      error: () => {
        this.loadingParametros = false;
      },
    });
  }

  private loadInitialData(storeId: string) {
    this.vehicleService.getPaginatedData(0, 1000, { storeId }).subscribe((response) => {
      this.vehicles = (response.content || []).map((v) => ({
        id: v.vehicleId,
        name: this.getVehicleDisplay(v as Vehicle),
      }));
      this.tryPatchForm();
    });

    this.personService.getPaginatedData(0, 1000, { storeId }).subscribe((response) => {
      this.persons = (response.content || []).map((p) => ({
        id: p.personId,
        name: this.getPersonDisplay(p),
      }));
      this.tryPatchForm();
    });
  }

  // Métodos para o Drawer de Person (chamados pelo CustomSelect)
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
    if (this.storeContextService.currentStoreId) {
      this.loadInitialData(this.storeContextService.currentStoreId);
    }
  }

  onVehicleSelectedForItem(option: any, index: number) {
    if (!option || !option.id) return;

    this.vehicleService.getById(option.id).subscribe((vehicle) => {
      const itemGroup = this.itens.at(index) as FormGroup;

      // Helper para parsing robusto
      const parse = (v: any) => {
        if (!v) return 0;
        let s = v.toString();
        if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
        else if (s.includes(',')) s = s.replace(',', '.');
        return parseFloat(s) || 0;
      };

      const vCompra = parse(vehicle.valorCompra);
      const vVenda = parse(vehicle.valorVenda);

      // Fallback: Se não houver valor de venda, sugere o de compra
      const valor = vVenda || vCompra;

      itemGroup.patchValue({
        vehicle: {
          id: vehicle.vehicleId,
          name: this.getVehicleDisplay(vehicle),
        },
        itemDescricao: this.getVehicleDisplay(vehicle),
        itemValorUnitarioComercial: valor,
        itemValorBruto: valor.toFixed(2),
      });
    });
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['dataForm'] && this.dataForm) {
      this.isInitializing = true;
      this.tryPatchForm();
      this.showFormFields = true;
      setTimeout(() => {
        this.captureInitialFormValue();
        this.isInitializing = false;
      }, 500);
    }
    if (changes['draft'] && this.draft) {
      this.loadDraftData(this.draft);
    }
  }

  private tryPatchForm() {
    if (!this.dataForm || this.vehicles.length === 0 || this.persons.length === 0) {
      return;
    }

    const itemTipo = this.dataForm.vehicleId ? 'veiculo' : 'produto';
    this.form.get('itemTipo')?.setValue(itemTipo, { emitEvent: false });

    this.itens.clear();
    if (this.dataForm.nfeItens && this.dataForm.nfeItens.length > 0) {
      this.dataForm.nfeItens.forEach((item) => {
        const icms = (item.itemIcms || {}) as any;
        const pis = (item.itemPis || {}) as any;
        const cofins = (item.itemCofins || {}) as any;

        const vehicleId = item.vehicleId || this.dataForm?.vehicleId;
        const vehicleName = item.itemDescricao || this.dataForm?.productIdentifier || '';

        this.itens.push(
          this.createItem({
            ...item,
            vehicleId: vehicleId,
            vehicleName: vehicleName,
            icmsOrigem: icms.icmsOrigem,
            icmsSituacaoTributaria: icms.icmsSituacaoTributaria,
            icmsValorBaseCalculo: icms.icmsValorBaseCalculo,
            icmsAliquota: icms.icmsAliquota,
            icmsValor: icms.icmsValor,
            pisSituacaoTributaria: pis.pisSituacaoTributaria,
            pisValorBaseCalculo: pis.pisValorBaseCalculo,
            pisAliquota: pis.pisAliquota,
            pisValor: pis.pisValor,
            cofinsSituacaoTributaria: cofins.cofinsSituacaoTributaria,
            cofinsValorBaseCalculo: cofins.cofinsValorBaseCalculo,
            cofinsAliquota: cofins.cofinsAliquota,
            cofinsValor: cofins.cofinsValor,
          }),
        );
      });
    } else {
      this.addItem();
    }

    this.form.patchValue({
      person: {
        id: this.dataForm.personId || '',
        name: this.persons.find((p) => p.id === this.dataForm!.personId)?.name || '',
      },
      nfeNaturezaOperacao: this.dataForm.nfeNaturezaOperacao || '',
      nfePreenchimentoManualImpostos: this.dataForm.nfeCalcularImpostosAutomaticamente === false,
      nfeFinalidadeEmissao: this.dataForm.nfeFinalidadeEmissao || '1',
      nfeConsumidorFinal: this.dataForm.nfeConsumidorFinal || '1',
      nfePresencaComprador: this.dataForm.nfePresencaComprador || '1',
      nfeIndicadorIntermediario: this.dataForm.nfeIndicadorIntermediario || '0',
      modalidadeFrete: this.dataForm.nfeTransporte?.modalidadeFrete || '9',
      nfeInformacoesAdicionaisFisco: this.dataForm.nfeInformacoesAdicionaisFisco || 'BASE DE CALCULO DO ICMS REDUZIDA 72.22% DE ACORDO COM O ITEM 11 DO ANEXO IV DO RICMS-MG. DECRETO 48.055/2020, OBSERVANDO O DISPOSTO NO SUBITEM 11.7. OS TRIBUTOS FEDERAIS INCIDENTES SOBRE ESTA OPERAÇÃO SERÃO RECOLHIDOS CONFORME ART.5 LEI Nº 9.716/98. PERCENTUAL DE IMPOSTOS CONFORME LEI 12.741 / 8,65%.\nNF DE ENTRADA N.: SERIE: DATA: ',
    });
  }

  onEnter(event: Event): void {
    if (event instanceof KeyboardEvent) {
      event.preventDefault();

      if (this.form.valid && document.activeElement === this.submitButton.nativeElement) {
        this.onSubmit();
      }

      if (this.form.valid && this.submitButton) {
        this.submitButton.nativeElement.focus();
      }
    }
  }

  onSubmit() {
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const nfeItens = this.itens.getRawValue().map((item) => {
      const isVeiculo = this.form.value.itemTipo === 'veiculo';

      return {
        vehicleId: isVeiculo ? item.vehicle?.id : undefined,
        itemDescricao: isVeiculo ? item.vehicle?.name : item.itemDescricao,
        itemQuantidadeComercial: isVeiculo ? '1' : String(item.itemQuantidadeComercial),
        itemUnidadeComercial: isVeiculo ? 'UN' : item.itemUnidadeComercial,
        itemValorUnitarioComercial: String(item.itemValorUnitarioComercial || '0'),
        itemValorBruto: String(item.itemValorBruto || '0'),
        itemCodigoProduto: !isVeiculo ? item.itemCodigoProduto : undefined,
        itemCodigoNcm: item.itemCodigoNcm || undefined,
        itemCfop: item.itemCfop || undefined,
        itemIcms: {
          icmsOrigem: item.icmsOrigem,
          icmsSituacaoTributaria: item.icmsSituacaoTributaria,
          icmsValorBaseCalculo: item.icmsValorBaseCalculo,
          icmsAliquota: item.icmsAliquota,
          icmsValor: item.icmsValor,
          icmsModalidadeBaseCalculo: '3',
        } as any,
        itemPis: {
          pisSituacaoTributaria: item.pisSituacaoTributaria,
          pisValorBaseCalculo: item.pisValorBaseCalculo,
          pisAliquota: item.pisAliquota,
          pisValor: item.pisValor,
        } as any,
        itemCofins: {
          cofinsSituacaoTributaria: item.cofinsSituacaoTributaria,
          cofinsValorBaseCalculo: item.cofinsValorBaseCalculo,
          cofinsAliquota: item.cofinsAliquota,
          cofinsValor: item.cofinsValor,
        } as any,
      } as any;
    });

    const formValues: Nfe = {
      nfeId: this.dataForm?.nfeId,
      storeId: this.storeContextService.currentStoreId!,
      nfeItens: nfeItens,
      personId: this.form.value.person?.id,
      nfeTipoDocumento: '1', // Saída
      nfeNaturezaOperacao: this.form.value.nfeNaturezaOperacao,
      nfeCalcularImpostosAutomaticamente: !this.form.value.nfePreenchimentoManualImpostos,
      nfeFinalidadeEmissao: this.form.value.nfeFinalidadeEmissao,
      nfeConsumidorFinal: this.form.value.nfeConsumidorFinal,
      nfePresencaComprador: this.form.value.nfePresencaComprador,
      nfeIndicadorIntermediario: this.form.value.nfeIndicadorIntermediario,
      nfeTransporte: {
        modalidadeFrete: this.form.value.modalidadeFrete,
      },
      nfeInformacoesAdicionaisFisco: this.form.value.nfeInformacoesAdicionaisFisco,
    };

    if (this.dataForm?.nfeId) {
      this.nfeService.update(formValues).subscribe({
        next: () => {
          this.toastrService.success('NFe atualizada com sucesso');
          const draftIdToDelete = this.selectedDraftId || this.draft?.id;
          if (draftIdToDelete) {
            this.formDraftService.removeDraftById(draftIdToDelete);
          } else {
            this.formDraftService.removeDraft(this.FORM_TYPE, this.dataForm?.nfeId);
          }
          this.formSubmitted.emit();
        },
        error: (error) => {
          const msg = extractErrorMessage(error, 'Erro ao atualizar NFe');
          this.toastrService.error(msg);
        },
      });
    } else {
      this.nfeService.create(formValues).subscribe({
        next: () => {
          this.toastrService.success('NFe criada com sucesso');
          const draftIdToDelete = this.selectedDraftId || this.draft?.id;
          if (draftIdToDelete) {
            this.formDraftService.removeDraftById(draftIdToDelete);
          } else {
            this.formDraftService.removeDraft(this.FORM_TYPE);
          }
          this.formSubmitted.emit();
        },
        error: (error) => {
          const msg = extractErrorMessage(error, 'Erro ao criar NFe');
          this.toastrService.error(msg);
        },
      });
    }
  }

  onDelete() {
    this.openDialog();
  }

  openDialog() {
    const dialogRef: MatDialogRef<ConfirmDialogComponent> = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirmar Cancelamento',
        message: 'Você tem certeza que deseja <strong>cancelar</strong> esta NFe?',
        confirmText: 'Sim, Cancelar',
        cancelText: 'Não',
        icon: 'cancel',
        type: 'danger',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.deleteConfirmed();
      }
    });
  }

  deleteConfirmed() {
    if (this.dataForm?.nfeId) {
      this.nfeService.delete(this.dataForm.nfeId).subscribe({
        next: () => {
          this.toastrService.success('NFe cancelada com sucesso');
          this.formSubmitted.emit();
        },
        error: (error) => {
          const msg = extractErrorMessage(error, 'Erro ao cancelar NFe');
          this.toastrService.error(msg);
        },
      });
    }
  }

  getVehicleDisplay(vehicle: Vehicle): string {
    const brand = vehicle.brand || '';
    const model = vehicle.model || '';
    return `${brand} ${model} (${vehicle.plate})`.trim();
  }

  getPersonDisplay(person: Person): string {
    return person.cpf ? `${person.name} - CPF: ${person.cpf}` : `${person.name} - CNPJ: ${person.cnpj}`;
  }

  get isSaveButtonDisabled(): boolean {
    if (this.isSaving || this.isInitializing) {
      return true;
    }
    const hasActiveDraft = !!this.draft || !!this.selectedDraftId;
    const isEditMode = !!this.dataForm && !!this.dataForm.nfeId;

    if (isEditMode) {
      if (hasActiveDraft) {
        return !this.form.valid;
      }
      return !this.hasUnsavedChanges();
    }
    return !this.form.valid;
  }

  hasChangesComparedToDraft(): boolean {
    const source = this.lastSavedDraftValue;
    if (!source) {
      return this.hasUnsavedChanges();
    }
    return JSON.stringify(this.form.getRawValue()) !== JSON.stringify(source);
  }

  get canShowDraftButton(): boolean {
    return !this.isSaving && !this.isInitializing && this.form.dirty && this.hasChangesComparedToDraft();
  }

  get currentDraftName(): string | undefined {
    if (this.selectedDraftId) {
      const draft = this.availableDrafts.find((d) => d.id === this.selectedDraftId);
      return draft?.draftName;
    }
    return undefined;
  }

  get suggestedDraftName(): string {
    const personName = this.form.value.person?.name || '';
    const operacao = this.form.value.nfeNaturezaOperacao || 'NFe';
    return `${operacao} - ${personName}`.trim() || `Rascunho NFe ${new Date().toLocaleString()}`;
  }

  hasUnsavedChanges(): boolean {
    if (this.isSaving || this.isInitializing) {
      return false;
    }
    if (this.form.pristine) {
      return false;
    }
    if (this.initialFormValue) {
      return JSON.stringify(this.form.getRawValue()) !== this.initialFormValue;
    }
    return true;
  }

  private captureInitialFormValue(): void {
    this.initialFormValue = JSON.stringify(this.form.getRawValue());
  }

  private loadAvailableDrafts(): void {
    this.availableDrafts = this.formDraftService.getDraftsByType(this.FORM_TYPE);
    if (this.availableDrafts.length === 0) {
      this.showFormFields = true;
    } else if (this.dataForm || this.draft || this.selectedDraftId) {
      this.showFormFields = true;
    }
  }

  protected onDraftSelected(event: any): void {
    const draftId = event.value;
    this.showFormFields = true;

    if (draftId === 'new') {
      this.resetForm();
      this.selectedDraftId = 'new';
      return;
    }

    const draft = this.availableDrafts.find((d) => d.id === draftId);
    if (!draft) {
      return;
    }

    this.loadDraftData(draft);
  }

  private loadDraftData(draft: FormDraft): void {
    this.selectedDraftId = draft.id;
    const draftData = draft.data;

    if (draftData.itemTipo) {
      this.form.get('itemTipo')?.setValue(draftData.itemTipo, { emitEvent: false });
    }

    this.itens.clear();
    if (draftData.nfeItens && draftData.nfeItens.length > 0) {
      draftData.nfeItens.forEach((item: any) => {
        this.itens.push(this.createItem(item));
      });
    } else {
      this.addItem();
    }

    this.form.patchValue(draftData);

    this.toastrService.success(`Rascunho "${draft.draftName || 'sem nome'}" carregado`);
    this.lastSavedDraftValue = this.form.getRawValue();

    setTimeout(() => {
      this.captureInitialFormValue();
      if (this.dataForm && this.dataForm.nfeId) {
        this.form.markAsDirty();
        this.formChanged.emit(true);
      } else {
        this.form.markAsPristine();
        this.formChanged.emit(false);
      }
    }, 200);
  }

  protected deleteDraft(draftId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    const draft = this.availableDrafts.find((d) => d.id === draftId);
    if (!draft) {
      return;
    }

    this.formDraftService.removeDraftById(draft.id);
    this.loadAvailableDrafts();

    if (this.selectedDraftId === draftId) {
      this.resetForm();
      this.selectedDraftId = null;
      this.showFormFields = this.availableDrafts.length === 0;
    }

    this.toastrService.success('Rascunho excluído');
  }

  protected formatDraftDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'agora mesmo';
    } else if (diffMins < 60) {
      return `há ${diffMins} min${diffMins > 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else if (diffDays < 7) {
      return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    } else {
      return new Date(date).toLocaleDateString('pt-BR');
    }
  }

  saveLocalDraft(
    silent: boolean = false,
    draftName?: string,
    existingDraftId?: string,
    closeAfterSave: boolean = true,
  ): void {
    const nfeId = this.dataForm?.nfeId || undefined;
    let effectiveEntityId = nfeId;
    const actualDraftId = existingDraftId || this.selectedDraftId;

    if (!effectiveEntityId && actualDraftId) {
      const prefix = `${this.FORM_TYPE}_`;
      if (actualDraftId.startsWith(prefix)) {
        effectiveEntityId = actualDraftId.replace(prefix, '') as any;
      }
    }

    const draftData = this.form.getRawValue();
    const draftId = this.formDraftService.saveDraft(this.FORM_TYPE, draftData, effectiveEntityId, draftName);

    this.selectedDraftId = draftId;
    this.lastSavedDraftValue = this.form.getRawValue();

    if (!silent) {
      this.toastrService.info('Rascunho salvo localmente');
    }

    if (!closeAfterSave) {
      this.form.markAsPristine();
      setTimeout(() => {
        this.captureInitialFormValue();
      }, 100);
    } else {
      this.formSubmitted.emit();
    }
  }

  openSaveDraftDialog() {
    if (this.selectedDraftId && this.selectedDraftId !== 'new') {
      const currentDraft = this.availableDrafts.find((d) => d.id === this.selectedDraftId);
      if (currentDraft) {
        this.saveLocalDraft(
          false,
          currentDraft.draftName,
          this.selectedDraftId,
          true,
        );
        return;
      }
    }

    const suggestedName = this.suggestedDraftName;

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
          this.toastrService.error('Já existe um rascunho com este nome. Por favor, escolha outro.', 'Nome Duplicado');
          this.openSaveDraftDialog();
          return;
        }

        this.saveLocalDraft(false, result.draftName, undefined, true);
      }
    });
  }

  resetForm() {
    this.form.reset({
      storeId: this.storeContextService.currentStoreId || '',
      person: { id: '', name: '' },
      nfeNaturezaOperacao: '',
      nfePreenchimentoManualImpostos: false,
      itemTipo: 'veiculo',
      nfeFinalidadeEmissao: '1',
      nfeConsumidorFinal: '1',
      nfePresencaComprador: '1',
      nfeIndicadorIntermediario: '0',
      modalidadeFrete: '9',
      nfeInformacoesAdicionaisFisco: 'BASE DE CALCULO DO ICMS REDUZIDA 72.22% DE ACORDO COM O ITEM 11 DO ANEXO IV DO RICMS-MG. DECRETO 48.055/2020, OBSERVANDO O DISPOSTO NO SUBITEM 11.7. OS TRIBUTOS FEDERAIS INCIDENTES SOBRE ESTA OPERAÇÃO SERÃO RECOLHIDOS CONFORME ART.5 LEI Nº 9.716/98. PERCENTUAL DE IMPOSTOS CONFORME LEI 12.741 / 8,65%.\nNF DE ENTRADA N.: SERIE: DATA: '
    });
    this.itens.clear();
    this.addItem();
    this.submitted = false;
    this.selectedDraftId = null;
    this.lastSavedDraftValue = this.form.getRawValue();
    this.form.markAsPristine();
    this.formChanged.emit(false);
  }
}
