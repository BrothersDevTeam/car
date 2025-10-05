import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import {
  Address,
  CreateAddress,
  UpdateAddress,
  AddressSearchFilters,
} from '@interfaces/address';
import { PaginationResponse } from '@interfaces/pagination';

/**
 * Service responsável por toda comunicação com a API de endereços.
 * 
 * Este service implementa o padrão Repository, abstraindo a lógica
 * de acesso aos dados e fornecendo uma interface limpa para os componentes.
 * 
 * PRINCÍPIOS SEGUIDOS:
 * - Single Responsibility: apenas lida com operações de endereço
 * - Separation of Concerns: componentes não sabem como os dados são obtidos
 * - DRY: evita duplicação de lógica de requisições HTTP
 * 
 * SEGURANÇA:
 * - Todas as requisições passam pelo AuthInterceptor (token JWT automático)
 * - Permissões são validadas no backend (roles: SELLER, MANAGER)
 * 
 * @Injectable providedIn: 'root' - Singleton em toda aplicação
 */
@Injectable({
  providedIn: 'root',
})
export class AddressService {
  /**
   * URL base para endpoints de endereço.
   * 
   * O prefixo '/api' é mapeado para o backend via proxy.conf.json
   * em desenvolvimento, e deve ser configurado no servidor em produção.
   */
  private readonly apiUrl = '/api/addresses';

  /**
   * Injeção de dependência do HttpClient.
   * 
   * O HttpClient do Angular já vem configurado com:
   * - Interceptors (auth, loading)
   * - Tratamento de erros
   * - Conversão automática JSON
   */
  constructor(private http: HttpClient) {}

  /**
   * Cria um novo endereço.
   * 
   * ENDPOINT: POST /api/addresses
   * PERMISSÕES: ROLE_SELLER ou ROLE_MANAGER
   * 
   * VALIDAÇÕES BACKEND:
   * - Pessoa deve existir
   * - CEP não pode ser duplicado para a mesma pessoa
   * - CEP deve ter 8-9 dígitos numéricos
   * - Estado deve ser UF válida
   * - Se mainAddress=true, outros endereços da pessoa perdem essa flag
   * 
   * @param address - Dados do endereço (sem addressId, storeId, timestamps)
   * @returns Observable com o endereço criado (incluindo addressId gerado)
   * 
   * @example
   * const newAddress: CreateAddress = {
   *   personId: '123',
   *   addressType: AddressType.RESIDENCIAL,
   *   cep: '01310100',
   *   street: 'Av. Paulista',
   *   number: '1578',
   *   neighborhood: 'Bela Vista',
   *   city: 'São Paulo',
   *   state: 'SP',
   *   active: true,
   *   mainAddress: true
   * };
   * 
   * this.addressService.create(newAddress).subscribe({
   *   next: (created) => console.log('Criado:', created),
   *   error: (err) => console.error('Erro:', err)
   * });
   */
  create(address: CreateAddress): Observable<Address> {
    return this.http.post<Address>(this.apiUrl, address).pipe(
      // tap: operador RxJS para side-effects (não altera o stream)
      // Útil para logging, cache invalidation, etc.
      tap((created) => {
        console.log('✅ Endereço criado com sucesso:', created);
      })
    );
  }

  /**
   * Atualiza um endereço existente.
   * 
   * ENDPOINT: PUT /api/addresses/{addressId}
   * PERMISSÕES: ROLE_SELLER
   * 
   * VALIDAÇÕES BACKEND:
   * - Endereço deve existir
   * - CEP não pode conflitar com outro endereço da mesma pessoa
   * - Mesmas validações de formato da criação
   * - updatedAt é atualizado automaticamente
   * 
   * IMPORTANTE: personId não pode ser alterado (endereço não muda de dono)
   * 
   * @param addressId - UUID do endereço a ser atualizado
   * @param address - Dados atualizados (sem personId, addressId, timestamps)
   * @returns Observable com o endereço atualizado
   * 
   * @example
   * const updates: UpdateAddress = {
   *   street: 'Av. Paulista',
   *   number: '1000',
   *   active: true
   * };
   * 
   * this.addressService.update('abc-123', updates).subscribe({
   *   next: (updated) => console.log('Atualizado:', updated),
   *   error: (err) => console.error('Erro:', err)
   * });
   */
  update(addressId: string, address: UpdateAddress): Observable<Address> {
    return this.http.put<Address>(`${this.apiUrl}/${addressId}`, address).pipe(
      tap((updated) => {
        console.log('✅ Endereço atualizado com sucesso:', updated);
      })
    );
  }

  /**
   * Exclui um endereço.
   * 
   * ENDPOINT: DELETE /api/addresses/{addressId}
   * PERMISSÕES: ROLE_MANAGER (apenas gerentes podem deletar)
   * 
   * ATENÇÃO: Esta é uma exclusão PERMANENTE (hard delete).
   * Considere usar soft delete (active=false) para preservar histórico.
   * 
   * @param addressId - UUID do endereço a ser excluído
   * @returns Observable<void> - não retorna dados, apenas indica sucesso/erro
   * 
   * @example
   * this.addressService.delete('abc-123').subscribe({
   *   next: () => console.log('Deletado com sucesso'),
   *   error: (err) => console.error('Erro ao deletar:', err)
   * });
   */
  delete(addressId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${addressId}`).pipe(
      tap(() => {
        console.log('✅ Endereço deletado com sucesso');
      })
    );
  }

  /**
   * Busca um endereço específico por ID.
   * 
   * ENDPOINT: GET /api/addresses/{addressId}
   * PERMISSÕES: ROLE_SELLER
   * 
   * @param addressId - UUID do endereço
   * @returns Observable com os dados completos do endereço
   * @throws NotFoundException se o endereço não existir (404)
   * 
   * @example
   * this.addressService.getById('abc-123').subscribe({
   *   next: (address) => console.log('Encontrado:', address),
   *   error: (err) => console.error('Não encontrado:', err)
   * });
   */
  getById(addressId: string): Observable<Address> {
    return this.http.get<Address>(`${this.apiUrl}/${addressId}`);
  }

  /**
   * Busca TODOS os endereços de uma pessoa específica.
   * 
   * ENDPOINT: GET /api/addresses/person/{personId}
   * PERMISSÕES: ROLE_SELLER
   * 
   * IMPORTANTE: Este endpoint retorna um Array, não uma paginação.
   * Use-o quando precisar de todos os endereços de uma pessoa de uma vez
   * (ex: na tela de detalhes da pessoa).
   * 
   * A lista vem ordenada naturalmente (endereço principal primeiro).
   * 
   * @param personId - UUID da pessoa
   * @returns Observable<Address[]> - array com todos os endereços da pessoa
   * @throws NotFoundException se a pessoa não existir (404)
   * 
   * @example
   * this.addressService.getByPersonId('person-123').subscribe({
   *   next: (addresses) => {
   *     console.log(`Encontrados ${addresses.length} endereços`);
   *     const main = addresses.find(a => a.mainAddress);
   *     console.log('Principal:', main);
   *   },
   *   error: (err) => console.error('Erro:', err)
   * });
   */
  getByPersonId(personId: string): Observable<Address[]> {
    return this.http.get<Address[]>(`${this.apiUrl}/person/${personId}`).pipe(
      tap((addresses) => {
        console.log(`✅ ${addresses.length} endereço(s) encontrado(s) para pessoa ${personId}`);
      })
    );
  }

  /**
   * Define um endereço como principal.
   * 
   * ENDPOINT: PATCH /api/addresses/{addressId}/set-main
   * PERMISSÕES: ROLE_SELLER
   * 
   * REGRA DE NEGÓCIO CRÍTICA:
   * - Ao marcar um endereço como principal, o backend AUTOMATICAMENTE
   *   remove a flag mainAddress=true de TODOS os outros endereços
   *   da mesma pessoa
   * - Garante que sempre haja no máximo UM endereço principal por pessoa
   * 
   * @param addressId - UUID do endereço a ser marcado como principal
   * @returns Observable com o endereço atualizado (mainAddress=true)
   * 
   * @example
   * this.addressService.setMainAddress('abc-123').subscribe({
   *   next: (address) => {
   *     console.log('Agora é principal:', address);
   *     // Recarregar lista de endereços para refletir mudanças
   *     this.loadAddresses();
   *   },
   *   error: (err) => console.error('Erro:', err)
   * });
   */
  setMainAddress(addressId: string): Observable<Address> {
    return this.http.patch<Address>(
      `${this.apiUrl}/${addressId}/set-main`,
      {} // Body vazio - o addressId na URL é suficiente
    ).pipe(
      tap((address) => {
        console.log('✅ Endereço definido como principal:', address);
      })
    );
  }

  /**
   * Lista todos os endereços com paginação e filtros.
   * 
   * ENDPOINT: GET /api/addresses?page=X&size=Y&filters...
   * PERMISSÕES: ROLE_SELLER
   * 
   * Este método é mais adequado para:
   * - Telas administrativas que listam todos os endereços
   * - Relatórios e exports
   * - Buscas complexas com múltiplos filtros
   * 
   * Para buscar endereços de UMA pessoa específica, prefira getByPersonId().
   * 
   * @param pageIndex - Número da página (0-based)
   * @param pageSize - Quantidade de itens por página
   * @param filters - Filtros opcionais (personId, type, city, state, etc)
   * @returns Observable com resposta paginada
   * 
   * @example
   * // Buscar endereços residenciais de SP, página 0, 10 itens
   * this.addressService.getAll(0, 10, {
   *   addressType: AddressType.RESIDENCIAL,
   *   state: 'SP'
   * }).subscribe({
   *   next: (response) => {
   *     console.log('Total:', response.page.totalElements);
   *     console.log('Itens:', response.content);
   *   }
   * });
   */
  getAll(
    pageIndex: number,
    pageSize: number,
    filters?: AddressSearchFilters
  ): Observable<PaginationResponse<Address>> {
    // HttpParams: classe do Angular para construir query strings de forma type-safe
    let params = new HttpParams()
      .set('page', pageIndex.toString())
      .set('size', pageSize.toString());

    // Adiciona filtros apenas se fornecidos (evita query params vazios)
    if (filters) {
      // personId - filtrar por pessoa específica
      if (filters.personId?.trim()) {
        params = params.set('personId', filters.personId.trim());
      }

      // addressType - filtrar por tipo de endereço
      if (filters.addressType) {
        params = params.set('addressType', filters.addressType);
      }

      // city - filtrar por cidade (busca parcial no backend)
      if (filters.city?.trim()) {
        params = params.set('city', filters.city.trim());
      }

      // state - filtrar por UF
      if (filters.state?.trim()) {
        params = params.set('state', filters.state.trim());
      }

      // cep - filtrar por CEP
      if (filters.cep?.trim()) {
        params = params.set('cep', filters.cep.trim());
      }

      // mainAddress - filtrar apenas endereços principais
      if (filters.mainAddress !== undefined) {
        params = params.set('mainAddress', filters.mainAddress.toString());
      }

      // active - filtrar por status ativo/inativo
      if (filters.active !== undefined) {
        params = params.set('active', filters.active.toString());
      }
    }

    return this.http.get<PaginationResponse<Address>>(this.apiUrl, { params }).pipe(
      tap((response) => {
        console.log(`✅ ${response.content.length} endereço(s) encontrado(s)`);
      })
    );
  }

  /**
   * Método helper para remover formatação de CEP.
   * 
   * O backend espera CEP apenas com números (sem hífen ou pontos).
   * Use este método antes de enviar dados para a API.
   * 
   * @param cep - CEP formatado (ex: "01310-100")
   * @returns CEP apenas com números (ex: "01310100")
   * 
   * @example
   * const cepFormatado = '01310-100';
   * const cepLimpo = this.addressService.cleanCep(cepFormatado);
   * console.log(cepLimpo); // "01310100"
   */
  cleanCep(cep: string): string {
    // Remove tudo que não for dígito usando regex
    return cep.replace(/\D/g, '');
  }

  /**
   * Método helper para formatar CEP para exibição.
   * 
   * Adiciona hífen no formato padrão brasileiro: 00000-000
   * 
   * @param cep - CEP sem formatação (ex: "01310100")
   * @returns CEP formatado (ex: "01310-100")
   * 
   * @example
   * const cepSemFormato = '01310100';
   * const cepFormatado = this.addressService.formatCep(cepSemFormato);
   * console.log(cepFormatado); // "01310-100"
   */
  formatCep(cep: string): string {
    // Remove formatação existente
    const cleaned = this.cleanCep(cep);
    
    // Aplica máscara 00000-000
    if (cleaned.length === 8) {
      return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
    }
    
    // Retorna sem formatação se não tiver 8 dígitos
    return cleaned;
  }

  /**
   * Valida formato de CEP brasileiro.
   * 
   * Verifica se o CEP tem exatamente 8 dígitos (após remover formatação).
   * 
   * @param cep - CEP a ser validado (pode estar formatado ou não)
   * @returns true se válido, false caso contrário
   * 
   * @example
   * this.addressService.isValidCep('01310-100'); // true
   * this.addressService.isValidCep('01310100');   // true
   * this.addressService.isValidCep('123');        // false
   * this.addressService.isValidCep('');           // false
   */
  isValidCep(cep: string): boolean {
    if (!cep) return false;
    
    const cleaned = this.cleanCep(cep);
    
    // CEP brasileiro tem exatamente 8 dígitos
    return cleaned.length === 8 && /^\d{8}$/.test(cleaned);
  }

  /**
   * Método helper para ordenar endereços.
   * 
   * Ordena colocando o endereço principal primeiro, depois por data de criação.
   * 
   * @param addresses - Array de endereços a ser ordenado
   * @returns Array ordenado (endereço principal primeiro)
   * 
   * @example
   * const sorted = this.addressService.sortAddresses(addresses);
   * console.log(sorted[0].mainAddress); // true (se existir um principal)
   */
  sortAddresses(addresses: Address[]): Address[] {
    return [...addresses].sort((a, b) => {
      // Endereço principal vem primeiro
      if (a.mainAddress && !b.mainAddress) return -1;
      if (!a.mainAddress && b.mainAddress) return 1;
      
      // Se ambos são principais ou ambos não são, ordena por data de criação (mais recente primeiro)
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      
      return 0;
    });
  }

  /**
   * Método helper para verificar se uma pessoa tem endereço principal.
   * 
   * @param addresses - Array de endereços da pessoa
   * @returns true se houver um endereço marcado como principal
   * 
   * @example
   * const hasMain = this.addressService.hasMainAddress(addresses);
   * if (!hasMain) {
   *   console.log('Pessoa não tem endereço principal cadastrado');
   * }
   */
  hasMainAddress(addresses: Address[]): boolean {
    return addresses.some(address => address.mainAddress === true);
  }

  /**
   * Método helper para obter o endereço principal de uma lista.
   * 
   * @param addresses - Array de endereços
   * @returns Endereço principal ou undefined se não houver
   * 
   * @example
   * const main = this.addressService.getMainAddress(addresses);
   * if (main) {
   *   console.log('Endereço principal:', main.street);
   * } else {
   *   console.log('Nenhum endereço principal encontrado');
   * }
   */
  getMainAddress(addresses: Address[]): Address | undefined {
    return addresses.find(address => address.mainAddress === true);
  }

  /**
   * Método helper para contar endereços por tipo.
   * 
   * @param addresses - Array de endereços
   * @returns Objeto com contagem por tipo
   * 
   * @example
   * const count = this.addressService.countByType(addresses);
   * console.log('Residenciais:', count.RESIDENCIAL);
   * console.log('Comerciais:', count.COMERCIAL);
   */
  countByType(addresses: Address[]): Record<string, number> {
    return addresses.reduce((acc, address) => {
      const type = address.addressType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}
