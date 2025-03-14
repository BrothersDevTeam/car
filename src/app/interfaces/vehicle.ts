export interface Vehicle {
  id: string;
  licensePlate: string;
  brand: {
    id: string;
    name: string;
  };
  model: {
    id: string;
    name: string;
  };
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
