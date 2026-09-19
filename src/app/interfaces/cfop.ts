export interface Cfop {
  cfopId?: string;
  cfopCodigo: string;
  cfopDescricao: string;
  cfopTipoOperacao: 'E' | 'S' | string;
  cfopLocalDestino?: string;
  cfopAtivo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CfopSearchFilters {
  codigo?: string;
  descricao?: string;
  tipoOperacao?: 'E' | 'S' | string;
  localDestino?: string;
  ativo?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}
