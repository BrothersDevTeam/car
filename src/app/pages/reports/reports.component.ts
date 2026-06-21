import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastrService } from 'ngx-toastr';

import { ContentHeaderComponent } from '@components/content-header/content-header.component';
import { ReportService, ReportRequest } from '@services/report.service';
import { AuthService } from '@services/auth/auth.service';
import { StoreContextService } from '@services/store-context.service';
import { Authorizations } from '../../enums/authorizations';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    ContentHeaderComponent,
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly reportService = inject(ReportService);
  private readonly authService = inject(AuthService);
  private readonly storeContextService = inject(StoreContextService);
  private readonly toastr = inject(ToastrService);

  filterForm!: FormGroup;

  // Loading States
  loadingCustomer = false;
  loadingVehicle = false;
  loadingDre = false;
  loadingCashFlow = false;

  // Permissions Toggles
  canViewFinancial = false;
  canViewVehicle = false;
  canViewPerson = false;

  ngOnInit(): void {
    this.canViewFinancial =
      this.authService.hasAuthority(Authorizations.READ_FINANCIAL_STORE) ||
      this.authService.hasAuthority(Authorizations.READ_FINANCIAL_NETWORK) ||
      this.authService.hasAuthority(Authorizations.ROOT_ADMIN);

    this.canViewVehicle =
      this.authService.hasAuthority(Authorizations.READ_VEHICLE_STORE) ||
      this.authService.hasAuthority(Authorizations.READ_VEHICLE_NETWORK) ||
      this.authService.hasAuthority(Authorizations.ROOT_ADMIN);

    this.canViewPerson =
      this.authService.hasAuthority(Authorizations.READ_PERSON_STORE) ||
      this.authService.hasAuthority(Authorizations.READ_PERSON_NETWORK) ||
      this.authService.hasAuthority(Authorizations.ROOT_ADMIN);

    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    this.filterForm = this.fb.group({
      startDate: [this.formatDate(firstDayOfMonth)],
      endDate: [this.formatDate(today)],
      format: ['PDF', Validators.required],
    });
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  }

  private getRequestPayload(): ReportRequest {
    const raw = this.filterForm.value;
    return {
      format: raw.format,
      startDate: raw.startDate || undefined,
      endDate: raw.endDate || undefined,
      storeId: this.storeContextService.currentStoreId,
    };
  }

  downloadCustomer(): void {
    if (!this.canViewPerson) return;
    this.loadingCustomer = true;
    const req = this.getRequestPayload();
    this.reportService.downloadCustomerReport(req).subscribe({
      next: (blob) => {
        const ext = req.format === 'PDF' ? 'pdf' : 'xlsx';
        this.reportService.saveFile(blob, `relatorio_clientes.${ext}`);
        this.toastr.success('Relatório de Clientes gerado com sucesso!', 'Sucesso');
        this.loadingCustomer = false;
      },
      error: (err) => {
        console.error('Error exporting customers', err);
        this.toastr.error('Erro ao exportar relatório de Clientes.', 'Erro');
        this.loadingCustomer = false;
      },
    });
  }

  downloadVehicle(): void {
    if (!this.canViewVehicle) return;
    this.loadingVehicle = true;
    const req = this.getRequestPayload();
    this.reportService.downloadVehicleReport(req).subscribe({
      next: (blob) => {
        const ext = req.format === 'PDF' ? 'pdf' : 'xlsx';
        this.reportService.saveFile(blob, `relatorio_veiculos.${ext}`);
        this.toastr.success('Relatório de Veículos gerado com sucesso!', 'Sucesso');
        this.loadingVehicle = false;
      },
      error: (err) => {
        console.error('Error exporting vehicles', err);
        this.toastr.error('Erro ao exportar relatório de Veículos.', 'Erro');
        this.loadingVehicle = false;
      },
    });
  }

  downloadDre(): void {
    if (!this.canViewFinancial) return;
    this.loadingDre = true;
    const req = this.getRequestPayload();
    this.reportService.downloadDreReport(req).subscribe({
      next: (blob) => {
        const ext = req.format === 'PDF' ? 'pdf' : 'xlsx';
        this.reportService.saveFile(blob, `relatorio_dre.${ext}`);
        this.toastr.success('Relatório DRE gerado com sucesso!', 'Sucesso');
        this.loadingDre = false;
      },
      error: (err) => {
        console.error('Error exporting DRE', err);
        this.toastr.error('Erro ao exportar DRE.', 'Erro');
        this.loadingDre = false;
      },
    });
  }

  downloadCashFlow(): void {
    if (!this.canViewFinancial) return;
    this.loadingCashFlow = true;
    const req = this.getRequestPayload();
    this.reportService.downloadCashFlowReport(req).subscribe({
      next: (blob) => {
        const ext = req.format === 'PDF' ? 'pdf' : 'xlsx';
        this.reportService.saveFile(blob, `relatorio_fluxo_caixa.${ext}`);
        this.toastr.success('Relatório de Fluxo de Caixa gerado com sucesso!', 'Sucesso');
        this.loadingCashFlow = false;
      },
      error: (err) => {
        console.error('Error exporting cash flow', err);
        this.toastr.error('Erro ao exportar Fluxo de Caixa.', 'Erro');
        this.loadingCashFlow = false;
      },
    });
  }
}
