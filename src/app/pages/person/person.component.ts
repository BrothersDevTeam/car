import { ToastrService } from 'ngx-toastr';

import {
  inject,
  OnInit,
  signal,
  Component,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { catchError, debounceTime, of, Subject, Subscription } from 'rxjs';
import { RelationshipTypes } from '../../enums/relationshipTypes';
import { Authorizations } from '../../enums/authorizations';

import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelect, MatSelectModule } from '@angular/material/select';
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
import { EmptyStateComponent } from '@components/empty-state/empty-state.component';

import { LegalEntityFormComponent } from '@forms/client/legal-entity-form/legal-entity-form.component';
import { NaturalPersonFormComponent } from '@forms/client/natural-person-form/natural-person-form.component';

import { LegalEntityInfoComponent } from '@info/legal-entity-info/legal-entity-info.component';
import { NaturalPersonInfoComponent } from '@info/natural-person-info/natural-person-info.component';

import type { Person } from '@interfaces/person';
import type { PaginationResponse } from '@interfaces/pagination';
import type { ColumnConfig } from '@interfaces/genericTable';
import type { Store } from '@interfaces/store';

import { PersonService } from '@services/person.service';
import { ActionsService } from '@services/actions.service';
import { AuthService } from '@services/auth/auth.service';
import { FormDraftService, FormDraft } from '@services/form-draft.service';
import { StoreContextService } from '@services/store-context.service';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Tipo literal para representar os tipos principais de relacionamento
 * Usado em conjunto com mat-radio-group para seleção exclusiva
 */
type MainRelationshipType = 'CLIENTE' | 'FUNCIONARIO' | null;

/**
 * Sub-filtros para quando FUNCIONÁRIO está selecionado.
 * Filtra por types reais da API: VENDEDOR ou GERENTE.
 */
interface EmployeeSubFilters {
  vendedor: boolean;
  gerente: boolean;
}

@Component({
  selector: 'app-person',
  imports: [
    CommonModule,
    FormsModule,
    ContentHeaderComponent,
    DrawerComponent,
    MatTabsModule,
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
    MatIconModule,
    MatTooltipModule,
    MatButtonToggleModule,
    EmptyStateComponent,
  ],
  templateUrl: './person.component.html',
  styleUrl: './person.component.scss',
})
export class PersonComponent implements OnInit, OnDestroy {
  readonly dialog = inject(MatDialog);
  private subscriptions: Subscription[] = [];
  private searchSubject = new Subject<string>();
  private formDraftService = inject(FormDraftService);
  private storeContextService = inject(StoreContextService);
  private route = inject(ActivatedRoute);

  personPaginatedList: PaginationResponse<Person> | null = null;
  selectedPerson: Person | null = null;
  selectedDraft: FormDraft | null | undefined = undefined;
  availableDrafts: FormDraft[] = [];
  searchValue: string = '';
  searchType: 'name' | 'cpf' | 'cnpj' | 'email' | 'all' = 'all';
  selectedStoreId: string | null = null;
  isCarAdmin: boolean = false;
  selectedPeople: Person[] = []; // Stores selected rows
  pendingAddressDraftId: string | null = null;

  // Configurações dinâmicas para o Empty State baseadas no tipo de relacionamento
  private readonly emptyStateConfigs: Record<
    string,
    { icon: string; title: string; description: string }
  > = {
    null: {
      icon: 'person_off',
      title: 'Nenhuma pessoa encontrada',
      description:
        'Cadastre novos clientes ou funcionários para começar a gerenciar sua rede.',
    },
    CLIENTE: {
      icon: 'person',
      title: 'Nenhum cliente cadastrado',
      description:
        'Sua lista de clientes aparecerá aqui. Adicione um novo cliente para começar.',
    },
    FUNCIONARIO: {
      icon: 'badge',
      title: 'Nenhum funcionário encontrado',
      description:
        'Parece que não há colaboradores registrados com este filtro.',
    },
  };

  get emptyStateIcon(): string {
    const key = this.selectedRelationshipType
      ? this.selectedRelationshipType.toString()
      : 'null';
    return this.emptyStateConfigs[key]?.icon || 'person_off';
  }

  get emptyStateTitle(): string {
    const key = this.selectedRelationshipType
      ? this.selectedRelationshipType.toString()
      : 'null';
    return this.emptyStateConfigs[key]?.title || 'Nenhuma pessoa encontrada';
  }

  get emptyStateDescription(): string {
    const key = this.selectedRelationshipType
      ? this.selectedRelationshipType.toString()
      : 'null';
    return (
      this.emptyStateConfigs[key]?.description ||
      'Cadastre pessoas para gerenciar sua rede.'
    );
  }

  /**
   * Tipo de relacionamento principal selecionado (CLIENTE ou FUNCIONARIO)
   * null = nenhum filtro aplicado
   * Usando mat-radio-button, apenas UMA opção pode estar selecionada por vez
   */
  selectedRelationshipType: MainRelationshipType = null;

  /**
   * Sub-filtros de funcionário: VENDEDOR e GERENTE
   */
  employeeSubFilters: EmployeeSubFilters = {
    vendedor: false,
    gerente: false,
  };

  paginationRequestConfig = {
    pageSize: 1000,
    pageIndex: 0,
  };
  columns: ColumnConfig<Person>[] = [
    {
      key: 'select',
      header: '',
      showCheckbox: (row: Person) => {
        const loggedUserRelationship = this.authService.getPersonRelationship();

        // Proprietário não pode excluir outro proprietário (e consequentemente ele mesmo)
        if (
          loggedUserRelationship === RelationshipTypes.PROPRIETARIO &&
          row.relationship === RelationshipTypes.PROPRIETARIO
        ) {
          return false;
        }

        // Gerente não pode excluir outro gerente nem proprietário
        if (
          loggedUserRelationship === RelationshipTypes.GERENTE &&
          (row.relationship === RelationshipTypes.GERENTE ||
            row.relationship === RelationshipTypes.PROPRIETARIO)
        ) {
          return false;
        }

        return true;
      },
    },
    {
      key: 'name',
      header: 'Nome',
      format: (value: any, row: Person) => {
        return row.name;
      },
    },
    {
      key: 'relationship',
      header: 'Vínculo',
      format: (value: any, row: any) => {
        const relationship = row.relationship as RelationshipTypes;

        // Mapeia diretamente o campo relationship para um label human-readable
        const labels: Partial<Record<RelationshipTypes, string>> = {
          [RelationshipTypes.PROPRIETARIO]: 'Proprietário',
          [RelationshipTypes.GERENTE]: 'Gerente',
          [RelationshipTypes.VENDEDOR]: 'Vendedor',
          [RelationshipTypes.CLIENTE]: 'Cliente',
        };

        return labels[relationship] ?? '-';
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
      showEditIcon: () =>
        // Exibe o botão de edição apenas para quem tem autorização granular de editar pessoas
        this.authService.hasAuthority(Authorizations.EDIT_PERSON),
    },
    {
      key: 'delete',
      header: '',
      showDeleteIcon: (row: Person) => {
        // Exibe o botão de exclusão apenas para quem tem autorização granular de excluir pessoas
        if (!this.authService.hasAuthority(Authorizations.DELETE_PERSON)) {
          return false;
        }

        const loggedUserRelationship = this.authService.getPersonRelationship();

        // Proprietário não pode excluir outro proprietário (e consequentemente ele mesmo)
        if (
          loggedUserRelationship === RelationshipTypes.PROPRIETARIO &&
          row.relationship === RelationshipTypes.PROPRIETARIO
        ) {
          return false;
        }

        // Gerente não pode excluir outro gerente nem proprietário
        if (
          loggedUserRelationship === RelationshipTypes.GERENTE &&
          (row.relationship === RelationshipTypes.GERENTE ||
            row.relationship === RelationshipTypes.PROPRIETARIO)
        ) {
          return false;
        }

        return true;
      },
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
  @ViewChild(NaturalPersonInfoComponent)
  naturalPersonInfo?: NaturalPersonInfoComponent;
  @ViewChild(LegalEntityInfoComponent)
  legalEntityInfo?: LegalEntityInfoComponent;

  constructor(
    private personService: PersonService,
    private toastr: ToastrService,
    private actionsService: ActionsService,
    private authService: AuthService
  ) {
    // Verifica se o usuário é CAR_ADMIN
    this.checkUserRole();

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

    // Carrega rascunhos iniciais e se inscreve para mudanças
    this.loadDrafts();
    this.subscriptions.push(
      this.formDraftService.draftsChanges.subscribe(() => {
        this.loadDrafts();
      })
    );

    // Contexto Global de Loja
    this.subscriptions.push(
      this.storeContextService.currentStoreId$.subscribe((storeId) => {
        this.selectedStoreId = storeId;
        this.personService.clearCache(); // Limpa cache para garantir dados da nova loja/rede
        this.performSearch(); // Executa a busca baseada na nova loja global selecionada
      })
    );

    // Verifica se há um ID de edição vindo da rota (ex: redirecionamento de erro de endereço)
    this.subscriptions.push(
      this.route.queryParams.subscribe((params) => {
        const editId = params['editId'];
        if (editId) {
          this.loadPersonForEdit(editId);
        }
      })
    );
  }

  /**
   * Busca os dados de uma pessoa pelo ID e abre o formulário de edição
   */
  private loadPersonForEdit(personId: string) {
    this.clientListLoading.set(true);
    this.personService.getById(personId).subscribe({
      next: (person) => {
        this.clientListLoading.set(false);
        this.handleSelectedPerson(person); // Abre a visualização de Detalhes (Info)
      },
      error: (err) => {
        this.clientListLoading.set(false);
        this.toastr.error('Não foi possível carregar os dados para edição');
        console.error('Erro ao carregar pessoa por ID (URL):', err);
      },
    });
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

  // Verifica se o usuário é root:admin (CAR_ADMIN)
  private checkUserRole() {
    this.isCarAdmin = this.authService.hasAuthority(Authorizations.ROOT_ADMIN);
  }

  handleFormChanged(isDirty: boolean) {
    this.actionsService.hasFormChanges.set(isDirty);
  }

  handleSelection(selected: Person[]) {
    this.selectedPeople = selected;
    console.log('Selected people:', this.selectedPeople);
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
    const isNew = !this.selectedPerson?.personId && !this.selectedDraft;

    // Obtém o nome sugerido do formulário se possível
    let suggestedDraftName = '';
    if (formComponent && (formComponent as any).form) {
      const formValue = (formComponent as any).form.value;
      suggestedDraftName = formValue.name || '';
    }

    // Abre o diálogo inteligente com as opções apropriadas
    const dialogRef = this.dialog.open(UnsavedChangesDialogComponent, {
      width: '450px',
      disableClose: true,
      data: {
        canSave,
        message: canSave
          ? 'Deseja salvar as alterações antes de sair?'
          : 'Há campos obrigatórios não preenchidos. Deseja salvar um rascunho para continuar depois?',
        currentDraftName: this.selectedDraft?.draftName,
        suggestedDraftName, // Passa o nome sugerido
      },
    });

    dialogRef.afterClosed().subscribe((result: string | undefined) => {
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
        (formComponent as any).saveForm(false).subscribe((success: boolean) => {
          if (success) {
            this.onFormSubmitted();
          }
        });
        return;
      }

      // Se escolheu salvar rascunho (result começa com 'draft:')
      if (result.startsWith('draft:')) {
        const draftName = result.substring(6); // Remove 'draft:'
        // Passa o ID do rascunho existente para garantir atualização
        const existingDraftId = this.selectedDraft?.id;

        (formComponent as any).saveLocalDraft(
          false,
          draftName,
          existingDraftId
        );
        this.handleCloseDrawer();
        return;
      }
    });
  }

  handleCloseDrawer() {
    this.openForm.set(false);
    this.openInfo.set(false);
    this.selectedPerson = null;
    this.selectedDraft = null;
    this.pendingAddressDraftId = null;
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

    // Adiciona o filtro de loja (se for null, o backend cuida da rede)
    if (!searchParams) {
      searchParams = {};
    }
    searchParams.storeId = this.selectedStoreId ?? undefined;

    // Adiciona o filtro de relationship se houver filtros ativos
    const relationshipFilter = this.buildRelationshipTypesFilter();
    if (relationshipFilter.length > 0) {
      if (!searchParams) {
        searchParams = {};
      }
      (searchParams as any)['relationshipTypes'] = relationshipFilter;
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
    this.selectedPerson = null;
    this.selectedDraft = null;
    this.openForm.set(true);
  }

  @ViewChild('draftSelect') draftSelect?: MatSelect;

  handleDraftSelection(draft: FormDraft) {
    if (draft.formType === 'endereco') {
      console.log('PersonComponent: Address draft selected', draft);
      const data = draft.data as any;
      if (data.personId) {
        this.clientListLoading.set(true);
        this.personService.getById(data.personId).subscribe({
          next: (person) => {
            console.log('PersonComponent: Person loaded', person);
            this.clientListLoading.set(false);
            this.pendingAddressDraftId = draft.id;
            console.log(
              'PersonComponent: pendingAddressDraftId set to',
              this.pendingAddressDraftId
            );
            this.handleSelectedPerson(person);

            // Explicitly reset the dropdown
            setTimeout(() => {
              if (this.draftSelect) this.draftSelect.value = null;
              this.selectedDraft = null;
            });
          },
          error: (err) => {
            this.clientListLoading.set(false);
            this.toastr.error('Erro ao carregar pessoa do rascunho');
            console.error(err);
            setTimeout(() => {
              if (this.draftSelect) this.draftSelect.value = null;
              this.selectedDraft = null;
            });
          },
        });
      } else {
        setTimeout(() => {
          if (this.draftSelect) this.draftSelect.value = null;
          this.selectedDraft = null;
        });
      }
      return;
    }

    this.selectedPerson = null;
    this.selectedDraft = draft;
    this.openForm.set(true);

    // For Person drafts, wait for child component to sync before resetting
    setTimeout(() => {
      if (this.draftSelect) this.draftSelect.value = null;
      // We don't reset 'selectedDraft' here because it might be bound to the form
      // (though the form should ideally clone it).
      // However, resetting the ViewChild value visually clears the dropdown.
    }, 500);
  }

  private loadDrafts() {
    const pfDrafts = this.formDraftService.getDraftsByType('pessoa-fisica');
    const pjDrafts = this.formDraftService.getDraftsByType('pessoa-juridica');
    const addressDrafts = this.formDraftService.getDraftsByType('endereco');

    this.availableDrafts = [...pfDrafts, ...pjDrafts, ...addressDrafts]
      .filter((d) => !d.entityId || d.entityId.toString().startsWith('new_'))
      .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
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

  deleteSelectedPeople() {
    if (this.selectedPeople.length === 0) return;

    const dialogRef: MatDialogRef<ConfirmDialogComponent> = this.dialog.open(
      ConfirmDialogComponent,
      {
        data: {
          title: 'Excluir Selecionados',
          message: `Tem certeza que deseja <strong>excluir ${this.selectedPeople.length}</strong> pessoas selecionadas?`,
          confirmText: 'Sim, excluir',
          cancelText: 'Cancelar',
        },
      }
    );

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const ids = this.selectedPeople
          .map((p) => p.personId)
          .filter((id): id is string => id !== undefined);

        if (ids.length === 0) {
          this.toastr.error('Nenhum ID válido selecionado.');
          return;
        }

        this.personService.deleteMany(ids).subscribe({
          next: () => {
            this.toastr.success(`${ids.length} pessoas excluídas com sucesso`);
            this.selectedPeople = []; // Limpa seleção
            this.onFormSubmitted();
          },
          error: (error) => {
            console.error('Erro ao excluir pessoas:', error);
            this.toastr.error('Erro ao excluir itens selecionados');
          },
        });
      }
    });
  }

  onFormSubmitted() {
    this.loadPersonList(
      this.paginationRequestConfig.pageIndex,
      this.paginationRequestConfig.pageSize
    );
    this.openForm.set(false);
    this.openInfo.set(false);
    this.selectedPerson = null;
    this.selectedDraft = undefined; // Force placeholder
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

    // Se não é FUNCIONARIO, limpa os sub-filtros de employee
    if (newType !== 'FUNCIONARIO') {
      this.employeeSubFilters = {
        vendedor: false,
        gerente: false,
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
      this.employeeSubFilters.gerente
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
    };
    this.onFilterChange();
  }

  /**
   * Constrói o array de relationship baseado no tipo selecionado.
   * Para FUNCIONARIO, expande em GERENTE e VENDEDOR (os tipos reais da API).
   */
  private buildRelationshipTypesFilter(): string[] {
    if (!this.selectedRelationshipType) return [];

    // Para funcionario, filtra pelos sub-filtros marcados ou expande para ambos
    if (this.selectedRelationshipType === 'FUNCIONARIO') {
      const types: string[] = [];
      if (this.employeeSubFilters.vendedor) types.push('VENDEDOR');
      if (this.employeeSubFilters.gerente) types.push('GERENTE');
      // Se nenhum sub-filtro, retorna ambos os tipos de funcionários
      return types.length > 0 ? types : ['GERENTE', 'VENDEDOR'];
    }

    return [this.selectedRelationshipType];
  }

  /**
   * Remove um rascunho da lista
   * @param draft Rascunho a ser removido
   * @param event Evento de clique (para parar propagação)
   */
  removeDraft(draft: FormDraft, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Excluir Rascunho',
        message: `Tem certeza que deseja excluir o rascunho <strong>"${draft.draftName}"</strong>?`,
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.formDraftService.removeDraftById(draft.id);
        this.toastr.info('Rascunho excluído com sucesso');
      }
    });
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
  /**
   * Obtém a referência do componente de formulário ativo
   * Verifica qual formulário está visível (Pessoa Física, Jurídica ou Endereço em Info)
   */
  private getActiveFormComponent(): any {
    // Se o formulário principal está aberto
    if (this.openForm()) {
      if (this.selectedPerson?.legalEntity) {
        return this.legalEntityForm || null;
      }
      return this.naturalPersonForm || null;
    }

    // Se a tela de info está aberta (possível edição de endereço)
    if (this.openInfo()) {
      if (this.selectedPerson?.legalEntity) {
        return this.legalEntityInfo?.getActiveFormComponent();
      }
      return this.naturalPersonInfo?.getActiveFormComponent();
    }

    return null;
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
