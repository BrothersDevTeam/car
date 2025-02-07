export interface ReqPerson {
  fullName: String;
  tradeName: String;
  cpf: String;
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
  person: ReqPerson;
}
