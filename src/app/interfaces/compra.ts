export interface CompraPagamento {
  formaPagamento: string;
  descricao?: string;
  valor: number;
  vencimento: string | Date;
  tipo?: string;
}

export interface Compra {
  compraId?: string;
  storeId: string;
  vehicleId: string;
  vehiclePlate?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  supplierId: string;
  supplierName?: string;
  dataCompra: string | Date;
  valorCompra: number;
  observacao?: string;
  tipoEntrada?: string;
  nfeId?: string;
  nfeStatus?: string;
  nfeDanfeUrl?: string;
  pagamentos: CompraPagamento[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}
