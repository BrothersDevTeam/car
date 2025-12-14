import { NgxMaskDirective } from 'ngx-mask';
import { FormsModule } from '@angular/forms';
import {
  Component,
  forwardRef,
  Input,
  Output,
  EventEmitter,
  ChangeDetectorRef,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';

/**
 * Tipos de input permitidos pelo componente
 * Define os tipos HTML5 válidos para o elemento input
 */
type InputTypes = 'text' | 'email' | 'password' | 'number' | 'tel';

/**
 * Componente de Input Reutilizável com suporte a maiúsculas automáticas
 *
 * @description
 * Componente standalone que implementa ControlValueAccessor para integração
 * com Angular Reactive Forms. Oferece conversão automática para UPPERCASE,
 * máscaras de input, validação e integração completa com formulários reativos.
 *
 * @example
 * // Com uppercase (padrão)
 * <app-primary-input
 *   formControlName="nome"
 *   label="Nome"
 *   inputName="nome"
 *   type="text"
 * />
 *
 * // Sem uppercase (para campos de login/senha)
 * <app-primary-input
 *   formControlName="email"
 *   label="Email"
 *   [uppercase]="false"
 *   type="email"
 * />
 *
 * @author Sistema CAR
 * @version 2.0
 */
@Component({
  selector: 'app-primary-input',
  imports: [NgxMaskDirective, FormsModule, MatIcon],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PrimaryInputComponent),
      multi: true,
    },
  ],
  templateUrl: './primary-input.component.html',
  styleUrl: './primary-input.component.scss',
})
export class PrimaryInputComponent implements ControlValueAccessor {
  /**
   * Tipo do input HTML
   * @default 'text'
   */
  @Input() type: InputTypes = 'text';

  /**
   * Texto de placeholder exibido quando o campo está vazio
   */
  @Input() placeholder: string = '';

  /**
   * Label do campo de input
   */
  @Input() label: string = '';

  /**
   * Nome/ID único do input para acessibilidade
   */
  @Input() inputName: string = '';

  /**
   * Indica se o campo está em estado de erro
   * Usado para mostrar validações visuais
   */
  @Input() error?: boolean = false;

  /**
   * Máscara a ser aplicada no input (formato ngx-mask)
   * @example "000.000.000-00" para CPF
   * @example "(00) 00000-0000" para telefone
   */
  @Input() mask: string = '';

  /**
   * Define se o texto deve ser convertido automaticamente para UPPERCASE
   * @default true - Por padrão, todos os campos convertem para maiúsculas
   * @important Deve ser false para campos de login (email, senha, username)
   */
  @Input() uppercase?: boolean = true;

  /**
   * Comprimento máximo permitido para o input
   */
  @Input() maxlength?: string;

  /**
   * Define se o campo é obrigatório
   * Adiciona o atributo HTML 'required' quando true
   */
  @Input() required?: boolean = false;

  /**
   * Evento emitido quando o campo perde o foco
   * Útil para validações customizadas ou comportamentos específicos
   */
  @Output() blur = new EventEmitter<FocusEvent>();

  /**
   * Valor atual do campo
   * Sincronizado com o FormControl através do ControlValueAccessor
   */
  value: string = '';
  showPassword = false;

  /**
   * Função callback chamada quando o valor muda
   * Registrada pelo Angular Forms através do ControlValueAccessor
   */
  onChange: any = () => {};

  /**
   * Função callback chamada quando o campo é tocado
   * Registrada pelo Angular Forms através do ControlValueAccessor
   */
  onTouched: any = () => {};

  /**
   * Estado de desabilitado do campo
   * Controlado pelo FormControl através do ControlValueAccessor
   */
  disabled: boolean = false;

  constructor(private cdr: ChangeDetectorRef) {}

  /**
   * Manipula as mudanças no valor do input via ngModel
   *
   * @param value - Novo valor digitado pelo usuário
   *
   * @description
   * Este método é chamado automaticamente pelo two-way binding do ngModel.
   * Aplica a conversão para uppercase (se habilitada) e notifica o FormControl
   * sobre a mudança através do callback onChange.
   *
   * IMPORTANTE: Este método é a peça chave para a funcionalidade de uppercase.
   * Ele intercepta o valor ANTES de ser enviado ao FormControl, permitindo
   * a transformação para maiúsculas de forma transparente.
   *
   * @security
   * A conversão para uppercase é feita no frontend para melhorar UX,
   * mas o backend deve fazer validação e sanitização adequadas.
   */
  onModelChange(value: string): void {
    // Se uppercase está habilitado E o tipo não é password, converte para maiúsculas
    if (this.uppercase && this.type !== 'password') {
      value = value.toUpperCase();
      // Atualiza o valor interno do componente
      this.value = value;
    }

    // Notifica o FormControl sobre a mudança
    // Isso mantém o formulário reativo sincronizado
    this.onChange(value);
  }

  /**
   * Manipula o evento de blur (perda de foco) do input
   *
   * @param event - Evento de foco nativo do navegador
   *
   * @description
   * Marca o campo como "tocado" para o Angular Forms e emite
   * o evento blur para que componentes pai possam reagir.
   * Isso é importante para controle de validações que só
   * devem aparecer após o usuário interagir com o campo.
   */
  onBlur(event: FocusEvent): void {
    // Marca o campo como tocado no FormControl
    this.onTouched();
    // Emite evento para componentes pai
    this.blur.emit(event);
  }

  /**
   * ControlValueAccessor: Escreve valor no componente
   *
   * @param value - Valor a ser escrito (vindo do FormControl)
   *
   * @description
   * Método obrigatório da interface ControlValueAccessor.
   * É chamado pelo Angular quando o valor do FormControl muda
   * programaticamente (ex: setValue, patchValue, reset).
   *
   * @example
   * // Quando você faz:
   * this.form.patchValue({ nome: 'JOÃO' });
   * // Este método é chamado automaticamente
   */
  writeValue(value: any): void {
    this.value = value || '';
    this.cdr.detectChanges();
  }

  /**
   * ControlValueAccessor: Registra callback de mudança
   *
   * @param fn - Função callback a ser registrada
   *
   * @description
   * Método obrigatório da interface ControlValueAccessor.
   * Registra a função que deve ser chamada quando o valor
   * do componente muda. Essa função atualiza o FormControl.
   */
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  /**
   * ControlValueAccessor: Registra callback de toque
   *
   * @param fn - Função callback a ser registrada
   *
   * @description
   * Método obrigatório da interface ControlValueAccessor.
   * Registra a função que deve ser chamada quando o campo
   * é tocado (blur). Isso marca o campo como "touched" no FormControl.
   */
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  /**
   * ControlValueAccessor: Define estado de desabilitado
   *
   * @param isDisabled - true para desabilitar, false para habilitar
   *
   * @description
   * Método opcional da interface ControlValueAccessor.
   * Chamado quando o FormControl é desabilitado/habilitado
   * programaticamente (ex: control.disable(), control.enable()).
   *
   * @example
   * // Quando você faz:
   * this.form.get('nome')?.disable();
   * // Este método é chamado automaticamente
   */
  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}
