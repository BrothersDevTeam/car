/**
 * Status possíveis para uma venda de veículo.
 * Reflete o enum VendaStatus.java do Backend.
 */
export enum VendaStatus {
  /** Venda confirmada e vigente */
  ATIVA = 'ATIVA',
  /** Venda desfeita (veículo retorna ao estoque) */
  CANCELADA = 'CANCELADA',
  /** Venda realizada com transferência de veículo entre lojas */
  TRANSFERENCIA = 'TRANSFERENCIA',
}
