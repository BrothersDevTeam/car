export interface GenericClient {
  id: string;
  fullName: string;
  legalName: string;
  tradeName: string;
  cpf?: string;
  cnpj?: string;
  ie?: string;
  crt?: string;
  address?: Address;
  contact?: Contact;
  active: boolean;
}

export type CreateNaturalPerson = Omit<
  GenericClient,
  'id' | 'legalName' | 'tradeName' | 'cnpj' | 'ie' | 'crt'
>;

export type CreateLegalEntity = Omit<GenericClient, 'id' | 'fullName' | 'cpf'>;

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

export interface Person {
  id: string;
  person: GenericClient;
}
