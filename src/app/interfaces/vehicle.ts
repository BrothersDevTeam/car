export interface GenericVehicle {
  plate: string;
  brand: string;
  model: string;
  year: string;
  color: string;
  active: boolean;
  imported: boolean;
}

export interface Vehicle {
  id: string;
  vehicle: GenericVehicle;
}
