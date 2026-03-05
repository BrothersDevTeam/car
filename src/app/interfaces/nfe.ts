export interface NfeEmitente {
  emitenteCnpj?: string;
  emitenteCpf?: string;
  emitenteRazaoSocial?: string;
  emitenteNomeFantasia?: string;
  emitenteLogradouro?: string;
  emitenteNumero?: string;
  emitenteComplemento?: string;
  emitenteBairro?: string;
  emitenteCodigoMunicipio?: string;
  emitenteMunicipio?: string;
  emitenteUf?: string;
  emitenteCep?: string;
  emitentePais?: string;
  emitenteTelefone?: string;
  emitenteInscricaoEstadual?: string;
  emitenteRegimeTributario?: string; // '1' Simples, '2' Simples excesso, '3' Normal
}

export interface NfeDestinatario {
  destinatarioCpf?: string;
  destinatarioCnpj?: string;
  destinatarioIdEstrangeiro?: string;
  destinatarioNome?: string;
  destinatarioLogradouro?: string;
  destinatarioNumero?: string;
  destinatarioComplemento?: string;
  destinatarioBairro?: string;
  destinatarioCodigoMunicipio?: string;
  destinatarioMunicipio?: string;
  destinatarioUf?: string;
  destinatarioCep?: string;
  destinatarioPais?: string;
  destinatarioTelefone?: string;
  destinatarioEmail?: string;
  destinatarioIe?: string;
  destinatarioIndicadorIe?: string;
}

export interface Nfe {
  nfeId?: string;
  storeId: string;              // Emitente (ID da loja)
  personId: string;             // Destinatário (ID da pessoa)
  nfeTipoDocumento: string;     // '0' entrada, '1' saída
  nfeNaturezaOperacao: NaturezaOperacao;
  nfeItens: nfeItem[];
  vehicleId?: string;           // ID do veículo do primeiro item

  // === Numeração ===
  nfeNumero?: number;
  nfeSerie?: string;

  // === Datas ===
  nfeDataEmissao?: string;
  createdAt?: string;           // Data de criação (auditoria)
  updatedAt?: string;           // Data de atualização (auditoria)

  // === Status e controle ===
  nfeStatus?: string;           // 'rascunho', 'processando', 'autorizado', 'cancelado', 'erro'
  nfeChave?: string;            // Chave de 44 dígitos da SEFAZ
  nfeMensagemErro?: string;     // Mensagem de erro da SEFAZ

  // === Partes da NFe ===
  nfeEmitente?: NfeEmitente;
  nfeDestinatario?: NfeDestinatario;

  // === Totalizadores ===
  valorTotal?: number;          // Mantido por compatibilidade
  nfeValorTotal?: string;
  nfeValorProdutos?: string;
  nfeValorFrete?: string;
  nfeValorSeguro?: string;
  nfeValorDesconto?: string;
  nfeValorOutrasDespesas?: string;

  // === Tributos ===
  nfeIcmsBaseCalculo?: string;
  nfeIcmsValorTotal?: string;
  nfeValorIpi?: string;
  nfeValorPis?: string;
  nfeValorCofins?: string;
  nfeValorTotalTributos?: string;
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
  vehicleId?: string;           // Se informado, usa dados do veículo cadastrado
  itemNumero?: number;          // Sequencial do item na NFe

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
