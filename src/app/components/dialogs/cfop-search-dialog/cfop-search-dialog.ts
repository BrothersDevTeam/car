import { ChangeDetectionStrategy, Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CfopService } from '@services/cfop.service';
import { Cfop, CfopSearchFilters } from '@interfaces/cfop';

export interface CfopSearchDialogData {
  tipoOperacao?: 'E' | 'S';
  selectedCodigo?: string;
}

@Component({
  selector: 'app-cfop-search-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cfop-search-dialog.html',
  styleUrl: './cfop-search-dialog.scss',
})
export class CfopSearchDialog implements OnInit {
  form: FormGroup;
  allCfops = signal<Cfop[]>([]);
  cfops = signal<Cfop[]>([]);
  loading = signal<boolean>(false);
  selectedCfop = signal<Cfop | null>(null);

  displayedColumns: string[] = ['codigo', 'descricao'];

  constructor(
    private fb: FormBuilder,
    private cfopService: CfopService,
    public dialogRef: MatDialogRef<CfopSearchDialog>,
    @Inject(MAT_DIALOG_DATA) public data: CfopSearchDialogData,
  ) {
    this.form = this.fb.group({
      termo: [''],
      tipoOperacao: [data?.tipoOperacao || ''],
    });

    this.form.get('termo')?.valueChanges.subscribe(() => this.applyFilter());
  }

  ngOnInit(): void {
    this.loadInitialCfops();
  }

  /**
   * Carga inicial da lista completa de CFOPs para o tipo de operação da NFe (E ou S).
   * Executa uma única consulta ao backend na abertura da tela.
   */
  loadInitialCfops(): void {
    this.loading.set(true);
    const tipoOperacao = this.data?.tipoOperacao || this.form.get('tipoOperacao')?.value;

    const filters: CfopSearchFilters = {
      size: 200,
      page: 0,
      sort: 'cfopCodigo,asc',
    };

    if (tipoOperacao) {
      filters.tipoOperacao = tipoOperacao;
    }

    this.cfopService.getAll(filters).subscribe({
      next: (res) => {
        const anyRes = res as any;
        const items: Cfop[] =
          anyRes?.content ||
          anyRes?._embedded?.cfopModelList ||
          anyRes?._embedded?.cfopModels ||
          (Array.isArray(anyRes) ? anyRes : []);

        this.allCfops.set(items);
        this.cfops.set(items);
        this.loading.set(false);

        // Se já tiver um código pré-selecionado, destaca ele na lista
        if (this.data?.selectedCodigo) {
          const clean = this.cfopService.cleanCfop(this.data.selectedCodigo);
          const found = items.find((c) => c.cfopCodigo === clean);
          if (found) {
            this.selectedCfop.set(found);
          }
        }
      },
      error: (err) => {
        console.error('Erro ao carregar CFOPs:', err);
        this.allCfops.set([]);
        this.cfops.set([]);
        this.loading.set(false);
      },
    });
  }

  /**
   * Filtra os CFOPs diretamente em memória sem nova requisição HTTP.
   * Suporta filtragem flexível tanto por código numérico quanto por texto da descrição.
   */
  applyFilter(): void {
    const termo = this.form.get('termo')?.value?.trim() || '';

    if (!termo) {
      this.cfops.set(this.allCfops());
      return;
    }

    const cleanTerm = this.normalize(termo);
    const digitsOnly = termo.replace(/\D/g, '');

    const filtered = this.allCfops().filter((cfop) => {
      const code = cfop.cfopCodigo || '';
      const formattedCode = this.formatCode(code);
      const desc = this.normalize(cfop.cfopDescricao || '');

      const matchDigits = digitsOnly.length > 0 && code.includes(digitsOnly);
      const matchFormatted = this.normalize(formattedCode).includes(cleanTerm);
      const matchDesc = desc.includes(cleanTerm);

      return matchDigits || matchFormatted || matchDesc;
    });

    this.cfops.set(filtered);
  }

  search(): void {
    this.applyFilter();
  }

  selectRow(cfop: Cfop): void {
    this.selectedCfop.set(cfop);
  }

  confirmSelection(cfop?: Cfop): void {
    const item = cfop || this.selectedCfop();
    if (item) {
      this.dialogRef.close(item);
    }
  }

  formatCode(codigo: string): string {
    return this.cfopService.formatCfop(codigo);
  }

  private normalize(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}
