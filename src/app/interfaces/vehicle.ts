import { BrandStatus } from '../enums/brandStatus';
import { Person } from './person';

/**
 * Interface para Vehicle retornado do backend
 */
export interface Vehicle {
  storeId?: string;
  vehicleId?: string;
  owner?: Person;
  plate: string;
  brand: string; // String - nome da marca
  model: string; // String - nome do modelo
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
  category?: string;
  features?: string;
  fuelTypes: string[];
  origin?: string;
}

export type CreateVehicle = Omit<Vehicle, 'vehicleId'>;

/**
 * Interface para o formulário de Vehicle
 * Converte owner de Person para string (ID)
 */
export type VehicleForm = Omit<Vehicle, 'owner'> & {
  owner?: string; // ID da pessoa (opcional)
};

/**
 * Interface para Brand (marca de veículo)
 */
export interface Brand {
  brandId: string;
  storeId: string | null;
  name: string;
  description: string;
  originCountry: string;
  logoUrl: string;
  status: BrandStatus;
  isGlobal: boolean;
}
export type CreateBrand = Omit<Brand, 'brandId'>;

/**
 * Interface para Model (modelo de veículo)
 */
export interface Model {
  modelId: string;
  storeId: string | null;
  brandId: string;
  name: string;
  description: string;
  yearStart?: string;
  yearEnd?: string;
  category?: string;
  status: string;
  isGlobal: boolean;
}
export type CreateModel = Omit<Model, 'modelId'> & {
  brandId: string;
};

export interface FuelType {
  id: string;
  description: string;
}
export type CreateFuelType = Omit<FuelType, 'id'>;

/**
 * Interface para Color (cor de veículo)
 * Corresponde ao VehicleColorResponseDto do backend
 */
export interface Color {
  colorId: string;
  storeId?: string;
  isGlobal?: boolean;
  name: string;              // Nome da cor (campo principal)
  hexCode?: string;          // Código hexadecimal opcional
  description?: string;      // Descrição opcional
  status?: string;           // Status (ACTIVE/INACTIVE)
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * DTO para criar cor
 * Corresponde ao VehicleColorRecordDto do backend
 */
export interface CreateColor {
  storeId?: string;
  name: string;              // Nome obrigatório
  hexCode?: string;          // Código hex opcional
  description?: string;      // Descrição opcional
  status?: string;           // Status (default: ACTIVE)
  isGlobal?: boolean;        // Se é cor global
}

/**
 * DTO para atualizar cor
 */
export interface UpdateColor {
  colorId: string;
  name?: string;
  hexCode?: string;
  description?: string;
  status?: string;
  isGlobal?: boolean;
}
