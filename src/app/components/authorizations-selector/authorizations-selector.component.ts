import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';

import { AuthService } from '@services/auth/auth.service';
import { Authorizations } from '@enums/authorizations';
import { Person } from '@interfaces/person';

export interface AuthItem {
  key: string;
  label: string;
  scopeLabel: string;
  scopeType: 'tab' | 'network' | 'store' | 'self' | 'sensitive' | 'admin' | 'general';
  scopeIcon: string;
}

export interface AuthModuleGroup {
  module: string;
  title: string;
  icon: string;
  authorizations: AuthItem[];
}

export const PRESET_GERENTE_AUTHS: string[] = [
  Authorizations.TAB_DASHBOARD,
  Authorizations.TAB_STORE,
  Authorizations.TAB_FINANCIAL,
  Authorizations.TAB_PERSON,
  Authorizations.TAB_VEHICLE,
  Authorizations.TAB_COMPRA,
  Authorizations.TAB_VENDA,
  Authorizations.TAB_NFE,
  Authorizations.TAB_REPORT,

  Authorizations.READ_DASHBOARD_STORE,
  Authorizations.READ_DASHBOARD_NETWORK,

  Authorizations.READ_STORE_SELF,
  Authorizations.READ_STORE_NETWORK,

  Authorizations.READ_USER_SELF,
  Authorizations.READ_USER_STORE,
  Authorizations.READ_USER_NETWORK,
  Authorizations.CREATE_USER_STORE,
  Authorizations.EDIT_USER_SELF,
  Authorizations.EDIT_USER_STORE,
  Authorizations.DELETE_USER_STORE,

  Authorizations.READ_PERSON_SELF,
  Authorizations.READ_PERSON_STORE,
  Authorizations.READ_PERSON_NETWORK,
  Authorizations.CREATE_PERSON_STORE,
  Authorizations.EDIT_PERSON_SELF,
  Authorizations.EDIT_PERSON_STORE,
  Authorizations.DELETE_PERSON_STORE,

  Authorizations.READ_VEHICLE_STORE,
  Authorizations.READ_VEHICLE_NETWORK,
  Authorizations.CREATE_VEHICLE_STORE,
  Authorizations.EDIT_VEHICLE_STORE,
  Authorizations.READ_VEHICLE_PURCHASE_PRICE,
  Authorizations.READ_VEHICLE_PROFIT,

  Authorizations.READ_NFE_STORE,
  Authorizations.CREATE_NFE_STORE,
  Authorizations.EMITIR_NFE_STORE,
  Authorizations.CANCEL_NFE_STORE,

  Authorizations.READ_COMPRA_STORE,
  Authorizations.CREATE_COMPRA_STORE,
  Authorizations.EDIT_COMPRA_STORE,
  Authorizations.CANCEL_COMPRA_STORE,

  Authorizations.READ_VENDA_STORE,
  Authorizations.CREATE_VENDA_STORE,
  Authorizations.EDIT_VENDA_STORE,
  Authorizations.CANCEL_VENDA_STORE,

  Authorizations.READ_FINANCIAL_STORE,
  Authorizations.READ_FINANCIAL_NETWORK,
  Authorizations.CREATE_FINANCIAL_STORE,
  Authorizations.EDIT_FINANCIAL_STORE,
  Authorizations.DELETE_FINANCIAL_STORE,
];

export const PRESET_VENDEDOR_AUTHS: string[] = [
  Authorizations.TAB_PERSON,
  Authorizations.TAB_VEHICLE,
  Authorizations.TAB_VENDA,
  Authorizations.TAB_NFE,

  Authorizations.READ_STORE_SELF,

  Authorizations.READ_USER_SELF,
  Authorizations.EDIT_USER_SELF,

  Authorizations.READ_PERSON_SELF,
  Authorizations.READ_PERSON_STORE,
  Authorizations.CREATE_PERSON_STORE,
  Authorizations.EDIT_PERSON_SELF,
  Authorizations.EDIT_PERSON_STORE,

  Authorizations.READ_VEHICLE_STORE,
  Authorizations.CREATE_VEHICLE_STORE,
  Authorizations.EDIT_VEHICLE_STORE,

  Authorizations.READ_NFE_STORE,
  Authorizations.CREATE_NFE_STORE,
  Authorizations.EMITIR_NFE_STORE,

  Authorizations.READ_VENDA_STORE,
  Authorizations.CREATE_VENDA_STORE,
  Authorizations.EDIT_VENDA_STORE,
];

@Component({
  selector: 'app-authorizations-selector',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
  ],
  templateUrl: './authorizations-selector.component.html',
  styleUrls: ['./authorizations-selector.component.scss'],
})
export class AuthorizationsSelectorComponent implements OnInit, OnChanges {
  @Input() selectedAuths: string[] = [];
  @Input() otherEmployees: Person[] = [];
  @Input() person?: Person;
  @Input() showCopyBar: boolean = true;
  @Input() showPresetsBar: boolean = true;
  @Input() disabled: boolean = false;

  @Output() authorizationsChange = new EventEmitter<string[]>();

  modules: AuthModuleGroup[] = [];
  internalSelected = new Set<string>();
  loading = true;
  copying = false;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.syncInternalSelected();
    this.loadAuthorizations();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedAuths']) {
      this.syncInternalSelected();
    }
  }

  private syncInternalSelected(): void {
    this.internalSelected = new Set(this.selectedAuths || []);
  }

  loadAuthorizations(): void {
    this.loading = true;
    this.http.get<Record<string, { key: string; label: string }[]>>('/api/authorizations').subscribe({
      next: (response) => {
        const isRoot = this.authService.hasAuthority(Authorizations.ROOT_ADMIN);
        const rootOnlyKeys = [Authorizations.ROOT_ADMIN];

        const moduleOrder = [
          'ABAS',
          'DASHBOARD',
          'STORE',
          'FINANCIAL',
          'PERSON',
          'VEHICLE',
          'COMPRA',
          'VENDA',
          'NFE',
          'USER',
          'AUTH',
          'COBRANCA',
        ];

        this.modules = Object.keys(response)
          .map((moduleKey) => {
            let auths = response[moduleKey];
            if (!isRoot) {
              auths = auths.filter(
                (a) =>
                  !rootOnlyKeys.includes(a.key as Authorizations) &&
                  this.authService.hasAuthority(a.key as Authorizations),
              );
            }

            const items: AuthItem[] = auths.map((a) => {
              const scope = this.resolveScope(a.key);
              return {
                key: a.key,
                label: a.label,
                scopeLabel: scope.label,
                scopeType: scope.type,
                scopeIcon: scope.icon,
              };
            });

            return {
              module: moduleKey,
              title: this.getTranslatedModuleTitle(moduleKey),
              icon: this.getModuleIcon(moduleKey),
              authorizations: items,
            };
          })
          .filter((m) => m.authorizations.length > 0)
          .sort((a, b) => moduleOrder.indexOf(a.module) - moduleOrder.indexOf(b.module));

        this.loading = false;
      },
      error: (err) => {
        console.error('Falha ao carregar permissões', err);
        this.toastr.error('Erro ao carregar lista de permissões disponíveis.');
        this.loading = false;
      },
    });
  }

  private resolveScope(key: string): {
    label: string;
    type: 'tab' | 'network' | 'store' | 'self' | 'sensitive' | 'admin' | 'general';
    icon: string;
  } {
    if (key.startsWith('tab:')) {
      return { label: 'Aba', type: 'tab', icon: 'tab' };
    }
    if (key === 'read:vehicle:purchase_price' || key === 'read:vehicle:profit') {
      return { label: 'Sigiloso', type: 'sensitive', icon: 'lock' };
    }
    if (key.endsWith(':network')) {
      return { label: 'Rede', type: 'network', icon: 'hub' };
    }
    if (key.endsWith(':store')) {
      return { label: 'Loja', type: 'store', icon: 'storefront' };
    }
    if (key.endsWith(':self')) {
      return { label: 'Próprio', type: 'self', icon: 'person' };
    }
    if (key.endsWith(':auth')) {
      return { label: 'Gestão', type: 'admin', icon: 'admin_panel_settings' };
    }
    return { label: 'Geral', type: 'general', icon: 'check' };
  }

  private getTranslatedModuleTitle(moduleKey: string): string {
    const titles: Record<string, string> = {
      ABAS: 'Acesso a Abas / Telas',
      DASHBOARD: 'Dashboard & Indicadores',
      STORE: 'Lojas',
      FINANCIAL: 'Financeiro',
      PERSON: 'Pessoas / Clientes',
      VEHICLE: 'Veículos',
      COMPRA: 'Compras',
      VENDA: 'Vendas',
      NFE: 'Notas Fiscais (NF-e)',
      USER: 'Usuários do Sistema',
      AUTH: 'Controle de Permissões',
      COBRANCA: 'Cobrança (Gestora)',
    };
    return titles[moduleKey] || moduleKey;
  }

  private getModuleIcon(moduleKey: string): string {
    const icons: Record<string, string> = {
      ABAS: 'tab',
      DASHBOARD: 'dashboard',
      STORE: 'store',
      FINANCIAL: 'attach_money',
      PERSON: 'people',
      VEHICLE: 'directions_car',
      COMPRA: 'shopping_cart',
      VENDA: 'sell',
      NFE: 'receipt_long',
      USER: 'manage_accounts',
      AUTH: 'security',
      COBRANCA: 'payments',
    };
    return icons[moduleKey] || 'folder';
  }

  hasAuth(key: string): boolean {
    return this.internalSelected.has(key);
  }

  toggleAuth(key: string): void {
    if (this.disabled) return;
    if (this.internalSelected.has(key)) {
      this.internalSelected.delete(key);
    } else {
      this.internalSelected.add(key);
    }
    this.emitChange();
  }

  isAllModuleSelected(moduleGroup: AuthModuleGroup): boolean {
    if (moduleGroup.authorizations.length === 0) return false;
    return moduleGroup.authorizations.every((auth) => this.internalSelected.has(auth.key));
  }

  isSomeModuleSelected(moduleGroup: AuthModuleGroup): boolean {
    const checkedCount = moduleGroup.authorizations.filter((auth) => this.internalSelected.has(auth.key)).length;
    return checkedCount > 0 && checkedCount < moduleGroup.authorizations.length;
  }

  getActiveCount(moduleGroup: AuthModuleGroup): number {
    return moduleGroup.authorizations.filter((auth) => this.internalSelected.has(auth.key)).length;
  }

  toggleAllModule(moduleGroup: AuthModuleGroup, event: Event): void {
    if (this.disabled) return;
    const checked = (event.target as HTMLInputElement).checked;
    moduleGroup.authorizations.forEach((auth) => {
      if (checked) {
        this.internalSelected.add(auth.key);
      } else {
        this.internalSelected.delete(auth.key);
      }
    });
    this.emitChange();
  }

  applyPreset(preset: 'GERENTE' | 'VENDEDOR' | 'ALL' | 'NONE'): void {
    if (this.disabled) return;
    const availableKeys = new Set(this.modules.flatMap((m) => m.authorizations.map((a) => a.key)));

    if (preset === 'ALL') {
      availableKeys.forEach((key) => this.internalSelected.add(key));
      this.toastr.info('Todas as permissões foram selecionadas.');
    } else if (preset === 'NONE') {
      this.internalSelected.clear();
      this.toastr.info('Todas as permissões foram desmarcadas.');
    } else if (preset === 'GERENTE') {
      this.internalSelected.clear();
      PRESET_GERENTE_AUTHS.filter((key) => availableKeys.has(key)).forEach((key) => this.internalSelected.add(key));
      this.toastr.success('Preset de Gerente aplicado com sucesso.');
    } else if (preset === 'VENDEDOR') {
      this.internalSelected.clear();
      PRESET_VENDEDOR_AUTHS.filter((key) => availableKeys.has(key)).forEach((key) => this.internalSelected.add(key));
      this.toastr.success('Preset de Vendedor aplicado com sucesso.');
    }

    this.emitChange();
  }

  copyPermissionsFrom(sourcePerson: Person): void {
    if (!sourcePerson?.personId || this.disabled) return;

    this.copying = true;
    this.http.get<{ authorizations: string[] }>(`/api/persons/${sourcePerson.personId}/authorizations`).subscribe({
      next: (res) => {
        this.internalSelected.clear();
        if (res && res.authorizations) {
          const availableKeys = new Set(this.modules.flatMap((m) => m.authorizations.map((a) => a.key)));
          res.authorizations.filter((key) => availableKeys.has(key)).forEach((auth) => this.internalSelected.add(auth));
        }
        this.toastr.success(`Permissões copiadas com sucesso de ${sourcePerson.name}!`);
        this.copying = false;
        this.emitChange();
      },
      error: (err) => {
        console.error('Erro ao buscar permissões para cópia:', err);
        this.toastr.error('Erro ao buscar permissões do funcionário selecionado.');
        this.copying = false;
      },
    });
  }

  getRelationshipLabel(rel: any): string {
    if (!rel) return '';
    const relStr = typeof rel === 'object' ? rel?.name || '' : rel;
    const labels: Record<string, string> = {
      GERENTE: 'Gerente',
      VENDEDOR: 'Vendedor',
      PROPRIETARIO: 'Proprietário',
      CLIENTE: 'Cliente',
    };
    return labels[(relStr || '').toUpperCase()] || relStr;
  }

  private emitChange(): void {
    this.authorizationsChange.emit(Array.from(this.internalSelected));
  }
}
