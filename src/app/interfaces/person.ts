import { RelationshipTypes } from '../enums/relationshipTypes';

// Interface para Role do usuário
export interface Role {
  roleId: string;
  roleName: string;
}

// Interface para User associado à Person
export interface User {
  userId: string;
  username: string;
  roles: Role[];
  userStatus?: string;
  imageUrl?: string;
}

export interface Person {
  personId: string;
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
  username?: string;
  password?: string;
  roleName?: string;
  user?: User; // User associado (para funcionários)
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
