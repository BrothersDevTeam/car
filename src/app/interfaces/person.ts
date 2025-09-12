// export interface GenericClient {
//   id: string;
//   fullName: string;
//   legalName: string;
//   tradeName: string;
//   cpf?: string;
//   cnpj?: string;
//   ie?: string;
//   crt?: string;
//   address?: Address;
//   contact?: Contact;
//   active: boolean;
// }

export interface Person {
  personId?: string;
  storeId: string;
  name: string;
  nickName?: string;
  email?: string;
  phone?: string;
  legalEntity: Boolean;
  cpf: string;
  cnpj: string;
  rg?: string;
  rgIssuer?: string;
  ie?: string;
  crc?: string;
  active: boolean;
  relationshipTypes: RelationshipTypes[];
}

export type CreateNaturalPerson = Omit<
  Person,
  'personId' | 'cnpj' | 'ie' | 'crt'
>;

export type CreateLegalEntity = Omit<
  Person,
  'personId' | 'cpf' | 'rg' | 'rgIssuer'
>;

export interface Address {
  street: string;
  city: string;
  number: string;
  complement: string;
  state: string;
  zipcode: string;
  neighborhood: string;
}

export interface Contact {
  email: string;
  phone: string;
}

export enum RelationshipTypes {
  FUNCIONARIO = 'FUNCIONARIO',
  CLIENTE = 'CLIENTE',
  CONTADOR = 'CONTADOR',
  FORNECEDOR  = 'FORNECEDOR',
}
