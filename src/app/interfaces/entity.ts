export interface Entity {
  id: number;
  address: Address;
  contact: Contact;
  active: boolean;
}

export interface Address {
  id: number;
  street: string;
  city: string;
  number: string;
  complement: string;
  state: string;
  zipcode: string;
  neighborhood: string;
}

export interface Contact {
  id: number;
  email: string;
  phone: string;
}

export interface Person {
  id: number;
  person: Entity;
}
