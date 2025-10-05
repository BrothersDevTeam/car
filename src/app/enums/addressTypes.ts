/**
 * Enum que define os tipos de endereço disponíveis no sistema.
 * 
 * Estes valores devem ser EXATAMENTE iguais aos definidos no backend (AddressType.java)
 * para garantir compatibilidade na comunicação API.
 * 
 * @enum {string}
 */
export enum AddressType {
  /**
   * Endereço residencial - usado para cadastro de residência do cliente
   */
  RESIDENCIAL = 'RESIDENCIAL',
  
  /**
   * Endereço comercial - usado para empresas ou estabelecimentos comerciais
   */
  COMERCIAL = 'COMERCIAL',
  
  /**
   * Endereço de entrega - específico para envio de produtos/documentos
   */
  ENTREGA = 'ENTREGA',
  
  /**
   * Endereço de cobrança - usado para envio de boletos e correspondências financeiras
   */
  COBRANCA = 'COBRANCA',
  
  /**
   * Outros tipos de endereço que não se encaixam nas categorias acima
   */
  OUTROS = 'OUTROS'
}

/**
 * Mapeamento de labels amigáveis para exibição na interface do usuário.
 * 
 * Usa Record<> para garantir type-safety: se adicionar um novo tipo no enum,
 * o TypeScript vai exigir que você adicione o label correspondente aqui.
 */
export const AddressTypeLabels: Record<AddressType, string> = {
  [AddressType.RESIDENCIAL]: 'Residencial',
  [AddressType.COMERCIAL]: 'Comercial',
  [AddressType.ENTREGA]: 'Entrega',
  [AddressType.COBRANCA]: 'Cobrança',
  [AddressType.OUTROS]: 'Outros',
};

/**
 * Mapeamento de ícones do Material Icons para cada tipo de endereço.
 * 
 * Isso permite criar uma experiência visual mais rica e intuitiva,
 * facilitando a identificação rápida do tipo de endereço.
 * 
 * Todos os ícones são do Material Icons (https://fonts.google.com/icons)
 */
export const AddressTypeIcons: Record<AddressType, string> = {
  [AddressType.RESIDENCIAL]: 'home',           // Ícone de casa
  [AddressType.COMERCIAL]: 'business',         // Ícone de prédio comercial
  [AddressType.ENTREGA]: 'local_shipping',     // Ícone de caminhão
  [AddressType.COBRANCA]: 'receipt',           // Ícone de recibo
  [AddressType.OUTROS]: 'location_on',         // Ícone de pin de localização
};

/**
 * Função helper para obter um array de opções para uso em selects/dropdowns.
 * 
 * @returns Array de objetos com value (enum) e label (string amigável)
 * 
 * @example
 * const options = getAddressTypeOptions();
 * // [
 * //   { value: 'RESIDENCIAL', label: 'Residencial' },
 * //   { value: 'COMERCIAL', label: 'Comercial' },
 * //   ...
 * // ]
 */
export function getAddressTypeOptions(): Array<{ value: AddressType; label: string }> {
  return Object.values(AddressType).map(type => ({
    value: type,
    label: AddressTypeLabels[type]
  }));
}

/**
 * Lista de UFs (Unidades Federativas) válidas do Brasil.
 * 
 * Esta lista é usada para validação no frontend e deve estar sincronizada
 * com a validação do backend (AddressValidator.java).
 * 
 * A ordem alfabética facilita a busca e seleção pelo usuário.
 */
export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
] as const;

/**
 * Type helper para UF - garante que apenas UFs válidas sejam aceitas.
 * 
 * O uso de 'as const' transforma o array em um tipo literal,
 * permitindo type-safety para estados brasileiros.
 */
export type BrazilianState = typeof BRAZILIAN_STATES[number];

/**
 * Mapeamento de siglas de estados para nomes completos.
 * 
 * Útil para exibir o nome completo do estado em tooltips ou detalhes.
 */
export const STATE_NAMES: Record<BrazilianState, string> = {
  'AC': 'Acre',
  'AL': 'Alagoas',
  'AP': 'Amapá',
  'AM': 'Amazonas',
  'BA': 'Bahia',
  'CE': 'Ceará',
  'DF': 'Distrito Federal',
  'ES': 'Espírito Santo',
  'GO': 'Goiás',
  'MA': 'Maranhão',
  'MT': 'Mato Grosso',
  'MS': 'Mato Grosso do Sul',
  'MG': 'Minas Gerais',
  'PA': 'Pará',
  'PB': 'Paraíba',
  'PR': 'Paraná',
  'PE': 'Pernambuco',
  'PI': 'Piauí',
  'RJ': 'Rio de Janeiro',
  'RN': 'Rio Grande do Norte',
  'RS': 'Rio Grande do Sul',
  'RO': 'Rondônia',
  'RR': 'Roraima',
  'SC': 'Santa Catarina',
  'SP': 'São Paulo',
  'SE': 'Sergipe',
  'TO': 'Tocantins'
};

/**
 * Função helper para validar se uma string é uma UF válida.
 * 
 * @param state - String a ser validada
 * @returns true se for uma UF válida do Brasil
 * 
 * @example
 * isValidBrazilianState('SP'); // true
 * isValidBrazilianState('XX'); // false
 * isValidBrazilianState('sp'); // true (case-insensitive)
 */
export function isValidBrazilianState(state: string): state is BrazilianState {
  return BRAZILIAN_STATES.includes(state.toUpperCase() as BrazilianState);
}
