# 🎹 Navegação por Teclado - Primary Select Component

## 📋 Visão Geral

O componente `primary-select` agora possui **navegação completa por teclado**, permitindo que os usuários naveguem e selecionem opções usando apenas o teclado, sem necessidade do mouse.

## ⌨️ Atalhos de Teclado

### Quando o dropdown está **FECHADO**:

| Tecla | Ação |
|-------|------|
| `Enter` | Abre o dropdown |
| `Espaço` | Abre o dropdown |
| `Tab` | Navega para o próximo campo |

### Quando o dropdown está **ABERTO**:

| Tecla | Ação |
|-------|------|
| `↓` (Seta para baixo) | Move o foco para a próxima opção |
| `↑` (Seta para cima) | Move o foco para a opção anterior |
| `Espaço` | Marca/desmarca a opção focada (modo múltiplo) ou seleciona (modo único) |
| `Enter` | Seleciona a opção focada e fecha o dropdown (modo único) |
| `Esc` | Fecha o dropdown sem selecionar |
| `Home` | Vai para a primeira opção |
| `End` | Vai para a última opção |
| `Tab` | Fecha o dropdown e vai para o próximo campo |

## 🎨 Feedback Visual

### 1. **Indicador de Foco por Teclado**
Quando você navega com as setas, a opção focada mostra:
- ✅ Background destacado (azul claro)
- ✅ Borda esquerda azul (4px)
- ✅ Indicador visual "◄" piscando

### 2. **Indicador de Seleção**
Opções selecionadas têm:
- ✅ Background azul
- ✅ Texto branco
- ✅ Checkbox marcado (modo múltiplo)

### 3. **Combinação Foco + Seleção**
Quando uma opção está focada E selecionada:
- ✅ Background azul (selecionado)
- ✅ Borda branca (focado)
- ✅ Indicador "◄" branco

## 🔄 Comportamentos

### Modo Seleção Única (Single Select)
```html
<app-primary-select
  formControlName="estado"
  label="Estado"
  [options]="estadosOptions"
/>
```

**Comportamento:**
- `Espaço` ou `Enter` selecionam a opção e **fecham** o dropdown
- Apenas uma opção pode estar selecionada por vez
- Navegação circular (ao chegar no final, volta para o início)

### Modo Seleção Múltipla (Multiple Select)
```html
<app-primary-select
  formControlName="relationshipTypes"
  label="Tipo"
  [allowMultiple]="true"
  [options]="tiposOptions"
/>
```

**Comportamento:**
- `Espaço` marca/desmarca a opção focada **SEM fechar** o dropdown
- `Enter` também marca/desmarca (igual ao Espaço)
- Múltiplas opções podem estar selecionadas
- O dropdown permanece aberto até que o usuário pressione `Esc` ou `Tab`

## 🎯 Exemplo de Uso Completo

### HTML (Template)
```html
<form [formGroup]="form">
  <!-- Select Simples -->
  <app-primary-select
    formControlName="estado"
    label="Estado *"
    placeholder="Selecione um estado"
    [options]="[
      { value: 'RJ', label: 'Rio de Janeiro' },
      { value: 'SP', label: 'São Paulo' },
      { value: 'MG', label: 'Minas Gerais' }
    ]"
    [error]="form.get('estado')?.invalid && form.get('estado')?.touched"
  />

  <!-- Select Múltiplo -->
  <app-primary-select
    formControlName="relationshipTypes"
    label="Tipo de Relacionamento *"
    placeholder="Selecione um ou mais tipos"
    [allowMultiple]="true"
    [error]="form.get('relationshipTypes')?.invalid"
  />
</form>
```

### TypeScript (Component)
```typescript
export class MeuFormularioComponent implements OnInit {
  form!: FormGroup;

  ngOnInit() {
    this.form = this.fb.group({
      estado: ['', Validators.required],
      relationshipTypes: [[], Validators.required]
    });
  }
}
```

## ♿ Acessibilidade (WCAG 2.1)

O componente segue as diretrizes de acessibilidade:

### Atributos ARIA Implementados:
- ✅ `role="combobox"` - Identifica como combo box
- ✅ `role="listbox"` - Identifica a lista de opções
- ✅ `role="option"` - Identifica cada opção
- ✅ `aria-expanded` - Informa se está aberto/fechado
- ✅ `aria-haspopup="listbox"` - Indica que abre uma lista
- ✅ `aria-selected` - Marca opções selecionadas
- ✅ `aria-multiselectable` - Indica modo múltiplo
- ✅ `aria-label` - Labels para leitores de tela
- ✅ `tabindex` - Controle de navegação por Tab

### Suporte a Leitores de Tela:
- ✅ NVDA
- ✅ JAWS
- ✅ VoiceOver (macOS/iOS)
- ✅ TalkBack (Android)

## 🎬 Fluxo de Navegação Típico

### Exemplo: Preenchendo o campo "Tipo"

1. **Usuário pressiona `Tab`** → Foco vai para o select
2. **Usuário pressiona `Enter`** → Dropdown abre
3. **Usuário pressiona `↓`** três vezes → Navega pelas opções
4. **Usuário pressiona `Espaço`** → Marca a opção "CLIENTE"
5. **Usuário pressiona `↓`** → Vai para próxima opção
6. **Usuário pressiona `Espaço`** → Marca a opção "FORNECEDOR"
7. **Usuário pressiona `Esc`** → Fecha o dropdown
8. **Resultado:** Duas opções selecionadas: CLIENTE e FORNECEDOR

## 🐛 Troubleshooting

### O foco do teclado não está funcionando
**Solução:** Verifique se o componente tem `tabindex="0"` no container principal.

### As setas não navegam
**Solução:** Certifique-se de que o dropdown está aberto (`isOpen = true`).

### O scroll não acompanha a opção focada
**Solução:** A função `scrollToFocusedOption()` deve ser chamada automaticamente. Verifique o console por erros.

### ESC fecha o drawer/dialog pai
**Solução:** ✅ **Já corrigido!** O componente usa `event.stopPropagation()` em todos os eventos de teclado para prevenir que eles afetem componentes pais (drawers, dialogs, etc).

### Conflito com outras teclas
**Solução:** O componente usa `event.preventDefault()` e `event.stopPropagation()` para evitar conflitos. Se houver problemas, verifique outros event listeners na página.

## 📚 Referências

- [WCAG 2.1 - Keyboard Accessible](https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html)
- [ARIA Authoring Practices - Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
- [MDN - KeyboardEvent](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent)

## 🎉 Benefícios

✅ **Produtividade:** Usuários podem preencher formulários mais rápido  
✅ **Acessibilidade:** Pessoas com deficiência visual podem usar o sistema  
✅ **Usabilidade:** Melhor experiência para power users  
✅ **Conformidade:** Atende WCAG 2.1 Level AA  
✅ **SEO:** Melhora a pontuação de acessibilidade do site

---

**Versão:** 3.0  
**Última atualização:** 2025  
**Desenvolvido por:** Sistema CAR
