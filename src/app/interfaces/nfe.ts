export interface Nfe {
  id: string;
  chaveAcesso: string;
  numero: number;
  serie: number;
  cfop: string;
  tipo: TipoNfe;
  dataEmissao: string;
  valorTotal: number;
  status: string; // Exemplo: 'Autorizada', 'Cancelada', etc.
  emitente: {
    cnpj: string;
    razaoSocial: string;
    nomeFantasia?: string;
  };
  idDestinatario: string;
  idVeiculo: string;
}

export interface createNfe {
  idVeiculo: string;
  idDestinatario: string;
  tipo: TipoNfe;
}

export enum TipoNfe {
  COMPRA_VEICULO_USADO = 'COMPRA DE VEICULO USADO',
  ENTRADA_CONSIGNACAO = 'ENTRADA EM CONSIGNAÇÃO',
  ENTRADA_COMPRA_DEFINITIVA = 'ENTRADA COMPRA DEFINITIVA',
  DEVOLUCAO_VENDA = 'DEVOLUÇÃO DE VENDA',

  VENDA_VEICULO_USADO = 'VENDA DE VEICULO USADO',
  DEVOLUCAO_CONSIGNACAO = 'DEVOLUÇÃO DE CONSIGNAÇÃO',
  VENDA_CONSIGNACAO = 'VENDA EM CONSIGNAÇÃO',
  DEVOLUCAO_SIMBOLICA_CONSIGNACAO = 'DEVOLUÇÃO SIMBÓLICA DE CONSIGNAÇÃO',
  DEVOLUCAO_COMPRA = 'DEVOLUÇÃO DE COMPRA',
  SAIDA_CONTRATO_COMISSAO = 'SAÍDA PARA CONTRATO EM COMISSÃO',
  TRANSFERENCIA_MERCADORIA = 'TRANSFERÊNCIA DE MERCADORIA ADQUIRIDA OU RECEBIDA DE TERCEIROS',
}
