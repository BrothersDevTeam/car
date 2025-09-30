import { Person } from './person';

export interface Vehicle {
  storeId?: string;
  vehicleId?: string;
  owner?: Person;
  plate: string;
  brand: string;
  model: string;
  year: string;
  modelYear?: string;
  color: string;
  chassis: string;
  renavam: string;
  doors: string;
  horsepower: string;
  engineNumber: string;
  km: string;
  vehicleType: string;
  age: string;
  features?: string;
  fuelTypes: string[];
  origin?: string;
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
