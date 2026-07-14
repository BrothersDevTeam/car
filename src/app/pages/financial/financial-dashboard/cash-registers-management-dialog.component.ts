import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatCardModule } from '@angular/material/card';
import { ToastrService } from 'ngx-toastr';
import { CashRegisterService } from '@services/cash-register.service';
import { ICashRegister, ICashRegisterSession, ICashRegisterReport } from '@interfaces/cash-register';

@Component({
  selector: 'app-cash-registers-management-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatCardModule,
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon>point_of_sale</mat-icon>
      <span>Controle e Fechamento de Caixa</span>
    </h2>

    <mat-dialog-content class="dialog-content">
      <mat-tab-group [selectedIndex]="selectedTabIndex" (selectedIndexChange)="onTabChange($event)">
        <!-- ABA 1: LISTAGEM E OPERAÇÕES -->
        <mat-tab label="Caixas e Aberturas">
          <div class="tab-padding">
            @if (loading) {
              <div class="spinner-container">
                <mat-spinner diameter="40"></mat-spinner>
              </div>
            } @else {
              <!-- Lista de Caixas -->
              <div class="registers-list">
                @for (reg of registers; track reg.cashRegisterId) {
                  <div class="register-card" [class.open]="sessions[reg.cashRegisterId]?.status === 'OPEN'">
                    <div class="card-header-row">
                      <div class="title-section">
                        <mat-icon class="card-icon">point_of_sale</mat-icon>
                        <div>
                          <h3 class="register-name">{{ reg.name }}</h3>
                          <span class="status-badge" [class.open]="sessions[reg.cashRegisterId]?.status === 'OPEN'">
                            {{ sessions[reg.cashRegisterId]?.status === 'OPEN' ? 'ABERTO' : 'FECHADO' }}
                          </span>
                        </div>
                      </div>

                      <div class="actions-section">
                        @if (sessions[reg.cashRegisterId]?.status === 'OPEN') {
                          <button mat-flat-button color="warn" (click)="closeSession(sessions[reg.cashRegisterId]!)">
                            <mat-icon>lock</mat-icon>
                            <span>Fechar Caixa</span>
                          </button>
                          <button
                            mat-stroked-button
                            color="primary"
                            (click)="viewReport(sessions[reg.cashRegisterId]!)"
                          >
                            <mat-icon>bar_chart</mat-icon>
                            <span>Relatório</span>
                          </button>
                        } @else {
                          <button mat-flat-button color="primary" (click)="startOpenFlow(reg)">
                            <mat-icon>lock_open</mat-icon>
                            <span>Abrir Caixa</span>
                          </button>
                          @if (sessions[reg.cashRegisterId]) {
                            <button
                              mat-stroked-button
                              color="warn"
                              (click)="reopenSession(sessions[reg.cashRegisterId]!)"
                            >
                              <mat-icon>refresh</mat-icon>
                              <span>Reabrir</span>
                            </button>
                            <button
                              mat-stroked-button
                              color="primary"
                              (click)="viewReport(sessions[reg.cashRegisterId]!)"
                            >
                              <mat-icon>bar_chart</mat-icon>
                              <span>Último Relatório</span>
                            </button>
                          }
                        }
                      </div>
                    </div>

                    <!-- Detalhes se estiver Aberto -->
                    @if (sessions[reg.cashRegisterId]?.status === 'OPEN') {
                      <div class="session-details animate-fade-in">
                        <mat-divider></mat-divider>
                        <div class="details-grid">
                          <div>
                            <span class="label">Operador</span>
                            <span class="val">{{ sessions[reg.cashRegisterId]?.openedBy }}</span>
                          </div>
                          <div>
                            <span class="label">Aberto Em</span>
                            <span class="val">
                              {{ sessions[reg.cashRegisterId]?.openedAt | date: 'dd/MM/yyyy HH:mm' }}
                            </span>
                          </div>
                          <div>
                            <span class="label">Saldo Inicial</span>
                            <span class="val">
                              {{ sessions[reg.cashRegisterId]?.initialBalance | currency: 'BRL' }}
                            </span>
                          </div>
                        </div>
                      </div>
                    }

                    <!-- Painel de Abertura (Formulário inline) -->
                    @if (openingRegisterId === reg.cashRegisterId) {
                      <div class="open-form-inline animate-fade-in">
                        <mat-divider></mat-divider>
                        <form [formGroup]="openForm" (ngSubmit)="submitOpenSession(reg)" class="form-row">
                          <mat-form-field appearance="outline" class="form-field">
                            <mat-label>Saldo Inicial (R$)</mat-label>
                            <input matInput type="number" formControlName="initialBalance" placeholder="0.00" />
                          </mat-form-field>
                          <div class="form-actions">
                            <button mat-raised-button color="primary" type="submit" [disabled]="openForm.invalid">
                              Confirmar Abertura
                            </button>
                            <button mat-button type="button" (click)="openingRegisterId = null">Cancelar</button>
                          </div>
                        </form>
                      </div>
                    }
                  </div>
                } @empty {
                  <div class="empty-state">
                    <mat-icon>info_outline</mat-icon>
                    <p>Nenhum caixa cadastrado para esta loja.</p>
                  </div>
                }
              </div>
            }
          </div>
        </mat-tab>

        <!-- ABA 2: RELATÓRIO DO CAIXA -->
        <mat-tab label="Relatório de Caixa" [disabled]="!activeReportSession">
          <div class="tab-padding">
            @if (loadingReport) {
              <div class="spinner-container">
                <mat-spinner diameter="40"></mat-spinner>
              </div>
            } @else if (reportData && activeReportSession) {
              <div class="report-container">
                <div class="report-header">
                  <div>
                    <h3 class="title">Resumo do Caixa: {{ activeReportSession.cashRegisterName }}</h3>
                    <span class="subtitle">
                      Sessão: {{ activeReportSession.openedAt | date: 'dd/MM/yyyy HH:mm' }} até
                      {{
                        activeReportSession.closedAt
                          ? (activeReportSession.closedAt | date: 'dd/MM/yyyy HH:mm')
                          : 'Hoje (Aberto)'
                      }}
                    </span>
                  </div>
                </div>

                <div class="metrics-grid">
                  <div class="metric-card">
                    <span class="label">Saldo Inicial</span>
                    <span class="val">{{ reportData.initialBalance | currency: 'BRL' }}</span>
                  </div>
                  <div class="metric-card income">
                    <span class="label">Entradas (+)</span>
                    <span class="val">+{{ reportData.totalIncome | currency: 'BRL' }}</span>
                  </div>
                  <div class="metric-card expense">
                    <span class="label">Saídas (-)</span>
                    <span class="val">-{{ reportData.totalExpense | currency: 'BRL' }}</span>
                  </div>
                  <div class="metric-card final">
                    <span class="label">
                      {{ activeReportSession.status === 'CLOSED' ? 'Saldo Final' : 'Saldo Projetado' }}
                    </span>
                    <span class="val" [class.negative]="reportData.finalBalance < 0">
                      {{ reportData.finalBalance | currency: 'BRL' }}
                    </span>
                  </div>
                </div>

                <mat-divider style="margin: 20px 0;"></mat-divider>

                <!-- Detalhado por Meios de Pagamento -->
                <div class="methods-grid">
                  <div>
                    <h4 class="section-title">Entradas por Meio</h4>
                    @for (item of reportData.incomeByMethod | keyvalue; track item.key) {
                      <div class="method-row">
                        <span>{{ getMethodLabel(item.key) }}</span>
                        <strong class="text-success">{{ item.value | currency: 'BRL' }}</strong>
                      </div>
                    } @empty {
                      <p class="no-data">Nenhuma entrada registrada.</p>
                    }
                  </div>

                  <div>
                    <h4 class="section-title">Saídas por Meio</h4>
                    @for (item of reportData.expenseByMethod | keyvalue; track item.key) {
                      <div class="method-row">
                        <span>{{ getMethodLabel(item.key) }}</span>
                        <strong class="text-danger">{{ item.value | currency: 'BRL' }}</strong>
                      </div>
                    } @empty {
                      <p class="no-data">Nenhuma saída registrada.</p>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </mat-tab>

        <!-- ABA 3: NOVO CAIXA -->
        <mat-tab label="Novo Caixa">
          <div class="tab-padding">
            <form [formGroup]="registerForm" (ngSubmit)="submitRegister()" class="register-form">
              <h3 style="margin-top: 0; margin-bottom: 16px;">Cadastrar Novo Caixa</h3>
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Nome do Caixa</mat-label>
                <input matInput formControlName="name" placeholder="Ex: Caixa Principal, Caixa Banco..." />
                <mat-error *ngIf="registerForm.get('name')?.hasError('required')">O nome é obrigatório</mat-error>
              </mat-form-field>
              <button
                mat-raised-button
                color="primary"
                type="submit"
                [disabled]="registerForm.invalid"
                style="height: 48px"
              >
                Adicionar Caixa
              </button>
            </form>
          </div>
        </mat-tab>
      </mat-tab-group>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-button mat-dialog-close>Fechar Tela</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dialog-title {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #1976d2;
        color: white;
        padding: 16px 24px;
        margin: 0;
        font-size: 20px;
        font-weight: 500;
        mat-icon {
          font-size: 24px;
          width: 24px;
          height: 24px;
        }
      }

      .dialog-content {
        padding: 0 !important;
        min-height: 450px;
        max-height: 70vh;
      }

      .tab-padding {
        padding: 20px 24px;
      }

      .spinner-container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 200px;
      }

      .registers-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .register-card {
        border: 1px solid #e0e0e0;
        border-radius: 12px;
        padding: 20px;
        background: #fafafa;
        transition:
          box-shadow 0.2s ease-in-out,
          border-color 0.2s ease-in-out;

        &.open {
          border-color: rgba(46, 125, 50, 0.4);
          background: #f1f8e9;
        }

        &:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
      }

      .card-header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 16px;
      }

      .title-section {
        display: flex;
        align-items: center;
        gap: 12px;

        .card-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
          color: #1976d2;
        }

        .register-name {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }
      }

      .status-badge {
        display: inline-block;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 4px;
        background: #ccc;
        color: white;
        margin-top: 4px;

        &.open {
          background: #2e7d32;
        }
      }

      .actions-section {
        display: flex;
        gap: 8px;
        button {
          height: 38px;
          font-size: 13px;
          mat-icon {
            font-size: 18px;
            width: 18px;
            height: 18px;
          }
        }
      }

      .session-details {
        margin-top: 16px;
        padding-top: 16px;
      }

      .details-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 16px;
        margin-top: 12px;

        .label {
          display: block;
          font-size: 11px;
          color: #666;
          text-transform: uppercase;
          font-weight: 500;
        }

        .val {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #333;
          margin-top: 2px;
        }
      }

      .open-form-inline {
        margin-top: 16px;
        padding-top: 16px;

        .form-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 12px;
        }

        .form-field {
          margin-bottom: 0;
          ::ng-deep .mat-mdc-form-field-subscript-wrapper {
            display: none;
          }
        }

        .form-actions {
          display: flex;
          gap: 8px;
          button {
            height: 48px;
          }
        }
      }

      .report-container {
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 12px;
        padding: 24px;
      }

      .report-header {
        margin-bottom: 20px;
        .title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }
        .subtitle {
          font-size: 13px;
          color: #666;
        }
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 16px;
      }

      .metric-card {
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 16px;
        background: #fafafa;
        display: flex;
        flex-direction: column;

        .label {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
          font-weight: 500;
        }

        .val {
          font-size: 20px;
          font-weight: 700;
          color: #333;
          margin-top: 4px;
        }

        &.income {
          border-left: 4px solid #2e7d32;
          .val {
            color: #2e7d32;
          }
        }

        &.expense {
          border-left: 4px solid #c62828;
          .val {
            color: #c62828;
          }
        }

        &.final {
          background: #e8f5e9;
          border-left: 4px solid #2e7d32;
          .val {
            color: #2e7d32;
          }

          .val.negative {
            color: #c62828;
          }
        }
      }

      .methods-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 32px;
      }

      .section-title {
        margin-top: 0;
        margin-bottom: 16px;
        font-size: 15px;
        font-weight: 600;
        color: #333;
      }

      .method-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px dashed #e0e0e0;
        font-size: 14px;
      }

      .no-data {
        font-size: 13px;
        color: #999;
        margin: 0;
        font-style: italic;
      }

      .text-success {
        color: #2e7d32;
      }
      .text-danger {
        color: #c62828;
      }

      .register-form {
        max-width: 400px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 40px;
        color: #888;
        mat-icon {
          font-size: 36px;
          width: 36px;
          height: 36px;
          margin-bottom: 8px;
        }
      }

      .w-100 {
        width: 100%;
      }

      .animate-fade-in {
        animation: fadeIn 0.2s ease-in-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class CashRegistersManagementDialogComponent implements OnInit {
  storeId: string;
  loading = true;
  registers: ICashRegister[] = [];
  sessions: { [key: string]: ICashRegisterSession | undefined } = {};

  // Estados de abertura inline
  openingRegisterId: string | null = null;
  openForm: FormGroup;

  // Estados do relatório
  selectedTabIndex = 0;
  activeReportSession: ICashRegisterSession | null = null;
  loadingReport = false;
  reportData: ICashRegisterReport | null = null;

  // Estado de cadastro
  registerForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private service: CashRegisterService,
    private toastr: ToastrService,
    @Inject(MAT_DIALOG_DATA) public data: { storeId: string },
  ) {
    this.storeId = data.storeId;

    this.openForm = this.fb.group({
      initialBalance: [0, [Validators.required, Validators.min(0)]],
    });

    this.registerForm = this.fb.group({
      name: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.service.getCashRegisters(this.storeId).subscribe({
      next: (list) => {
        this.registers = list;
        this.loadSessions();
      },
      error: (err) => {
        console.error('Erro ao carregar caixas', err);
        this.toastr.error('Erro ao carregar os caixas.');
        this.loading = false;
      },
    });
  }

  loadSessions(): void {
    if (this.registers.length === 0) {
      this.loading = false;
      return;
    }

    const promises = this.registers.map((reg) => {
      return new Promise<void>((resolve) => {
        this.service.getCurrentSession(reg.cashRegisterId).subscribe({
          next: (session) => {
            if (session) {
              this.sessions[reg.cashRegisterId] = session;
            }
            resolve();
          },
          error: (err) => {
            console.error(`Erro ao carregar sessão para o caixa ${reg.name}`, err);
            resolve();
          },
        });
      });
    });

    Promise.all(promises).then(() => {
      this.loading = false;
    });
  }

  startOpenFlow(reg: ICashRegister): void {
    this.openingRegisterId = reg.cashRegisterId;
    this.openForm.reset({ initialBalance: 0 });
  }

  submitOpenSession(reg: ICashRegister): void {
    if (this.openForm.invalid) return;

    const request = {
      cashRegisterId: reg.cashRegisterId,
      initialBalance: this.openForm.value.initialBalance,
    };

    this.service.openSession(request).subscribe({
      next: (session) => {
        this.toastr.success(`Caixa "${reg.name}" aberto com sucesso!`);
        this.sessions[reg.cashRegisterId] = session;
        this.openingRegisterId = null;
        this.loadData();
      },
      error: (err) => {
        console.error('Erro ao abrir caixa', err);
        this.toastr.error('Erro ao abrir o caixa.');
      },
    });
  }

  closeSession(session: ICashRegisterSession): void {
    if (!confirm(`Deseja realmente FECHAR o caixa "${session.cashRegisterName}"?`)) {
      return;
    }

    this.service.closeSession(session.cashRegisterSessionId).subscribe({
      next: (res) => {
        this.toastr.success(`Caixa "${session.cashRegisterName}" fechado com sucesso!`);
        this.sessions[session.cashRegisterId] = res;
        this.loadData();
      },
      error: (err) => {
        console.error('Erro ao fechar caixa', err);
        this.toastr.error('Erro ao fechar o caixa.');
      },
    });
  }

  reopenSession(session: ICashRegisterSession): void {
    if (
      !confirm(
        `AVISO CRÍTICO:\nReabrir o caixa "${session.cashRegisterName}" irá reabrir este e todos os caixas posteriores deste mesmo registro.\n\nOs saldos de todas as aberturas e fechamentos subsequentes serão recalculados automaticamente em cascata para manter a integridade financeira.\n\nDeseja reabrir mesmo assim?`,
      )
    ) {
      return;
    }

    this.service.reopenSession(session.cashRegisterSessionId).subscribe({
      next: () => {
        this.toastr.success('Caixa e sessões posteriores reabertos com sucesso!');
        this.loadData();
      },
      error: (err) => {
        console.error('Erro ao reabrir caixa', err);
        this.toastr.error('Erro ao reabrir o caixa.');
      },
    });
  }

  viewReport(session: ICashRegisterSession): void {
    this.activeReportSession = session;
    this.loadingReport = true;
    this.selectedTabIndex = 1; // muda para aba do relatório

    this.service.getSessionReport(session.cashRegisterSessionId).subscribe({
      next: (report) => {
        this.reportData = report;
        this.loadingReport = false;
      },
      error: (err) => {
        console.error('Erro ao carregar relatório do caixa', err);
        this.toastr.error('Erro ao carregar o relatório do caixa.');
        this.loadingReport = false;
      },
    });
  }

  submitRegister(): void {
    if (this.registerForm.invalid) return;

    const request = {
      name: this.registerForm.value.name,
      storeId: this.storeId,
    };

    this.service.createCashRegister(request).subscribe({
      next: () => {
        this.toastr.success('Novo caixa cadastrado com sucesso!');
        this.registerForm.reset();
        this.selectedTabIndex = 0; // volta para aba principal
        this.loadData();
      },
      error: (err) => {
        console.error('Erro ao cadastrar caixa', err);
        this.toastr.error('Erro ao cadastrar o caixa.');
      },
    });
  }

  onTabChange(index: number): void {
    this.selectedTabIndex = index;
    if (index !== 1) {
      this.activeReportSession = null;
      this.reportData = null;
    }
  }

  getMethodLabel(method: string): string {
    switch (method) {
      case 'CASH':
        return 'Dinheiro Físico';
      case 'PIX':
        return 'PIX';
      case 'CREDIT_CARD':
        return 'Cartão de Crédito';
      case 'DEBIT_CARD':
        return 'Cartão de Débito';
      case 'BANK_TRANSFER':
        return 'Transferência Bancária (TED/DOC)';
      default:
        return method;
    }
  }
}
