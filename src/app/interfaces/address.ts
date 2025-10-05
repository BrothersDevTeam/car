import { AddressType, BrazilianState } from '../enums/addressTypes';

/**
 * Interface completa que representa um endereço no sistema.
 * 
 * Esta interface reflete EXATAMENTE a estrutura do AddressModel.java e AddressResponseDto.java
 * do backend para garantir compatibilidade total na comunicação API.
 * 
 * Design Pattern: DTO (Data Transfer Object)
 * - Usada para transferência de dados entre frontend e backend
 * - Campos opcionais (?) são aqueles que podem não existir em determinados contextos
 * - Campos obrigatórios são validados tanto no frontend quanto no backend
 */
export interface Address {
  /**
   * Identificador único do endereço (UUID).
   * 
   * - Gerado automaticamente pelo backend ao criar um novo endereço
   * - Opcional porque não existe durante a criação (POST)
   * - Obrigatório em operações de atualização (PUT) e exclusão (DELETE)
   */
  addressId?: string;

  /**
   * ID da pessoa dona deste endereço (relacionamento ManyToOne).
   * 
   * - Obrigatório: todo endereço DEVE pertencer a uma pessoa
   * - Usado para buscar todos os endereços de uma pessoa específica
   * - Validado no backend para garantir que a pessoa existe
   */
  personId: string;

  /**
   * ID da loja (herdado da pessoa automaticamente pelo backend).
   * 
   * - Opcional no frontend porque é preenchido automaticamente pela API
   * - Importante para multi-tenancy e filtros por loja
   * - Sempre presente nas respostas do backend
   */
  storeId?: string;

  /**
   * Tipo/categoria do endereço.
   * 
   * - Enum restrito: apenas valores predefinidos são aceitos
   * - Facilita filtros e organização de endereços
   * - Permite tratamento visual diferenciado por tipo
   */
  addressType: AddressType;

  /**
   * CEP (Código de Endereçamento Postal) brasileiro.
   * 
   * - Formato: 8 ou 9 dígitos numéricos (com ou sem hífen)
   * - Validado no backend: apenas números
   * - No frontend, pode ser exibido com máscara (00000-000)
   * - IMPORTANTE: Ao enviar para API, remover formatação (apenas números)
   * - Usado para integração com ViaCEP (auto-preenchimento)
   */
  cep: string;

  /**
   * Nome da rua/avenida/logradouro.
   * 
   * - Campo obrigatório
   * - Máximo 100 caracteres
   * - Pode ser preenchido automaticamente via ViaCEP
   */
  street: string;

  /**
   * Número do imóvel/estabelecimento.
   * 
   * - Opcional: alguns endereços não possuem número (ex: "S/N")
   * - Máximo 10 caracteres para suportar números compostos (ex: "123-A")
   */
  number?: string;

  /**
   * Complemento do endereço (apartamento, sala, bloco, etc).
   * 
   * - Opcional
   * - Máximo 100 caracteres
   * - Exemplos: "Apto 45", "Bloco B", "Sala 302"
   */
  complement?: string;

  /**
   * Bairro/distrito.
   * 
   * - Campo obrigatório
   * - Máximo 100 caracteres
   * - Pode ser preenchido automaticamente via ViaCEP
   */
  neighborhood: string;

  /**
   * Cidade/município.
   * 
   * - Campo obrigatório
   * - Máximo 100 caracteres
   * - Pode ser preenchido automaticamente via ViaCEP
   */
  city: string;

  /**
   * Unidade Federativa (estado brasileiro).
   * 
   * - Campo obrigatório
   * - EXATAMENTE 2 caracteres (UF)
   * - Validado no backend contra lista de UFs válidas
   * - Pode ser preenchido automaticamente via ViaCEP
   * - Use o type BrazilianState para garantir type-safety
   */
  state: BrazilianState;

  /**
   * País.
   * 
   * - Opcional no frontend (valor padrão "Brasil" aplicado pelo backend)
   * - Preparado para internacionalização futura
   * - Máximo 100 caracteres
   */
  country?: string;

  /**
   * Flag que indica se este é o endereço principal da pessoa.
   * 
   * - Opcional (padrão: false)
   * - REGRA DE NEGÓCIO IMPORTANTE: apenas UM endereço pode ser principal por pessoa
   * - Ao marcar um endereço como principal, o backend automaticamente 
   *   remove essa flag dos outros endereços da mesma pessoa
   * - Use o endpoint PATCH /set-main para alterar o endereço principal
   */
  mainAddress?: boolean;

  /**
   * Flag que indica se o endereço está ativo.
   * 
   * - Campo obrigatório (sempre deve ter valor)
   * - Permite "soft delete" - desativar sem remover do banco
   * - Endereços inativos podem ser filtrados nas listagens
   */
  active: boolean;

  /**
   * Data/hora de criação do registro (formato ISO 8601).
   * 
   * - Opcional porque é gerado automaticamente pelo backend
   * - Presente apenas nas respostas (GET)
   * - Usado para auditoria e ordenação
   */
  createdAt?: string;

  /**
   * Data/hora da última atualização (formato ISO 8601).
   * 
   * - Opcional porque é gerado automaticamente pelo backend
   * - Atualizado automaticamente a cada PUT
   * - Presente apenas nas respostas (GET)
   * - Usado para auditoria e controle de versão
   */
  updatedAt?: string;
}

/**
 * Type para criação de um novo endereço (POST).
 * 
 * Omite campos que são gerados/controlados pelo backend:
 * - addressId: gerado automaticamente
 * - storeId: herdado da pessoa
 * - createdAt: timestamp automático
 * - updatedAt: timestamp automático
 * 
 * Use este type ao fazer requisições POST para /addresses
 * 
 * @example
 * const newAddress: CreateAddress = {
 *   personId: '123-456-789',
 *   addressType: AddressType.RESIDENCIAL,
 *   cep: '12345678',
 *   street: 'Rua das Flores',
 *   number: '123',
 *   neighborhood: 'Centro',
 *   city: 'São Paulo',
 *   state: 'SP',
 *   active: true,
 *   mainAddress: true
 * };
 */
export type CreateAddress = Omit<
  Address,
  'addressId' | 'storeId' | 'createdAt' | 'updatedAt'
>;

/**
 * Type para atualização de um endereço existente (PUT).
 * 
 * Omite campos que não devem/podem ser alterados:
 * - personId: não pode trocar o dono do endereço
 * - addressId: identificador (passado na URL)
 * - storeId: herdado da pessoa (imutável)
 * - createdAt: data de criação (imutável)
 * - updatedAt: atualizado automaticamente
 * 
 * Use este type ao fazer requisições PUT para /addresses/{addressId}
 * 
 * @example
 * const updateData: UpdateAddress = {
 *   addressType: AddressType.COMERCIAL,
 *   street: 'Rua das Flores',
 *   number: '456',
 *   active: true
 * };
 */
export type UpdateAddress = Omit<
  CreateAddress,
  'personId'
>;

/**
 * Interface para resposta de erro de validação do backend.
 * 
 * Quando o backend retorna erro 400 (Bad Request), geralmente
 * vem com esta estrutura contendo detalhes da validação que falhou.
 */
export interface AddressValidationError {
  /**
   * Mensagem de erro
   */
  message: string;

  /**
   * Campo que causou o erro (se aplicável)
   */
  field?: string;

  /**
   * Código do erro para tratamento programático
   */
  code?: string;
}

/**
 * Interface para filtros de busca de endereços.
 * 
 * Usada no método getAll() do AddressService para construir
 * query parameters de filtro.
 * 
 * Todos os campos são opcionais para permitir busca flexível.
 */
export interface AddressSearchFilters {
  /**
   * Filtrar por pessoa específica
   */
  personId?: string;

  /**
   * Filtrar por tipo de endereço
   */
  addressType?: AddressType;

  /**
   * Filtrar por cidade
   */
  city?: string;

  /**
   * Filtrar por estado (UF)
   */
  state?: BrazilianState;

  /**
   * Filtrar por CEP
   */
  cep?: string;

  /**
   * Filtrar apenas endereços principais
   */
  mainAddress?: boolean;

  /**
   * Filtrar por status ativo/inativo
   */
  active?: boolean;
}

/**
 * Interface para resposta do ViaCEP.
 * 
 * Usada para tipar a resposta da API pública do ViaCEP
 * e facilitar o auto-preenchimento de campos de endereço.
 * 
 * Documentação: https://viacep.com.br/
 */
export interface ViaCepResponse {
  cep: string;
  logradouro: string;    // street
  complemento: string;   // complement
  bairro: string;        // neighborhood
  localidade: string;    // city
  uf: string;            // state
  ibge?: string;
  gia?: string;
  ddd?: string;
  siafi?: string;
  erro?: boolean;        // true se CEP não encontrado
}
