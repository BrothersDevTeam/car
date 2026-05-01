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
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { CurrencyInputComponent } from '@components/currency-input/currency-input.component';

import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';
import { PrimarySelectComponent } from '@components/primary-select/primary-select.component';
import { CustomSelectComponent } from '@components/custom-select/custom-select.component';
import { DrawerComponent } from '@components/drawer/drawer.component';
import { NaturalPersonFormComponent } from '@forms/client/natural-person-form/natural-person-form.component';
import { LegalEntityFormComponent } from '@forms/client/legal-entity-form/legal-entity-form.component';
import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';

import type { NaturezaOperacao, Nfe } from '@interfaces/nfe';
import type { Person } from '@interfaces/person';
import { Vehicle, VehicleList } from '@interfaces/vehicle';

import { NfeService } from '@services/nfe.service';
import { PersonService } from '@services/person.service';
import { VehicleService } from '@services/vehicle.service';
import { extractErrorMessage } from '@utils/error-utils';
import { StoreContextService } from '@services/store-context.service';
import {
  ParametroFiscalService,
  ParametroFiscal,
} from '@services/parametro-fiscal.service';

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
      value:
        'TRANSFERÊNCIA DE MERCADORIA ADQUIRIDA OU RECEBIDA DE TERCEIROS' as NaturezaOperacao,
      label: 'Transferência de Mercadoria',
    },
  ];

  readonly dialog = inject(MatDialog);
  private formBuilderService = inject(FormBuilder);
  private storeContextService = inject(StoreContextService);

  @ViewChild('submitButton', { static: false, read: ElementRef })
  submitButton!: ElementRef<HTMLButtonElement>;

  @Input() dataForm: Nfe | null = null;
  @Output() formSubmitted = new EventEmitter<void>();
  @Output() formChanged = new EventEmitter<boolean>();

  private nfeService = inject(NfeService);
  private personService = inject(PersonService);
  private vehicleService = inject(VehicleService);
  private toastrService = inject(ToastrService);
  private parametroFiscalService = inject(ParametroFiscalService);

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
  });

  constructor() {}

  ngOnInit(): void {
    // Inicializa com um item padrão se não for edição
    if (!this.dataForm) {
      this.addItem();
    }

    // Observar mudanças no formulário
    this.subscriptions.add(
      this.form.valueChanges.subscribe(() => {
        const isDirty = this.form.dirty;
        this.formChanged.emit(isDirty);
      })
    );

    // Contexto Global de Loja
    this.subscriptions.add(
      this.storeContextService.currentStoreId$.subscribe((storeId) => {
        if (storeId) {
          this.loadInitialData(storeId);
          this.loadParametrosFiscais(storeId);
        }
      })
    );

    // Observar mudanças no itemTipo para ajustar a lista
    this.subscriptions.add(
      this.form.get('itemTipo')?.valueChanges.subscribe(() => {
        this.itens.clear();
        this.addItem();
      })
    );
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
      itemDescricao: [
        data.itemDescricao || '',
        !isVeiculo ? [Validators.required] : [],
      ],
      itemCodigoProduto: [data.itemCodigoProduto || ''],
      itemUnidadeComercial: [data.itemUnidadeComercial || 'UN'],
      itemQuantidadeComercial: [
        data.itemQuantidadeComercial || 1,
        [Validators.required],
      ],
      itemValorUnitarioComercial: [
        data.itemValorUnitarioComercial || '',
        [Validators.required],
      ],
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
      })
    );

    return group;
  }

  addItem(): void {
    if (
      this.form.get('itemTipo')?.value === 'veiculo' &&
      this.itens.length >= 1
    ) {
      return;
    }
    this.itens.push(this.createItem());
  }

  removeItem(index: number): void {
    if (this.itens.length > 1) {
      this.itens.removeAt(index);
    }
  }

  private loadParametrosFiscais(storeId: string) {
    this.loadingParametros = true;
    this.parametroFiscalService.getByStoreId(storeId).subscribe({
      next: (params) => {
        this.parametroFiscal = params;
        this.loadingParametros = false;
      },
      error: () => {
        this.loadingParametros = false;
      },
    });
  }

  private loadInitialData(storeId: string) {
    this.vehicleService
      .getPaginatedData(0, 1000, { storeId })
      .subscribe((response) => {
        this.vehicles = (response.content || []).map((v) => ({
          id: v.vehicleId,
          name: this.getVehicleDisplay(v as Vehicle),
        }));
        this.tryPatchForm();
      });

    this.personService
      .getPaginatedData(0, 1000, { storeId })
      .subscribe((response) => {
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
      const valor = vehicle.valorVenda
        ? parseFloat(vehicle.valorVenda.toString().replace(',', '.'))
        : 0;

      itemGroup.patchValue({
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
      this.tryPatchForm();
    }
  }

  private tryPatchForm() {
    if (
      !this.dataForm ||
      this.vehicles.length === 0 ||
      this.persons.length === 0
    ) {
      return;
    }

    this.itens.clear();
    if (this.dataForm.nfeItens && this.dataForm.nfeItens.length > 0) {
      this.dataForm.nfeItens.forEach((item) => {
        const icms = (item.itemIcms || {}) as any;
        const pis = (item.itemPis || {}) as any;
        const cofins = (item.itemCofins || {}) as any;

        this.itens.push(
          this.createItem({
            ...item,
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
          })
        );
      });
    } else {
      this.addItem();
    }

    this.form.patchValue({
      itemTipo: this.dataForm.vehicleId ? 'veiculo' : 'produto',
      person: {
        id: this.dataForm.personId || '',
        name:
          this.persons.find((p) => p.id === this.dataForm!.personId)?.name ||
          '',
      },
      nfeNaturezaOperacao: this.dataForm.nfeNaturezaOperacao || '',
      nfePreenchimentoManualImpostos:
        this.dataForm.nfeCalcularImpostosAutomaticamente === false,
    });
  }

  onEnter(event: Event): void {
    if (event instanceof KeyboardEvent) {
      event.preventDefault();

      if (
        this.form.valid &&
        document.activeElement === this.submitButton.nativeElement
      ) {
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
      return {
        vehicleId:
          this.form.value.itemTipo === 'veiculo' ? item.vehicle?.id : undefined,
        itemDescricao:
          this.form.value.itemTipo === 'produto'
            ? item.itemDescricao
            : undefined,
        itemQuantidadeComercial:
          this.form.value.itemTipo === 'produto'
            ? String(item.itemQuantidadeComercial)
            : '1',
        itemUnidadeComercial:
          this.form.value.itemTipo === 'produto'
            ? item.itemUnidadeComercial
            : 'UN',
        itemValorUnitarioComercial:
          this.form.value.itemTipo === 'produto'
            ? String(item.itemValorUnitarioComercial)
            : undefined,
        itemValorBruto:
          this.form.value.itemTipo === 'produto'
            ? String(item.itemValorBruto)
            : undefined,
        itemCodigoProduto:
          this.form.value.itemTipo === 'produto'
            ? item.itemCodigoProduto
            : undefined,
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
      storeId: this.storeContextService.currentStoreId!,
      nfeItens: nfeItens,
      personId: this.form.value.person?.id,
      nfeTipoDocumento: '1', // Saída
      nfeNaturezaOperacao: this.form.value.nfeNaturezaOperacao,
      nfeCalcularImpostosAutomaticamente:
        !this.form.value.nfePreenchimentoManualImpostos,
    };

    if (this.dataForm?.nfeId) {
      this.nfeService.update({ ...this.dataForm, ...formValues }).subscribe({
        next: () => {
          this.toastrService.success('NFe atualizada com sucesso');
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
    const dialogRef: MatDialogRef<ConfirmDialogComponent> = this.dialog.open(
      ConfirmDialogComponent,
      {
        data: {
          title: 'Confirmar Cancelamento',
          message:
            'Você tem certeza que deseja <strong>cancelar</strong> esta NFe?',
          confirmText: 'Sim, Cancelar',
          cancelText: 'Não',
          icon: 'cancel',
          type: 'danger',
        },
      }
    );

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
    return person.cpf
      ? `${person.name} - CPF: ${person.cpf}`
      : `${person.name} - CNPJ: ${person.cnpj}`;
  }
}
