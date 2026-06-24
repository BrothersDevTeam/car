import { VendaStatus } from '../enums/venda-status';
import { FormaPagamento } from '../enums/forma-pagamento';

/**
 * Interface que representa a entidade VendaModel do Backend.
 */
export interface VendaModel {
  vendaId: string;
  storeId: string;
  storeName?: string;
  vehicleId: string;
  buyerPersonId: string;
  sellerPersonId?: string;
  nfeId?: string;
  numero?: number;
  dataVenda: string; // ISO string
  valor: number;
  valorFinal?: number;
  observacao?: string;
  vendaStatus: VendaStatus;
  pagamentos: VendaPagamentoModel[];
  avalistas: VendaAvalistaModel[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  version: number;
}

/**
 * Interface para os itens de pagamento da Venda (Model).
 */
export interface VendaPagamentoModel {
  vendaPagamentoId: string;
  vendaId: string;
  storeId: string;
  formaPagamento: FormaPagamento;
  descricao?: string;
  valor: number;
  vencimento?: string;
  tipo: string; // 'R' ou 'D'
  createdAt: string;
  createdBy: string;
}

/**
 * Interface para os avalistas da Venda (Model).
 */
export interface VendaAvalistaModel {
  vendaAvalistaId: string;
  vendaId: string;
  personId: string;
  storeId: string;
}

/**
 * DTO de request para criação e atualização de uma venda.
 */
export interface VendaRequestDto {
  vehicleId: string;
  buyerPersonId: string;
  sellerPersonId?: string;
  dataVenda: string;
  valor: number;
  valorFinal?: number;
  observacao?: string;
  pagamentos: VendaPagamentoDto[];
  avalistasIds?: string[];
  retornoBancoId?: string;
  retornoNumero?: number;
  retornoValor?: number;
  retornoCreditarDia?: string;
  despesas?: VendaDespesaDto[];
}

export interface VendaDespesaDto {
  descricao: string;
  valorCusto: number;
  valorRecebido?: number;
  dataPagamento: string;
  fornecedorId?: string;
  tipo: string;
}

/**
 * DTO para uma forma de pagamento dentro do request de venda.
 */
export interface VendaPagamentoDto {
  formaPagamento: FormaPagamento;
  descricao?: string;
  valor: number;
  vencimento?: string;
  tipo?: string; // 'R' (padrão) ou 'D'
}

/**
 * DTO de resposta contendo os dados completos de uma venda.
 */
export interface VendaResponseDto {
  vendaId: string;
  storeId: string;
  storeName?: string;
  vehicleId: string;
  buyerPersonId: string;
  sellerPersonId?: string;
  nfeId?: string;
  nfeStatus?: string;
  numero?: number;
  dataVenda: string;
  valor: number;
  valorFinal?: number;
  observacao?: string;
  vendaStatus: VendaStatus;
  pagamentos: PagamentoResponse[];
  avalistasIds?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  buyerName?: string;
  vehicleDescription?: string;
  retornoBancoId?: string;
  retornoNumero?: number;
  retornoValor?: number;
  retornoCreditarDia?: string;
  despesas?: VendaDespesaResponse[];
}

export interface VendaDespesaResponse {
  vendaDespesaId: string;
  descricao: string;
  valorCusto: number;
  valorRecebido?: number;
  dataPagamento: string;
  fornecedorId?: string;
  tipo: string;
}

/**
 * Representação resumida de um pagamento na resposta da venda.
 */
export interface PagamentoResponse {
  vendaPagamentoId: string;
  formaPagamento: FormaPagamento;
  descricao?: string;
  valor: number;
  vencimento?: string;
  tipo: string;
}
