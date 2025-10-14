export interface Nfe {
  nfeId?: string;
  storeId: string; // Emitente
  personId: string; // Destinatário
  nfeTipoDocumento: string; // "0" entrada, "1" saída
  nfeNaturezaOperacao: NaturezaOperacao; // Ex: "Compra", "Venda", "Remessa", "Devolução" ...
  nfeItens: nfeItem[];
  vehicleId?: string; // Se houver apenas um veículo na NFe, para facilitar buscas

  chaveAcesso?: string;
  nfeNumero?: number;
  nfeSerie?: string;
  nfeDataEmissao?: string;
  valorTotal?: number;
  status?: string; // Exemplo: 'Autorizada', 'Cancelada', etc.
}

export enum NaturezaOperacao {
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

export interface nfeItem {
  vehicleId?: string; // Se informado, usa dados do veículo cadastrado

  // Preencher os campos do item se vehicleId não for informado
  itemCodigoProduto?: string;
  itemCodigoEan?: string;
  itemCodigoEanTributavel?: string;
  itemDescricao?: string;
  itemCodigoNcm?: string;
  itemCodigoExTipi?: string;
  itemCest?: string;
  itemCfop?: string;
  itemUnidadeComercial?: string;
  itemQuantidadeComercial?: string;
  itemValorUnitarioComercial?: string;
  itemValorBruto?: string;
  itemUnidadeTributavel?: string;
  itemQuantidadeTributavel?: string;
  itemValorUnitarioTributavel?: string;
  itemValorFrete?: string;
  itemValorSeguro?: string;
  itemValorDesconto?: string;
  itemValorOutrasDespesas?: string;
  itemOrigemMercadoria?: string;
  itemIncluiNoTotal?: string;
  itemIcms?: Icms;
  itemIpi?: Ipi;
  itemPis?: Pis;
  itemCofins?: Cofins;
  itemNumeroFci?: string;
  itemInformacoesAdicionais?: string;
  itemNumeroPedidoCompra?: string;
  itemItemPedidoCompra?: string;
  itemNumeroLote?: string;
  itemQuantidadeLote?: string;
  itemDataFabricacao?: string;
  itemDataValidade?: string;
}

export interface Icms {
  icmsSituacaoTributaria: string;
  icmsOrigem: string;
  icmsModalidadeBaseCalculo: string;
  icmsValorBaseCalculo: string;
  icmsAliquota: string;
  icmsValor: string;
  icmsModalidadeBaseCalculoSt: string;
  icmsValorBaseCalculoSt: string;
  icmsAliquotaSt: string;
  icmsValorSt: string;
  icmsAliquotaFcp: string;
  icmsValorFcp: string;
  icmsPercentualReducao: string;
  icmsValorDesonerado: string;
  icmsMotivoDesoneracao: string;
}

export interface Ipi {
  ipiSituacaoTributaria: string;
  ipiCodigoEnquadramento: string;
  ipiValorBaseCalculo: string;
  ipiAliquota: string;
  ipiValor: string;
}

export interface Pis {
  pisSituacaoTributaria: string;
  pisValorBaseCalculo: string;
  pisAliquota: string;
  pisValor: string;
}

export interface Cofins {
  cofinsSituacaoTributaria: string;
  cofinsValorBaseCalculo: string;
  cofinsAliquota: string;
  cofinsValor: string;
}
