export interface CreateNaturalPerson {
  fullName: String;
  tradeName: String;
  cpf: String;
  address?: Address;
  contact?: Contact;
}

export interface CreateLegalEntity {
  fullName: String;
  tradeName: String;
  cnpj: String;
  ie: String;
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
  id: number;
  person: CreateNaturalPerson | CreateLegalEntity;
}
