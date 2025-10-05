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

import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';

import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';
import { PrimarySelectComponent } from '@components/primary-select/primary-select.component';
import { WrapperCardComponent } from '@components/wrapper-card/wrapper-card.component';

import type { createNfe, Nfe, TipoNfe } from '@interfaces/nfe';
import type { Person } from '@interfaces/person';
import { Vehicle } from '@interfaces/vehicle';

import { NfeService } from '@services/nfe.service';
import { PersonService } from '@services/person.service';
import { VehicleService } from '@services/vehicle.service';

@Component({
  selector: 'app-nfe-entrada-form',
  imports: [
    PrimarySelectComponent,
    ReactiveFormsModule,
    WrapperCardComponent,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
  ],
  templateUrl: './nfe-entrada-form.component.html',
  styleUrl: './nfe-entrada-form.component.scss',
})
export class NfeEntradaFormComponent implements OnInit, OnChanges, OnDestroy {
  private subscriptions = new Subscription();
  submitted = false;

  vehicles: Vehicle[] = [];
  persons: Person[] = [];
  tiposNfeEntrada: { value: TipoNfe; label: string }[] = [
    {
      value: 'COMPRA DE VEICULO USADO' as TipoNfe,
      label: 'Compra de Veículo Usado',
    },
    {
      value: 'ENTRADA EM CONSIGNAÇÃO' as TipoNfe,
      label: 'Entrada em Consignação',
    },
    {
      value: 'ENTRADA COMPRA DEFINITIVA' as TipoNfe,
      label: 'Entrada Compra Definitiva',
    },
    { value: 'DEVOLUÇÃO DE VENDA' as TipoNfe, label: 'Devolução de Venda' },
  ];

  readonly dialog = inject(MatDialog);
  private formBuilderService = inject(FormBuilder);

  @ViewChild('submitButton', { static: false, read: ElementRef })
  submitButton!: ElementRef<HTMLButtonElement>;

  @Input() dataForm: Nfe | null = null;
  @Output() formSubmitted = new EventEmitter<void>();
  @Output() formChanged = new EventEmitter<boolean>();

  protected form: FormGroup = this.formBuilderService.group({
    idVeiculo: ['', Validators.required],
    idDestinatario: ['', Validators.required],
    tipo: ['', Validators.required],
  });

  constructor(
    private nfeService: NfeService,
    private personService: PersonService,
    private vehicleService: VehicleService,
    private toastrService: ToastrService
  ) {}

  ngOnInit() {
    // Observar mudanças no formulário
    this.subscriptions.add(
      this.form.valueChanges.subscribe(() => {
        const isDirty = this.form.dirty;
        this.formChanged.emit(isDirty);
      })
    );

    // Carregar lista de veículos
    this.vehicleService.getPaginatedData(0, 1000).subscribe((response) => {
      this.vehicles = response.content;
    });

    // Carregar lista de pessoas
    this.personService.getPaginatedData(0, 1000).subscribe((response) => {
      this.persons = response.content;
    });
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['dataForm'] && this.dataForm) {
      setTimeout(() => {
        this.form.patchValue({
          idVeiculo: this.dataForm!.idVeiculo || '',
          idDestinatario: this.dataForm!.idDestinatario || '',
          tipo: this.dataForm!.tipo || '',
        });
      });
    }
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

    const formValues: createNfe = {
      idVeiculo: this.form.value.idVeiculo,
      idDestinatario: this.form.value.idDestinatario,
      tipo: this.form.value.tipo,
    };

    if (this.dataForm?.id) {
      // Edição
      this.nfeService.update({ ...this.dataForm, ...formValues }).subscribe({
        next: () => {
          this.toastrService.success('NFe atualizada com sucesso');
          this.formSubmitted.emit();
        },
        error: () =>
          this.toastrService.error(
            'Erro inesperado! Tente novamente mais tarde'
          ),
      });
    } else {
      // Criação
      this.nfeService.create(formValues).subscribe({
        next: () => {
          this.toastrService.success('NFe criada com sucesso');
          this.formSubmitted.emit();
        },
        error: () =>
          this.toastrService.error(
            'Erro inesperado! Tente novamente mais tarde'
          ),
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
          confirmText: 'Sim',
          cancelText: 'Não',
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
    if (this.dataForm?.id) {
      this.nfeService.delete(this.dataForm.id).subscribe({
        next: () => {
          this.toastrService.success('NFe cancelada com sucesso');
          this.formSubmitted.emit();
        },
        error: () => {
          this.toastrService.error('Erro ao cancelar NFe');
        },
      });
    }
  }

  // Helpers para exibição nos selects
  getVehicleDisplay(vehicle: Vehicle): string {
    const brand = vehicle.brand || '';
    const model = vehicle.model || '';
    return `${vehicle.plate} - ${brand} ${model}`.trim();
  }

  getPersonDisplay(person: Person): string {
    return person.cpf
      ? `${person.name} - CPF: ${person.cpf}`
      : `${person.name} - CNPJ: ${person.cnpj}`;
  }
}
