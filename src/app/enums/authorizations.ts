export enum Authorizations {
  ROOT_ADMIN = 'root:admin',

  // STORE
  READ_STORE_SELF = 'read:store:self',
  READ_STORE_NETWORK = 'read:store:network',
  EDIT_STORE_SELF = 'edit:store:self',
  EDIT_STORE_NETWORK = 'edit:store:network',

  // USER
  READ_USER_SELF = 'read:user:self',
  READ_USER_STORE = 'read:user:store',
  READ_USER_NETWORK = 'read:user:network',
  CREATE_USER_STORE = 'create:user:store',
  CREATE_USER_NETWORK = 'create:user:network',
  EDIT_USER_SELF = 'edit:user:self',
  EDIT_USER_STORE = 'edit:user:store',
  EDIT_USER_NETWORK = 'edit:user:network',
  DELETE_USER_STORE = 'delete:user:store',
  DELETE_USER_NETWORK = 'delete:user:network',
  EDIT_MANAGER_AUTH = 'edit:manager:auth',
  EDIT_SELLER_AUTH = 'edit:seller:auth',

  // PERSON
  READ_PERSON_SELF = 'read:person:self',
  READ_PERSON_STORE = 'read:person:store',
  READ_PERSON_NETWORK = 'read:person:network',
  CREATE_PERSON_STORE = 'create:person:store',
  CREATE_PERSON_NETWORK = 'create:person:network',
  EDIT_PERSON_SELF = 'edit:person:self',
  EDIT_PERSON_STORE = 'edit:person:store',
  EDIT_PERSON_NETWORK = 'edit:person:network',
  DELETE_PERSON_STORE = 'delete:person:store',
  DELETE_PERSON_NETWORK = 'delete:person:network',

  // VEHICLE
  READ_VEHICLE_STORE = 'read:vehicle:store',
  READ_VEHICLE_NETWORK = 'read:vehicle:network',
  CREATE_VEHICLE_STORE = 'create:vehicle:store',
  CREATE_VEHICLE_NETWORK = 'create:vehicle:network',
  EDIT_VEHICLE_STORE = 'edit:vehicle:store',
  EDIT_VEHICLE_NETWORK = 'edit:vehicle:network',
  DELETE_VEHICLE_STORE = 'delete:vehicle:store',
  DELETE_VEHICLE_NETWORK = 'delete:vehicle:network',
  READ_VEHICLE_PURCHASE_PRICE = 'read:vehicle:purchase_price',
  READ_VEHICLE_PROFIT = 'read:vehicle:profit',

  // NFE
  READ_NFE_STORE = 'read:nfe:store',
  READ_NFE_NETWORK = 'read:nfe:network',
  CREATE_NFE_STORE = 'create:nfe:store',
  CREATE_NFE_NETWORK = 'create:nfe:network',
  EMITIR_NFE_STORE = 'emitir:nfe:store',
  EMITIR_NFE_NETWORK = 'emitir:nfe:network',
  EDIT_NFE_NETWORK = 'edit:nfe:network',
  CANCEL_NFE_STORE = 'cancel:nfe:store',
  CANCEL_NFE_NETWORK = 'cancel:nfe:network',

  // COMPRA
  READ_COMPRA_STORE = 'read:compra:store',
  READ_COMPRA_NETWORK = 'read:compra:network',
  CREATE_COMPRA_STORE = 'create:compra:store',
  CREATE_COMPRA_NETWORK = 'create:compra:network',
  EDIT_COMPRA_STORE = 'edit:compra:store',
  EDIT_COMPRA_NETWORK = 'edit:compra:network',
  CANCEL_COMPRA_STORE = 'cancel:compra:store',
  CANCEL_COMPRA_NETWORK = 'cancel:compra:network',

  // VENDA
  READ_VENDA_STORE = 'read:venda:store',
  READ_VENDA_NETWORK = 'read:venda:network',
  CREATE_VENDA_STORE = 'create:venda:store',
  CREATE_VENDA_NETWORK = 'create:venda:network',
  EDIT_VENDA_STORE = 'edit:venda:store',
  EDIT_VENDA_NETWORK = 'edit:venda:network',
  CANCEL_VENDA_STORE = 'cancel:venda:store',
  CANCEL_VENDA_NETWORK = 'cancel:venda:network',

  // INTEGRATIONS
  SYNC_FOCUSNFE = 'focusnfe:sync',

  // FINANCIAL
  READ_FINANCIAL_STORE = 'read:financial:store',
  READ_FINANCIAL_NETWORK = 'read:financial:network',
  CREATE_FINANCIAL_STORE = 'create:financial:store',
  CREATE_FINANCIAL_NETWORK = 'create:financial:network',
  EDIT_FINANCIAL_STORE = 'edit:financial:store',
  EDIT_FINANCIAL_NETWORK = 'edit:financial:network',
  DELETE_FINANCIAL_STORE = 'delete:financial:store',
  DELETE_FINANCIAL_NETWORK = 'delete:financial:network',

  // DASHBOARD
  READ_DASHBOARD_STORE = 'read:dashboard:store',
  READ_DASHBOARD_NETWORK = 'read:dashboard:network',
}
