import {
  Component,
  forwardRef,
  Input,
  HostListener,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RelationshipTypes } from '../../enums/relationshipTypes';
import { AuthService } from '@services/auth/auth.service';

/**
 * Interface para opções do select
 * Define a estrutura de cada opção que pode ser exibida no dropdown
 */
export interface SelectOption {
  value: any;
  label: string;
}

/**
 * Componente de Select Reutilizável com Navegação por Teclado
 * 
 * @description
 * Componente standalone que implementa ControlValueAccessor para integração
 * com Angular Reactive Forms. Oferece seleção única ou múltipla com suporte
 * completo à navegação por teclado (setas e espaço).
 * 
 * @features
 * - ✅ Seleção única ou múltipla
 * - ✅ Navegação por setas do teclado (↑↓)
 * - ✅ Seleção/desseleção com ESPAÇO
 * - ✅ Fechamento com ESC
 * - ✅ Integração com Reactive Forms
 * - ✅ Acessibilidade completa (ARIA)
 * 
 * @example
 * // Select simples (único)
 * <app-primary-select
 *   formControlName="estado"
 *   label="Estado"
 *   [options]="[{value: 'RJ', label: 'Rio de Janeiro'}]"
 * />
 * 
 * // Select múltiplo (checkboxes)
 * <app-primary-select
 *   formControlName="tipos"
 *   label="Tipo"
 *   [allowMultiple]="true"
 *   [options]="opcoesTipos"
 * />
 * 
 * @author Sistema CAR
 * @version 3.0 - Implementação de navegação por teclado
 */
@Component({
  selector: 'app-primary-select',
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PrimarySelectComponent),
      multi: true,
    },
  ],
  templateUrl: './primary-select.component.html',
  styleUrl: './primary-select.component.scss',
})
export class PrimarySelectComponent implements ControlValueAccessor, OnInit, OnChanges {
  /**
   * Texto exibido quando nenhuma opção está selecionada
   */
  @Input() placeholder: string = 'Selecione uma opção';
  
  /**
   * Label do campo de select
   */
  @Input() label: string = '';
  
  /**
   * Nome/ID único do select para acessibilidade
   */
  @Input() inputName: string = '';
  
  /**
   * Indica se o campo está em estado de erro
   */
  @Input() error?: boolean = false;
  
  /**
   * Permite seleção múltipla (checkboxes)
   * @default false - Seleção única
   */
  @Input() allowMultiple: boolean = false;
  
  /**
   * Array de opções disponíveis para seleção
   */
  @Input() options: any[] = [];
  
  /**
   * Nome da propriedade que contém o valor da opção
   * @default 'value'
   */
  @Input() optionValue: string = 'value';
  
  /**
   * Nome da propriedade que contém o label ou função para gerar label
   * @default 'label'
   */
  @Input() optionLabel: string | ((item: any) => string) = 'label';

  /**
   * Valor(es) selecionado(s) atualmente
   * Pode ser um único valor ou array dependendo de allowMultiple
   */
  value: any = null;
  
  /**
   * Controla se o dropdown está aberto
   */
  isOpen: boolean = false;
  
  /**
   * Índice da opção atualmente focada pela navegação por teclado
   * -1 indica que nenhuma opção está focada
   */
  focusedOptionIndex: number = -1;
  
  /**
   * Callback registrado pelo Angular Forms para mudanças de valor
   */
  onChange: any = () => {};
  
  /**
   * Callback registrado pelo Angular Forms quando o campo é tocado
   */
  onTouched: any = () => {};

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.loadOptions();
  }

  ngOnChanges(changes: SimpleChanges) {
    /**
     * Recarrega as opções quando houver mudanças nos inputs
     * Isso garante que opções dinâmicas sejam atualizadas corretamente
     */
    if (changes['options'] || changes['inputName']) {
      this.loadOptions();
    }

    /**
     * IMPORTANTE: Quando as opções mudam, pode ser necessário
     * re-sincronizar o valor atual com as novas opções.
     * Isso corrige o problema de valores não aparecerem ao editar.
     */
    if (changes['options'] && this.value) {
      // Força a atualização do display quando opções mudam
      // mas mantém o valor interno
      setTimeout(() => {
        // Trigger da detecção de mudanças
        this.onChange(this.value);
      }, 0);
    }
  }

  /**
   * Carrega as opções do select
   * 
   * @description
   * Se não houver opções fornecidas E o campo for 'relationshipTypes',
   * carrega automaticamente as opções do enum RelationshipTypes.
   * 
   * IMPORTANTE: Após carregar as opções, re-sincroniza o valor atual
   * para garantir que valores pré-existentes sejam exibidos corretamente.
   */
  private loadOptions() {
    const hadOptions = this.options.length > 0;
    
    if (this.options.length === 0 && this.inputName === 'relationshipTypes') {
      this.options = this.getRelationshipTypeOptions();
      console.log('[primary-select] Opções carregadas do enum:', this.options);
    }

    /**
     * Se não tinha opções antes e agora tem, E já existe um valor,
     * força a atualização visual
     */
    if (!hadOptions && this.options.length > 0 && this.value) {
      console.log('[primary-select] Re-sincronizando valor após carregar opções:', this.value);
      setTimeout(() => {
        // Não chama onChange para evitar emitir evento desnecessário
        // Apenas força a detecção de mudanças visuais
      }, 0);
    }
  }

  /**
   * Obtém as opções de tipos de relacionamento filtradas por permissão
   * 
   * @returns Array de opções de relacionamento
   * 
   * @description
   * Filtra as opções baseado nas permissões do usuário logado.
   * PROPRIETARIO só aparece para usuários com role CAR_ADMIN.
   * 
   * @security
   * A filtragem aqui é apenas para UX. O backend DEVE validar
   * as permissões adequadamente ao salvar.
   */
  private getRelationshipTypeOptions(): SelectOption[] {
    const userRoles = this.authService.getRoles();
    const isCarAdmin = userRoles.includes('CAR_ADMIN');

    return Object.values(RelationshipTypes)
      .filter((value) => {
        // Esconde PROPRIETARIO de usuários não-admin
        if (value === RelationshipTypes.PROPRIETARIO && !isCarAdmin) {
          return false;
        }
        return true;
      })
      .map((value) => ({
        value: value,
        label: value,
      }));
  }

  /**
   * Alterna entre abrir e fechar o dropdown
   * 
   * @description
   * Quando abre o dropdown:
   * - Reseta o índice de foco para -1
   * - Marca o campo como tocado
   */
  toggleDropdown() {
    this.isOpen = !this.isOpen;
    
    if (this.isOpen) {
      // Reseta o foco ao abrir
      this.focusedOptionIndex = -1;
      this.onTouched();
    }
  }

  /**
   * Seleciona uma única opção (modo single select)
   * 
   * @param option - Opção a ser selecionada
   * 
   * @description
   * Extrai o valor correto da opção, atualiza o valor interno,
   * notifica o FormControl e fecha o dropdown.
   */
  selectSingleOption(option: any) {
    const optionVal = this.getOptionValue(option);
    this.value = optionVal;
    this.onChange(this.value);
    this.isOpen = false;
    this.focusedOptionIndex = -1;
  }

  /**
   * Alterna seleção de uma opção (modo multiple select)
   * 
   * @param option - Opção a ser alternada
   * 
   * @description
   * Se allowMultiple for false, delega para selectSingleOption.
   * Caso contrário, adiciona ou remove a opção do array de valores.
   * 
   * @example
   * // Se value = ['CLIENTE', 'FORNECEDOR']
   * // Ao clicar em 'VENDEDOR':
   * // value = ['CLIENTE', 'FORNECEDOR', 'VENDEDOR']
   */
  toggleOption(option: any) {
    if (!this.allowMultiple) {
      this.selectSingleOption(option);
      return;
    }

    // Garante que value é um array
    if (!Array.isArray(this.value)) {
      this.value = [];
    }

    const optionVal = this.getOptionValue(option);
    const index = this.value.indexOf(optionVal);
    
    if (index > -1) {
      // Remove se já estava selecionado
      this.value = this.value.filter((v: any) => v !== optionVal);
    } else {
      // Adiciona se não estava selecionado
      this.value = [...this.value, optionVal];
    }

    this.onChange(this.value);
  }

  /**
   * Verifica se uma opção está selecionada
   * 
   * @param option - Opção a ser verificada
   * @returns true se a opção está selecionada
   */
  isSelected(option: any): boolean {
    const optionVal = this.getOptionValue(option);
    
    if (this.allowMultiple && Array.isArray(this.value)) {
      return this.value.includes(optionVal);
    }
    return this.value === optionVal;
  }

  /**
   * Verifica se uma opção está com foco do teclado
   * 
   * @param index - Índice da opção
   * @returns true se a opção está focada
   */
  isFocused(index: number): boolean {
    return this.focusedOptionIndex === index;
  }

  /**
   * Retorna o texto a ser exibido no campo de input
   * 
   * @returns String formatada com o(s) valor(es) selecionado(s)
   * 
   * @description
   * - Para múltiplos: mostra "N itens selecionados" ou o nome do único item
   * - Para único: mostra o label da opção selecionada
   */
  getDisplayValue(): string {
    if (!this.value) {
      return '';
    }

    if (this.allowMultiple && Array.isArray(this.value)) {
      if (this.value.length === 0) {
        return '';
      }

      const selectedLabels = this.value.map((val: any) => {
        const option = this.options.find(
          (opt) => this.getOptionValue(opt) === val
        );
        return option ? this.getOptionLabel(option) : val;
      });

      const display = selectedLabels.length > 1
        ? `${selectedLabels.length} itens selecionados`
        : selectedLabels[0];

      // Log apenas quando há valor mas campo pode estar vazio
      if (!display || display === '') {
        console.warn(`[primary-select ${this.inputName}] getDisplayValue retornando vazio!`, {
          value: this.value,
          optionsLength: this.options.length,
          selectedLabels
        });
      }

      return display;
    }

    const option = this.options.find(
      (opt) => this.getOptionValue(opt) === this.value
    );
    
    const display = option ? this.getOptionLabel(option) : this.value;

    // Log quando não encontra a opção
    if (!option && this.value) {
      console.warn(`[primary-select ${this.inputName}] Opção não encontrada para valor:`, {
        value: this.value,
        options: this.options,
        display
      });
    }

    return display;
  }

  /**
   * Extrai o valor de uma opção
   * 
   * @param option - Opção da qual extrair o valor
   * @returns Valor da opção
   * 
   * @private
   */
  private getOptionValue(option: any): any {
    if (typeof option === 'object' && this.optionValue) {
      return option[this.optionValue];
    }
    return option.value !== undefined ? option.value : option;
  }

  /**
   * Extrai o label de uma opção
   * 
   * @param option - Opção da qual extrair o label
   * @returns Label formatado da opção
   */
  getOptionLabel(option: any): string {
    if (typeof this.optionLabel === 'function') {
      return this.optionLabel(option);
    }
    
    if (typeof option === 'object' && typeof this.optionLabel === 'string') {
      return option[this.optionLabel] || option.label || String(option);
    }
    
    return option.label !== undefined ? option.label : String(option);
  }

  /**
   * NAVEGAÇÃO POR TECLADO - Handler principal
   * 
   * @param event - Evento de teclado
   * 
   * @description
   * Implementa a navegação completa por teclado:
   * - SETA PARA BAIXO (↓): Move o foco para a próxima opção
   * - SETA PARA CIMA (↑): Move o foco para a opção anterior
   * - ESPAÇO: Seleciona/desseleciona a opção focada
   * - ENTER: Seleciona a opção (apenas single select) e fecha
   * - ESCAPE: Fecha o dropdown
   * - HOME: Vai para a primeira opção
   * - END: Vai para a última opção
   * 
   * @accessibility
   * Esta implementação segue as diretrizes WCAG 2.1 para componentes de select
   * customizados, garantindo navegação completa por teclado.
   */
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Só processa eventos de teclado se o dropdown estiver aberto
    if (!this.isOpen) {
      // Permite abrir com Enter ou Espaço
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.toggleDropdown();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        // SETA PARA BAIXO: Move para a próxima opção
        event.preventDefault();
        event.stopPropagation();
        this.focusNextOption();
        break;

      case 'ArrowUp':
        // SETA PARA CIMA: Move para a opção anterior
        event.preventDefault();
        event.stopPropagation();
        this.focusPreviousOption();
        break;

      case ' ':
      case 'Spacebar': // Para navegadores mais antigos
        // ESPAÇO: Seleciona/desseleciona a opção focada
        event.preventDefault();
        event.stopPropagation();
        if (this.focusedOptionIndex >= 0 && this.focusedOptionIndex < this.options.length) {
          const focusedOption = this.options[this.focusedOptionIndex];
          this.toggleOption(focusedOption);
        }
        break;

      case 'Enter':
        // ENTER: Seleciona (e fecha se single select)
        event.preventDefault();
        event.stopPropagation();
        if (this.focusedOptionIndex >= 0 && this.focusedOptionIndex < this.options.length) {
          const focusedOption = this.options[this.focusedOptionIndex];
          if (this.allowMultiple) {
            this.toggleOption(focusedOption);
          } else {
            this.selectSingleOption(focusedOption);
          }
        }
        break;

      case 'Escape':
      case 'Esc': // Para navegadores mais antigos
        // ESC: Fecha o dropdown
        // IMPORTANTE: stopPropagation previne que o ESC feche o drawer/dialog pai
        event.preventDefault();
        event.stopPropagation();
        this.isOpen = false;
        this.focusedOptionIndex = -1;
        break;

      case 'Home':
        // HOME: Vai para a primeira opção
        event.preventDefault();
        event.stopPropagation();
        this.focusedOptionIndex = 0;
        break;

      case 'End':
        // END: Vai para a última opção
        event.preventDefault();
        event.stopPropagation();
        this.focusedOptionIndex = this.options.length - 1;
        break;

      case 'Tab':
        // TAB: Fecha o dropdown e permite navegação normal
        this.isOpen = false;
        this.focusedOptionIndex = -1;
        // Não previne default para permitir mudança de foco
        break;

      default:
        // Para outras teclas, não faz nada
        break;
    }
  }

  /**
   * Move o foco para a próxima opção
   * 
   * @description
   * Se nenhuma opção está focada (-1), foca a primeira.
   * Caso contrário, move para a próxima, com wrap-around
   * (volta para o início ao chegar no final).
   * 
   * @private
   */
  private focusNextOption(): void {
    if (this.options.length === 0) return;

    if (this.focusedOptionIndex < 0) {
      // Nenhuma opção focada, foca a primeira
      this.focusedOptionIndex = 0;
    } else if (this.focusedOptionIndex < this.options.length - 1) {
      // Move para a próxima
      this.focusedOptionIndex++;
    } else {
      // Está na última, volta para a primeira (wrap-around)
      this.focusedOptionIndex = 0;
    }

    this.scrollToFocusedOption();
  }

  /**
   * Move o foco para a opção anterior
   * 
   * @description
   * Se nenhuma opção está focada (-1), foca a última.
   * Caso contrário, move para a anterior, com wrap-around
   * (vai para o final ao chegar no início).
   * 
   * @private
   */
  private focusPreviousOption(): void {
    if (this.options.length === 0) return;

    if (this.focusedOptionIndex < 0) {
      // Nenhuma opção focada, foca a última
      this.focusedOptionIndex = this.options.length - 1;
    } else if (this.focusedOptionIndex > 0) {
      // Move para a anterior
      this.focusedOptionIndex--;
    } else {
      // Está na primeira, vai para a última (wrap-around)
      this.focusedOptionIndex = this.options.length - 1;
    }

    this.scrollToFocusedOption();
  }

  /**
   * Garante que a opção focada está visível no scroll
   * 
   * @description
   * Usa scrollIntoView para garantir que a opção focada
   * pelo teclado sempre esteja visível, mesmo em listas longas.
   * 
   * @private
   */
  private scrollToFocusedOption(): void {
    // Aguarda o próximo ciclo de detecção para garantir que o DOM foi atualizado
    setTimeout(() => {
      const focusedElement = document.querySelector('.option-item.keyboard-focused');
      if (focusedElement) {
        focusedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }, 0);
  }

  /**
   * Fecha o dropdown ao clicar fora dele
   * 
   * @param event - Evento de clique no documento
   * 
   * @description
   * Detecta cliques fora do componente e fecha o dropdown.
   * Também reseta o índice de foco.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.input-wrapper')) {
      this.isOpen = false;
      this.focusedOptionIndex = -1;
    }
  }

  /**
   * ControlValueAccessor: Escreve valor no componente
   * 
   * @param value - Valor a ser escrito (vindo do FormControl)
   * 
   * @description
   * Este método é chamado pelo Angular Forms quando:
   * - O formulário é inicializado com valores
   * - setValue() ou patchValue() é chamado no FormControl
   * - reset() é chamado no formulário
   * 
   * IMPORTANTE: O valor pode chegar ANTES das opções estarem carregadas,
   * especialmente quando usando enums ou dados assíncronos.
   */
  writeValue(value: any): void {
    console.log(`[primary-select ${this.inputName}] writeValue chamado:`, {
      value,
      allowMultiple: this.allowMultiple,
      optionsLength: this.options.length
    });

    if (this.allowMultiple) {
      this.value = Array.isArray(value) ? value : [];
    } else {
      this.value = value;
    }

    console.log(`[primary-select ${this.inputName}] Valor interno setado:`, this.value);

    /**
     * Se as opções ainda não foram carregadas, agenda múltiplas tentativas
     * Isso resolve o problema de valores não aparecerem ao editar
     */
    if (this.value && this.options.length === 0) {
      console.log(`[primary-select ${this.inputName}] Opções ainda não carregadas, aguardando...`);
      
      // Tentativa 1: 50ms
      setTimeout(() => {
        if (this.options.length > 0) {
          console.log(`[primary-select ${this.inputName}] Opções carregadas (50ms), exibindo valor:`, this.value);
        }
      }, 50);

      // Tentativa 2: 150ms
      setTimeout(() => {
        if (this.options.length > 0) {
          console.log(`[primary-select ${this.inputName}] Opções carregadas (150ms), exibindo valor:`, this.value);
        }
      }, 150);

      // Tentativa 3: 300ms (final)
      setTimeout(() => {
        if (this.options.length > 0) {
          console.log(`[primary-select ${this.inputName}] Opções carregadas (300ms), exibindo valor:`, this.value);
        } else {
          console.warn(`[primary-select ${this.inputName}] Opções ainda não carregadas após 300ms!`);
        }
      }, 300);
    } else if (this.value && this.options.length > 0) {
      console.log(`[primary-select ${this.inputName}] Opções já disponíveis, exibindo valor imediatamente:`, this.value);
    }
  }

  /**
   * ControlValueAccessor: Registra callback de mudança
   */
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  /**
   * ControlValueAccessor: Registra callback de toque
   */
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  /**
   * ControlValueAccessor: Define estado de desabilitado
   */
  setDisabledState(isDisabled: boolean): void {
    // Implementar se necessário no futuro
  }
}
