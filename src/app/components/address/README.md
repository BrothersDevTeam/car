# 📍 Sistema de Endereços - Documentação

## 📋 Visão Geral

Sistema completo de gerenciamento de endereços para pessoas (clientes, funcionários, etc.) integrado com a API backend.

## 🎯 Funcionalidades

- ✅ Criar novo endereço
- ✅ Editar endereço existente
- ✅ Excluir endereço
- ✅ Definir endereço principal
- ✅ Busca automática por CEP (ViaCEP)
- ✅ Validações client-side
- ✅ Múltiplos tipos de endereço (Residencial, Comercial, Entrega, Cobrança, Outros)
- ✅ Suporte a múltiplos endereços por pessoa
- ✅ Interface responsiva

## 📁 Estrutura de Arquivos

```
src/app/
├── enums/
│   └── addressTypes.ts                 # Enum de tipos e UFs
├── interfaces/
│   └── address.ts                      # Interfaces TypeScript
├── services/
│   ├── address.service.ts              # Service de comunicação API
│   └── address.service.spec.ts         # Testes unitários
└── components/
    └── address/
        ├── address-form/               # Formulário criar/editar
        ├── address-card/               # Card visual de endereço
        └── address-list/               # Lista com CRUD completo
```

## 🚀 Como Usar

### 1. Importar em seu Componente

```typescript
import { AddressListComponent } from '@components/address/address-list/address-list.component';

@Component({
  imports: [AddressListComponent],
  // ...
})
```

### 2. Usar no Template

```html
<app-address-list
  [personId]="person.personId"
  [canEdit]="true"
  [canDelete]="true"
  [canAdd]="true">
</app-address-list>
```

### 3. Inputs Disponíveis

| Input | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `personId` | string | ✅ Sim | ID da pessoa dona dos endereços |
| `canEdit` | boolean | ❌ Não | Permite editar (padrão: true) |
| `canDelete` | boolean | ❌ Não | Permite excluir (padrão: true) |
| `canAdd` | boolean | ❌ Não | Permite adicionar (padrão: true) |

## 🔧 Exemplos de Uso

### Exemplo 1: Lista Completa com Todas Permissões

```html
<app-address-list
  [personId]="selectedPerson.personId"
  [canEdit]="true"
  [canDelete]="true"
  [canAdd]="true">
</app-address-list>
```

### Exemplo 2: Apenas Visualização (Sem Edição)

```html
<app-address-list
  [personId]="selectedPerson.personId"
  [canEdit]="false"
  [canDelete]="false"
  [canAdd]="false">
</app-address-list>
```

### Exemplo 3: Usando AddressFormComponent Standalone

```typescript
import { AddressFormComponent } from '@components/address/address-form/address-form.component';
```

```html
<app-address-form
  [personId]="person.personId"
  [address]="addressToEdit"
  (formSubmitted)="onAddressSubmitted()"
  (formCancelled)="onAddressCancelled()">
</app-address-form>
```

### Exemplo 4: Usando AddressService Diretamente

```typescript
constructor(private addressService: AddressService) {}

loadAddresses(personId: string) {
  this.addressService.getByPersonId(personId).subscribe({
    next: (addresses) => {
      console.log('Endereços:', addresses);
      
      // Ordenar (principal primeiro)
      const sorted = this.addressService.sortAddresses(addresses);
      
      // Pegar endereço principal
      const main = this.addressService.getMainAddress(addresses);
      
      // Contar por tipo
      const count = this.addressService.countByType(addresses);
    }
  });
}

createAddress(personId: string) {
  const newAddress: CreateAddress = {
    personId,
    addressType: AddressType.RESIDENCIAL,
    cep: '01310100',
    street: 'Av. Paulista',
    number: '1578',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    active: true,
    mainAddress: true
  };

  this.addressService.create(newAddress).subscribe({
    next: (created) => console.log('Criado:', created),
    error: (err) => console.error('Erro:', err)
  });
}
```

## 🎨 Tipos de Endereço Disponíveis

```typescript
enum AddressType {
  RESIDENCIAL = 'RESIDENCIAL',  // 🏠 Casa/Apartamento
  COMERCIAL = 'COMERCIAL',      // 🏢 Empresa/Escritório
  ENTREGA = 'ENTREGA',          // 🚚 Endereço de entrega
  COBRANCA = 'COBRANCA',        // 📄 Endereço de cobrança
  OUTROS = 'OUTROS'             // 📍 Outros tipos
}
```

## 🔒 Permissões Necessárias

| Operação | Role Mínimo |
|----------|-------------|
| Criar endereço | `ROLE_SELLER` |
| Listar endereços | `ROLE_SELLER` |
| Editar endereço | `ROLE_SELLER` |
| Definir como principal | `ROLE_SELLER` |
| Excluir endereço | `ROLE_MANAGER` |

## ⚠️ Regras de Negócio

1. **Endereço Principal**: Apenas UM endereço pode ser principal por pessoa
2. **CEP**: Deve ter 8 dígitos (sem formatação ao enviar para API)
3. **UF**: Deve ser uma UF válida do Brasil (2 caracteres)
4. **Busca CEP**: Integrado com ViaCEP para auto-preenchimento
5. **Validações**: CEP não pode ser duplicado para a mesma pessoa

## 🧪 Testes

Execute os testes unitários:

```bash
ng test
```

Os testes cobrem:
- ✅ Todos os métodos do AddressService
- ✅ Helpers utilitários (cleanCep, formatCep, etc)
- ✅ Validações
- ✅ Requisições HTTP

## 🐛 Troubleshooting

### Problema: CEP não preenche automaticamente

**Solução**: Verifique se o CepService está corretamente configurado e a API do ViaCEP está acessível.

### Problema: Erro ao criar endereço "Person not found"

**Solução**: Certifique-se de que o `personId` passado existe no banco de dados.

### Problema: Não consigo excluir endereço

**Solução**: Verifique se o usuário logado possui `ROLE_MANAGER`. Apenas gerentes podem excluir endereços.

### Problema: Múltiplos endereços principais

**Solução**: Isso não deveria acontecer. O backend garante apenas um principal. Se ocorrer, é um bug no backend.

## 📚 Documentação Adicional

- [Interface Address](../interfaces/address.ts)
- [Enum AddressTypes](../enums/addressTypes.ts)
- [AddressService](../services/address.service.ts)

## 🎯 Próximas Melhorias

- [ ] Adicionar mapa para visualização de endereço
- [ ] Exportar endereços para PDF
- [ ] Histórico de alterações
- [ ] Validação de endereço via API dos Correios
- [ ] Cálculo automático de distância entre endereços

## 👨‍💻 Autor

Desenvolvido seguindo padrões sênior de Angular com foco em:
- Type Safety
- Boas práticas
- Código limpo e manutenível
- Testes unitários
- Documentação completa
