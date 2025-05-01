export interface Vehicle {
  id?: string;
  licensePlate: string;
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
  origin?: string;
  modelDto?: Model;
  colorDto?: Color;
  fuelTypeDto?: FuelType;
}
export type CreateVehicle = Omit<Vehicle, 'id'>;

export type VehicleForm = Omit<Vehicle, 'modelDto'> & {
  modelDto?: {
    id: string;
    description: string;
  };
  brandDto?: {
    id: string;
    description: string;
  };
};

export interface Brand {
  id: string;
  description: string;
}
export type CreateBrand = Omit<Brand, 'id'>;

export interface Model {
  id: string;
  description: string;
  brandDto: Brand;
}
export type CreateModel = Omit<Model, 'id'> & {
  brandId: string;
};

export interface FuelType {
  id: string;
  description: string;
}
export type CreateFuelType = Omit<FuelType, 'id'>;

export interface Color {
  id: string;
  description: string;
}
export type CreateColor = Omit<Color, 'id'>;

export type GetVehicle = Omit<Vehicle, 'modelDto' | 'brandDto'> & {
  modelDto: {
    id: string;
    description: string;
    brandDto: { id: string; description: string };
  };
  fuelTypeDto: { id: string; description: string };
  colorDto: { id: string; description: string };
};
