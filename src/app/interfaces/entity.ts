export interface GenericClient {
  fullName: string;
  legalName: string;
  tradeName: string;
  cpf?: string;
  cnpj?: string;
  ie?: string;
  address?: Address;
  contact?: Contact;
  active: boolean;
}

export interface CreateNaturalPerson {
  fullName: string;
  cpf: string;
  address?: Address;
  contact?: Contact;
}

export interface CreateLegalEntity {
  legalName: string;
  tradeName: string;
  cnpj: string;
  ie: string;
  address?: Address;
  contact?: Contact;
}

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
