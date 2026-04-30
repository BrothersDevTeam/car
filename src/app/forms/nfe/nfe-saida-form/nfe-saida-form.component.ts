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
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {
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

import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';
import { PrimarySelectComponent } from '@components/primary-select/primary-select.component';
import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';

import type { NaturezaOperacao, Nfe } from '@interfaces/nfe';
import type { Person } from '@interfaces/person';
import { Vehicle, VehicleList } from '@interfaces/vehicle';

import { NfeService } from '@services/nfe.service';
import { PersonService } from '@services/person.service';
import { VehicleService } from '@services/vehicle.service';
import { extractErrorMessage } from '@utils/error-utils';
import { StoreContextService } from '@services/store-context.service';
import { ParametroFiscalService, ParametroFiscal } from '@services/parametro-fiscal.service';

@Component({
  selector: 'app-nfe-saida-form',
  imports: [
    PrimarySelectComponent,
    ReactiveFormsModule,
    WrapperCardComponent,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatInputModule,
    MatFormFieldModule,
  ],
  templateUrl: './nfe-saida-form.component.html',
  styleUrl: './nfe-saida-form.component.scss',
})
export class NfeSaidaFormComponent implements OnInit, OnChanges, OnDestroy {
  private subscriptions = new Subscription();
  submitted = false;

  // Listas para os selects/autocompletes
  vehicles: Vehicle[] | VehicleList[] = [];
  persons: Person[] = [];
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
    vehicleId: ['', Validators.required],
    personId: ['', Validators.required],
    nfeNaturezaOperacao: ['', Validators.required],
    nfePreenchimentoManualImpostos: [false],
    
    // Campos para tributação manual (ICMS, PIS, COFINS) do item 1
    itemCodigoNcm: [''],
    itemCfop: [''],
    icmsOrigem: ['0'],
    icmsSituacaoTributaria: [''],
    icmsValorBaseCalculo: [''],
    icmsAliquota: [''],
    icmsValor: [''],
    pisSituacaoTributaria: [''],
    pisValorBaseCalculo: [''],
    pisAliquota: [''],
    pisValor: [''],
    cofinsSituacaoTributaria: [''],
    cofinsValorBaseCalculo: [''],
    cofinsAliquota: [''],
    cofinsValor: [''],
  });

  constructor() {}

  ngOnInit() {
    // Observar mudanças no formulário
    this.subscriptions.add(
      this.form.valueChanges.subscribe(() => {
        const isDirty = this.form.dirty;
        this.formChanged.emit(isDirty);
      })
    );

    // Contexto Global de Loja - Carrega dados iniciais e reage a mudanças
    this.subscriptions.add(
      this.storeContextService.currentStoreId$.subscribe((storeId) => {
        if (storeId) {
          this.loadInitialData(storeId);
          this.loadParametrosFiscais(storeId);
        }
      })
    );
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

  /**
   * Carrega veículos e pessoas filtrados pela loja atual.
   * Chamado no OnInit e sempre que a loja global mudar.
   */
  private loadInitialData(storeId: string) {
    // Carrega veículos e pessoas em paralelo; após ambos terminarem,
    // faz o patchValue caso já exista um dataForm (modo edição)
    this.vehicleService
      .getPaginatedData(0, 1000, { storeId })
      .subscribe((response) => {
        this.vehicles = response.content || [];
        this.tryPatchForm();
      });

    this.personService
      .getPaginatedData(0, 1000, { storeId })
      .subscribe((response) => {
        this.persons = response.content || [];
        this.tryPatchForm();
      });
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['dataForm'] && this.dataForm) {
      // Tenta preencher o form imediatamente;
      // se as listas ainda não carregaram, tryPatchForm
      // será chamado novamente quando elas chegarem.
      this.tryPatchForm();
    }
  }

  /** Aplica patchValue apenas quando veículos e pessoas já estão carregados */
  private tryPatchForm() {
    if (
      !this.dataForm ||
      this.vehicles.length === 0 ||
      this.persons.length === 0
    ) {
      return;
    }
    const firstItem = this.dataForm.nfeItens?.[0] || {};
    const manualTaxes = this.getManualTaxes(firstItem);

    this.form.patchValue({
      vehicleId: this.dataForm.vehicleId || '',
      personId: this.dataForm.personId || '',
      nfeNaturezaOperacao: this.dataForm.nfeNaturezaOperacao || '',
      nfePreenchimentoManualImpostos: this.dataForm.nfeCalcularImpostosAutomaticamente === false,
      ...manualTaxes
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

  private getManualTaxes(item: any): any {
    if (!item) return {};
    return {
      itemCodigoNcm: item.itemCodigoNcm || '',
      itemCfop: item.itemCfop || '',
      icmsOrigem: item.itemIcms?.icmsOrigem || '0',
      icmsSituacaoTributaria: item.itemIcms?.icmsSituacaoTributaria || '',
      icmsValorBaseCalculo: item.itemIcms?.icmsValorBaseCalculo || '',
      icmsAliquota: item.itemIcms?.icmsAliquota || '',
      icmsValor: item.itemIcms?.icmsValor || '',
      pisSituacaoTributaria: item.itemPis?.pisSituacaoTributaria || '',
      pisValorBaseCalculo: item.itemPis?.pisValorBaseCalculo || '',
      pisAliquota: item.itemPis?.pisAliquota || '',
      pisValor: item.itemPis?.pisValor || '',
      cofinsSituacaoTributaria: item.itemCofins?.cofinsSituacaoTributaria || '',
      cofinsValorBaseCalculo: item.itemCofins?.cofinsValorBaseCalculo || '',
      cofinsAliquota: item.itemCofins?.cofinsAliquota || '',
      cofinsValor: item.itemCofins?.cofinsValor || '',
    };
  }

  onSubmit() {
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const firstItem = this.dataForm?.nfeItens?.[0] || {};
    
    const formValues: Nfe = {
      storeId: this.storeContextService.currentStoreId!,
      nfeItens: [{ 
        ...firstItem,
        vehicleId: this.form.value.vehicleId,
        itemCodigoNcm: this.form.value.itemCodigoNcm,
        itemCfop: this.form.value.itemCfop,
        itemIcms: {
          icmsOrigem: this.form.value.icmsOrigem,
          icmsSituacaoTributaria: this.form.value.icmsSituacaoTributaria,
          icmsValorBaseCalculo: this.form.value.icmsValorBaseCalculo,
          icmsAliquota: this.form.value.icmsAliquota,
          icmsValor: this.form.value.icmsValor,
          icmsModalidadeBaseCalculo: '3', // Padrão
        } as any,
        itemPis: {
          pisSituacaoTributaria: this.form.value.pisSituacaoTributaria,
          pisValorBaseCalculo: this.form.value.pisValorBaseCalculo,
          pisAliquota: this.form.value.pisAliquota,
          pisValor: this.form.value.pisValor,
        } as any,
        itemCofins: {
          cofinsSituacaoTributaria: this.form.value.cofinsSituacaoTributaria,
          cofinsValorBaseCalculo: this.form.value.cofinsValorBaseCalculo,
          cofinsAliquota: this.form.value.cofinsAliquota,
          cofinsValor: this.form.value.cofinsValor,
        } as any,
      }],
      personId: this.form.value.personId,
      nfeTipoDocumento: '1', // Saída
      nfeNaturezaOperacao: this.form.value.nfeNaturezaOperacao,
      nfeCalcularImpostosAutomaticamente: !this.form.value.nfePreenchimentoManualImpostos,
    };

    if (this.dataForm?.nfeId) {
      // Edição
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
      // Criação
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

  // Helpers para exibição nos selects
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
