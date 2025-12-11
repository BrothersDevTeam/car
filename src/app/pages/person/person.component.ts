import { ToastrService } from 'ngx-toastr';

import {
  inject,
  OnInit,
  signal,
  Component,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { catchError, debounceTime, of, Subject, Subscription } from 'rxjs';

import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';

import { DrawerComponent } from '@components/drawer/drawer.component';
import { GenericTableComponent } from '@components/generic-table/generic-table.component';
import { ContentHeaderComponent } from '@components/content-header/content-header.component';
import { UnsavedChangesDialogComponent } from '@components/dialogs/unsaved-changes-dialog/unsaved-changes-dialog.component';
import { ConfirmDialogComponent } from '@components/dialogs/confirm-dialog/confirm-dialog.component';
import { BusinessDoneTableComponent } from '@components/tables/business-done-table/business-done-table.component';

import { LegalEntityFormComponent } from '@forms/client/legal-entity-form/legal-entity-form.component';
import { NaturalPersonFormComponent } from '@forms/client/natural-person-form/natural-person-form.component';

import { LegalEntityInfoComponent } from '@info/legal-entity-info/legal-entity-info.component';
import { NaturalPersonInfoComponent } from '@info/natural-person-info/natural-person-info.component';

import type { Person } from '@interfaces/person';
import type { PaginationResponse } from '@interfaces/pagination';
import type { ColumnConfig } from '@interfaces/genericTable';

import { PersonService } from '@services/person.service';
import { ActionsService } from '@services/actions.service';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';

/**
 * Tipo literal para representar os tipos principais de relacionamento
 * Usado em conjunto com mat-radio-group para seleção exclusiva
 */
type MainRelationshipType = 'CLIENTE' | 'FUNCIONARIO' | null;

/**
 * Interface para controlar os sub-filtros de FUNCIONÁRIO
 * Estes filtros só são aplicados quando o tipo principal é FUNCIONARIO
 */
interface EmployeeSubFilters {
  vendedor: boolean;
  gerente: boolean;
  admin: boolean;
}

@Component({
  selector: 'app-person',
  imports: [
    FormsModule,
    ContentHeaderComponent,
    DrawerComponent,
    MatTabsModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    LegalEntityFormComponent,
    NaturalPersonFormComponent,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    LegalEntityInfoComponent,
    NaturalPersonInfoComponent,
    BusinessDoneTableComponent,
    GenericTableComponent,
    MatRadioButton,
    MatRadioGroup,
  ],
  templateUrl: './person.component.html',
  styleUrl: './person.component.scss',
})
export class PersonComponent implements OnInit, OnDestroy {
  readonly dialog = inject(MatDialog);
  private subscriptions: Subscription[] = [];
  private searchSubject = new Subject<string>();

  personPaginatedList: PaginationResponse<Person> | null = null;
  selectedPerson: Person | null = null;
  searchValue: string = '';
  searchType: 'name' | 'cpf' | 'cnpj' | 'email' | 'storeId' | 'all' = 'all';
  isCarAdmin: boolean = false;

  /**
   * Tipo de relacionamento principal selecionado (CLIENTE ou FUNCIONARIO)
   * null = nenhum filtro aplicado
   * Usando mat-radio-button, apenas UMA opção pode estar selecionada por vez
   */
  selectedRelationshipType: MainRelationshipType = null;

  /**
   * Sub-filtros para quando FUNCIONARIO está selecionado
   * Permite filtrar por roles específicas (VENDEDOR, GERENTE, ADMIN)
   */
  employeeSubFilters: EmployeeSubFilters = {
    vendedor: false,
    gerente: false,
    admin: false,
  };
  paginationRequestConfig = {
    pageSize: 1000,
    pageIndex: 0,
  };
  columns: ColumnConfig<Person>[] = [
    {
      key: 'name',
      header: 'Nome',
      format: (value: any, row: Person) => {
        return row.name;
      },
    },
    {
      key: 'nickName',
      header: 'Apelido',
      format: (value: any, row: Person) => {
        return row.nickName ?? '';
      },
    },
    {
      key: 'cnpj',
      header: 'PF/PJ',
      format: (value: any, row: Person) =>
        row.legalEntity ? 'PESSOA JURÍDICA' : 'PESSOA FÍSICA',
    },
    {
      key: 'cpf-cnpj',
      header: 'CPF/CNPJ',
      format: (value: any, row: Person) => {
        return row.legalEntity ? row.cnpj : row.cpf || '-';
      },
    },
    {
      key: 'edit',
      header: '',
      showEditIcon: (row) => true,
    },
    {
      key: 'delete',
      header: '',
      showDeleteIcon: (row) => true,
    },
  ];

  clientListLoading = signal(false);
  clientListError = signal(false);
  openForm = signal(false);
  openInfo = signal(false);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  /**
   * Referências aos componentes de formulário para acessar os métodos
   * da interface CanComponentDeactivate
   */
  @ViewChild(NaturalPersonFormComponent)
  naturalPersonForm?: NaturalPersonFormComponent;
  @ViewChild(LegalEntityFormComponent)
  legalEntityForm?: LegalEntityFormComponent;

  constructor(
    private personService: PersonService,
    private toastr: ToastrService,
    private actionsService: ActionsService
  ) {
    // Verifica se o usuário é CAR_ADMIN
    this.checkUserRole();

    this.loadPersonList(
      this.paginationRequestConfig.pageIndex,
      this.paginationRequestConfig.pageSize
    );

    // Inscrever-se nas mudanças do cache
    this.setupCacheSubscription();

    // Configura o debounce para busca
    this.setupSearchDebounce();
  }

  ngOnInit() {
    this.subscriptions.push(
      this.actionsService.sidebarClick$.subscribe(() => {
        this.handleConfirmationCloseDrawer();
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  // Método para configurar a inscrição do cache
  private setupCacheSubscription() {
    this.subscriptions.push(
      this.personService.cacheUpdated.subscribe((updatedCache) => {
        if (updatedCache) {
          this.personPaginatedList = updatedCache;
        }
      })
    );
  }

  // Configura o debounce de 500ms para a busca
  private setupSearchDebounce() {
    this.subscriptions.push(
      this.searchSubject
        .pipe(
          debounceTime(500) // Aguarda 500ms após o usuário parar de digitar
        )
        .subscribe((searchValue) => {
          this.loadPersonList(
            0, // Sempre volta para a primeira página ao buscar
            this.paginationRequestConfig.pageSize,
            searchValue
          );
        })
    );
  }

  // Verifica se o usuário é CAR_ADMIN
  private checkUserRole() {
    this.isCarAdmin = this.personService.hasRole('ROLE_CAR_ADMIN');
  }

  handleFormChanged(isDirty: boolean) {
    this.actionsService.hasFormChanges.set(isDirty);
  }

  /**
   * Manipula o fechamento do drawer verificando se há mudanças não salvas
   * Se houver mudanças, abre o diálogo de confirmação inteligente
   * que oferece opções baseadas no estado do formulário
   */
  handleConfirmationCloseDrawer() {
    // Se não há mudanças, fecha direto
    if (!this.actionsService.hasFormChanges()) {
      this.handleCloseDrawer();
      return;
    }

    // Verifica qual componente de formulário está aberto
    const formComponent = this.getActiveFormComponent();

    // Se não conseguir identificar o componente OU se não implementa a interface,
    // usa o diálogo simples
    if (!formComponent || !this.hasCanDeactivateMethods(formComponent)) {
      this.openSimpleDialog();
      return;
    }

    // Verifica se o formulário pode ser salvo (campos obrigatórios preenchidos)
    const canSave = formComponent.canSaveForm();

    // Abre o diálogo inteligente com as opções apropriadas
    const dialogRef = this.dialog.open(UnsavedChangesDialogComponent, {
      width: '450px',
      disableClose: true,
      data: {
        canSave,
        message: canSave
          ? 'Deseja salvar as alterações antes de sair?'
          : 'Há campos obrigatórios não preenchidos. Deseja salvar um rascunho para continuar depois?',
      },
    });

    dialogRef
      .afterClosed()
      .subscribe(
        (result: 'save' | 'draft' | 'discard' | 'cancel' | undefined) => {
          // Se cancelou ou fechou, não faz nada
          if (!result || result === 'cancel') {
            return;
          }

          // Se escolheu descartar, fecha o drawer
          if (result === 'discard') {
            this.handleCloseDrawer();
            return;
          }

          // Se escolheu salvar completo
          if (result === 'save' && canSave) {
            formComponent.saveForm(false).subscribe((success: boolean) => {
              if (success) {
                this.onFormSubmitted();
              }
            });
            return;
          }

          // Se escolheu salvar rascunho
          if (result === 'draft') {
            formComponent.saveLocalDraft();
            this.handleCloseDrawer();
            return;
          }
        }
      );
  }

  handleCloseDrawer() {
    this.openForm.set(false);
    this.openInfo.set(false);
    this.selectedPerson = null;
    this.actionsService.hasFormChanges.set(false);
  }

  loadPersonList(pageIndex: number, pageSize: number, searchValue?: string) {
    this.clientListLoading.set(true);

    // Prepara os parâmetros de busca baseado no tipo selecionado
    let searchParams:
      | {
          name?: string;
          cpf?: string;
          cnpj?: string;
          email?: string;
          storeId?: string;
          search?: string;
          relationshipTypes?: string[];
          roleNames?: string[];
        }
      | undefined;

    if (searchValue && searchValue.trim()) {
      searchParams = {};

      // Se o tipo for "all", usa busca global
      if (this.searchType === 'all') {
        searchParams.search = searchValue.trim();
      }
      // Caso contrário, usa busca específica por campo
      else {
        searchParams[this.searchType] = searchValue.trim();
      }
    }

    // Adiciona o filtro de relationshipTypes se houver filtros ativos
    const relationshipTypesFilter = this.buildRelationshipTypesFilter();
    if (relationshipTypesFilter.length > 0) {
      // Inicializa searchParams se ainda não foi inicializado
      if (!searchParams) {
        searchParams = {};
      }
      searchParams.relationshipTypes = relationshipTypesFilter;
    }

    // Adiciona o filtro de roleNames se houver sub-filtros ativos
    const roleNamesFilter = this.buildRoleNamesFilter();
    if (roleNamesFilter.length > 0) {
      // Inicializa searchParams se ainda não foi inicializado
      if (!searchParams) {
        searchParams = {};
      }
      searchParams.roleNames = roleNamesFilter;
    }

    this.personService
      .getPaginatedData(pageIndex, pageSize, searchParams)
      .pipe(
        catchError((err) => {
          this.clientListLoading.set(false);
          this.clientListError.set(true);
          console.error('Erro ao carregar a lista de pessoas:', err);
          this.toastr.error('Erro ao buscar dados da tabela de clientes');
          return of();
        })
      )
      .subscribe((response) => {
        this.clientListLoading.set(false);
        if (response && response.content) {
          // A lista de pessoas está em response.content
          this.personPaginatedList = {
            ...response,
            content: response.content.map((person) => ({
              ...person,
              // Mapeie os dados conforme necessário para a tabela
            })),
          };
        }
      });
  }

  handleSelectedPerson(person: Person) {
    this.selectedPerson = person;
    this.openInfo.set(true);
  }

  onRowClick(person: Person) {
    this.handleSelectedPerson(person);
  }

  handleOpenForm() {
    this.openForm.set(true);
  }

  handlePageEvent(event: PageEvent) {
    this.loadPersonList(event.pageIndex, event.pageSize);
  }

  onSearch(event: Event) {
    const inputValue = (event.target as HTMLInputElement).value;
    this.searchValue = inputValue;

    // Envia para o Subject que tem debounce
    this.searchSubject.next(inputValue);
  }

  onSearchTypeChange(
    type: 'name' | 'cpf' | 'cnpj' | 'email' | 'storeId' | 'all'
  ) {
    this.searchType = type;
    if (this.searchValue) {
      this.performSearch();
    }
  }

  performSearch() {
    // Busca com os parâmetros atuais
    this.loadPersonList(
      0, // Sempre volta para a primeira página ao buscar
      this.paginationRequestConfig.pageSize,
      this.searchValue
    );
  }

  clearSearch() {
    this.searchValue = '';
    this.loadPersonList(
      this.paginationRequestConfig.pageIndex,
      this.paginationRequestConfig.pageSize
    );
  }

  handleEdit(person?: Person) {
    if (person) this.selectedPerson = person;
    this.openInfo.set(false);
    this.openForm.set(true);
  }

  handleDelete(person: Person) {
    this.openDeleteDialog(person);
  }

  openDeleteDialog(person: Person) {
    const dialogRef: MatDialogRef<ConfirmDialogComponent> = this.dialog.open(
      ConfirmDialogComponent,
      {
        data: {
          title: 'Confirmar Exclusão',
          message: `Tem certeza que deseja <strong>excluir</strong> ${person.name}?`,
          confirmText: 'Sim',
          cancelText: 'Não',
        },
      }
    );

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.deleteConfirmed(person);
      }
    });
  }

  deleteConfirmed(person: Person) {
    if (person.personId) {
      this.personService.delete(person.personId).subscribe({
        next: (response) => {
          console.log('Exclusão bem-sucedida:', response);
          this.toastr.success('Pessoa excluída com sucesso');
          // Recarrega a lista após exclusão bem-sucedida
          this.onFormSubmitted();
        },
        error: (error) => {
          console.error('Erro ao excluir pessoa:', error);
          // Verifica se há mensagem de erro específica do backend
          const errorMessage =
            error?.error?.message || error?.message || 'Erro ao excluir pessoa';
          this.toastr.error(errorMessage);
        },
      });
    } else {
      console.error('ID não encontrado para exclusão');
      this.toastr.error('ID não encontrado para exclusão');
    }
  }

  onFormSubmitted() {
    this.loadPersonList(
      this.paginationRequestConfig.pageIndex,
      this.paginationRequestConfig.pageSize
    );
    this.openForm.set(false);
    this.openInfo.set(false);
    this.selectedPerson = null;
    this.actionsService.hasFormChanges.set(false);
  }

  /**
   * Método chamado quando o radio button de tipo de relacionamento é alterado
   * - Limpa os sub-filtros quando FUNCIONARIO é desmarcado
   * - Recarrega a lista com o novo filtro aplicado
   *
   * @param newType - Novo tipo selecionado (CLIENTE, FUNCIONARIO ou null)
   */
  onRelationshipTypeChange(newType: MainRelationshipType) {
    this.selectedRelationshipType = newType;

    // Se não é FUNCIONARIO, limpa todos os sub-filtros de employee
    if (newType !== 'FUNCIONARIO') {
      this.employeeSubFilters = {
        vendedor: false,
        gerente: false,
        admin: false,
      };
    }

    // Aplica os filtros
    this.onFilterChange();
  }

  /**
   * Método chamado quando um sub-filtro de funcionário é alterado
   * Recarrega a lista com os novos sub-filtros aplicados
   */
  onEmployeeSubFilterChange() {
    this.onFilterChange();
  }

  /**
   * Método chamado quando qualquer filtro é alterado
   * Recarrega a lista de pessoas com os filtros aplicados
   */
  onFilterChange() {
    // Sempre volta para a primeira página ao aplicar filtros
    this.paginationRequestConfig.pageIndex = 0;
    this.loadPersonList(
      this.paginationRequestConfig.pageIndex,
      this.paginationRequestConfig.pageSize,
      this.searchValue
    );
  }

  /**
   * Verifica se há algum filtro ativo
   * @returns true se há pelo menos um filtro marcado (tipo principal ou sub-filtros)
   */
  hasActiveFilters(): boolean {
    return (
      this.selectedRelationshipType !== null ||
      this.employeeSubFilters.vendedor ||
      this.employeeSubFilters.gerente ||
      this.employeeSubFilters.admin
    );
  }

  /**
   * Limpa todos os filtros ativos e recarrega a lista
   * - Remove a seleção do tipo principal
   * - Limpa todos os sub-filtros de funcionário
   */
  clearFilters() {
    this.selectedRelationshipType = null;
    this.employeeSubFilters = {
      vendedor: false,
      gerente: false,
      admin: false,
    };
    this.onFilterChange();
  }

  /**
   * Constrói o array de relationshipTypes baseado no tipo selecionado
   * Como usamos radio button, apenas UM tipo pode estar ativo por vez
   * Este array será enviado como parâmetro para a API
   *
   * @returns Array com o tipo de relacionamento selecionado (vazio se nenhum)
   */
  private buildRelationshipTypesFilter(): string[] {
    const relationshipTypes: string[] = [];

    // Adiciona o tipo selecionado ao array (se houver algum selecionado)
    if (this.selectedRelationshipType) {
      relationshipTypes.push(this.selectedRelationshipType);
    }

    return relationshipTypes;
  }

  /**
   * Constrói o array de roleNames baseado nos sub-filtros de funcionário
   * Este array será enviado como parâmetro para a API
   *
   * IMPORTANTE: Só adiciona roles se FUNCIONARIO estiver selecionado como tipo principal
   * Isso garante que o filtro de roles só seja aplicado a funcionários
   *
   * @returns Array com as roles filtradas (vazio se FUNCIONARIO não estiver selecionado)
   */
  private buildRoleNamesFilter(): string[] {
    const roleNames: string[] = [];

    // Só filtra por roles se "FUNCIONARIO" estiver selecionado
    if (this.selectedRelationshipType !== 'FUNCIONARIO') {
      return roleNames; // Retorna vazio se não for funcionário
    }

    // Mapeamento dos sub-filtros para as roles correspondentes no backend
    const roleMapping: Record<keyof EmployeeSubFilters, string> = {
      vendedor: 'ROLE_SELLER',
      gerente: 'ROLE_MANAGER',
      admin: 'ROLE_ADMIN',
    };

    // Adiciona as roles baseado nos sub-filtros marcados
    if (this.employeeSubFilters.vendedor) roleNames.push(roleMapping.vendedor);
    if (this.employeeSubFilters.gerente) roleNames.push(roleMapping.gerente);
    if (this.employeeSubFilters.admin) roleNames.push(roleMapping.admin);

    return roleNames;
  }

  /**
   * Verifica se o componente implementa os métodos da interface CanComponentDeactivate
   */
  private hasCanDeactivateMethods(component: any): boolean {
    return (
      typeof component.canSaveForm === 'function' &&
      typeof component.saveForm === 'function' &&
      typeof component.saveLocalDraft === 'function'
    );
  }

  /**
   * Obtém a referência do componente de formulário ativo
   * Verifica qual formulário está visível (Pessoa Física ou Jurídica)
   */
  private getActiveFormComponent():
    | NaturalPersonFormComponent
    | LegalEntityFormComponent
    | null {
    // Verifica se é pessoa jurídica (CNPJ preenchido)
    if (this.selectedPerson?.legalEntity) {
      return this.legalEntityForm || null;
    }

    // Caso contrário, é pessoa física
    return this.naturalPersonForm || null;
  }

  /**
   * Abre o diálogo simples quando não consegue acessar o componente de formulário
   * Fallback para o comportamento antigo
   */
  private openSimpleDialog() {
    const dialogRef: MatDialogRef<ConfirmDialogComponent> = this.dialog.open(
      ConfirmDialogComponent,
      {
        data: {
          title: 'Há mudanças não salvas',
          message: 'Deseja fechar <strong>sem salvar</strong>?',
          confirmText: 'Sim',
          cancelText: 'Não',
        },
      }
    );

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.handleCloseDrawer();
      }
    });
  }
}
