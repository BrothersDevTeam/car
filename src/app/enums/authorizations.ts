/**
 * Catálogo centralizado de todas as permissões (authorizations) do sistema CAR.
 * Este enum reflete exatamente as chaves de autorização mapeadas e utilizadas pela API.
 */
export enum Authorizations {
  // ─────────────────────────────────────────────────
  // SUPER PERMISSÃO (apenas do administrador raiz do sistema)
  // ─────────────────────────────────────────────────

  /** Acesso irrestrito ao sistema. Exclusivo do CAR_ADMIN. */
  ROOT_ADMIN = 'root:admin',

  // ─────────────────────────────────────────────────
  // STORE – Gerenciamento de Lojas
  // ─────────────────────────────────────────────────

  /** Visualizar dados da loja. */
  READ_STORE = 'read:store',

  /** Visualizar dados das lojas da rede. */
  READ_STORE_OTHERS = 'read:store:others',

  /** Criar e editar lojas, filiais, endereços e proprietário. */
  EDIT_STORE = 'edit:store',

  // ─────────────────────────────────────────────────
  // USER – Gerenciamento de Usuários
  // ─────────────────────────────────────────────────

  /** Visualizar o próprio usuário. */
  READ_USER = 'read:user',

  /** Visualizar usuários de outros da mesma loja. */
  READ_USER_OTHERS = 'read:user:others',

  /** Criar novos usuários na loja. */
  CREATE_USER = 'create:user',

  /** Editar o próprio usuário (ex: senha, imagem). */
  EDIT_USER = 'edit:user',

  /** Editar usuários de outros da mesma loja. */
  EDIT_USER_OTHERS = 'edit:user:others',

  /** Excluir usuários da loja. */
  DELETE_USER = 'delete:user',

  // ─────────────────────────────────────────────────
  // PERSON – Gerenciamento de Clientes / Funcionários
  // ─────────────────────────────────────────────────

  /** Visualizar o próprio registro de pessoa. */
  READ_PERSON = 'read:person',

  /** Visualizar registros de outras pessoas da loja. */
  READ_PERSON_OTHERS = 'read:person:others',

  /** Criar novos registros de pessoa (cliente, funcionário). */
  CREATE_PERSON = 'create:person',

  /** Editar registros de pessoa. */
  EDIT_PERSON = 'edit:person',

  /** Excluir registros de pessoa. */
  DELETE_PERSON = 'delete:person',

  // ─────────────────────────────────────────────────
  // VEHICLE – Gerenciamento de Veículos
  // ─────────────────────────────────────────────────

  /** Visualizar veículos do estoque. */
  READ_VEHICLE = 'read:vehicle',

  /** Criar veículos no estoque. */
  CREATE_VEHICLE = 'create:vehicle',

  /** Editar veículos do estoque. */
  EDIT_VEHICLE = 'edit:vehicle',

  /** Excluir veículos do estoque. */
  DELETE_VEHICLE = 'delete:vehicle',

  /** Visualizar o valor de compra dos veículos. */
  READ_VEHICLE_PURCHASE_PRICE = 'read:vehicle:purchase_price',

  /** Visualizar o lucro e margem de vendas dos veículos. */
  READ_VEHICLE_PROFIT = 'read:vehicle:profit',

  // ─────────────────────────────────────────────────
  // NFE – Gerenciamento de Notas Fiscais
  // ─────────────────────────────────────────────────

  /** Visualizar Notas Fiscais. */
  READ_NFE = 'read:nfe',

  /** Criar Notas Fiscais. */
  CREATE_NFE = 'create:nfe',

  /** Emitir Notas Fiscais (entrada e saída). */
  EMITIR_NFE = 'emitir:nfe',

  /** Cancelar Notas Fiscais. */
  CANCEL_NFE = 'cancelar:nfe',

  // ─────────────────────────────────────────────────
  // VENDA – Módulo de Vendas de Veículos
  // ─────────────────────────────────────────────────

  /** Visualizar vendas registradas na loja. */
  READ_VENDA = 'read:venda',

  /** Registrar uma nova venda de veículo. */
  CREATE_VENDA = 'create:venda',

  /** Editar dados de uma venda existente. */
  EDIT_VENDA = 'edit:venda',

  /** Cancelar uma venda registrada. */
  CANCEL_VENDA = 'cancel:venda',

  // ─────────────────────────────────────────────────
  // INTEGRATIONS – Integrações da Loja
  // ─────────────────────────────────────────────────

  /** Sincronizar dados fiscais e cadastrais com a Focus NFe. */
  SYNC_FOCUSNFE = 'focusnfe:sync',
}

/**
 * Array com todas as chaves de autorização para facilitar iterações caso necessário (ex: select boxes ou tabelas)
 */
export const AUTHORIZATIONS_LIST = Object.values(Authorizations);
