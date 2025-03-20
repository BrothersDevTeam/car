export interface Vehicle {
  id: string;
  licensePlate: string;
  brand: string;
  model: string;
  yearModel?: string;
  chassis?: string;
  numberOfDoors?: 0;
  horsepower?: string;
  engineNumber?: string;
  initialMileage?: 0;
  renavam?: string;
  species?: string;
  category?: string;
  age?: 0;
  features?: string;
  color?: string;
  fuelType?: string;
  origin?: string;
}

export type CreateVehicle = Omit<Vehicle, 'id'>;

export type GetVehicle = Omit<Vehicle, 'model' | 'brand'> & {
  model: { id: string; description: string };
  brand: { id: string; description: string };
};
