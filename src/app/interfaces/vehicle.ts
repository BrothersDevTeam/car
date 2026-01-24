import { FuelTypes } from '../enums/fuelTypes';
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
  vehicleYear: string;
  modelYear?: string;
  color: string;
  chassis: string;
  renavam: string;
  doors: string;
  horsepower: string;
  engineNumber: string;
  km: string;
  vehicleType: string;
  species?: string;
  category?: string;
  features?: string;
  fuelTypes: FuelTypes[];
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
  isGlobal: boolean;
}

export type CreateBrand = Omit<Brand, 'brandId'>;

/**
 * Interface para Model (modelo de veículo)
 */
export interface Model {
  brandId: string;
  isGlobal: boolean;
  name: string;
  status: string;
  storeId: string | null;
  modelId: string;
}

export type CreateModel = Omit<Model, 'modelId'> & {
  brandId: string;
};

/**
 * Interface para Color (cor de veículo)
 * Corresponde ao VehicleColorResponseDto do backend
 */
export interface Color {
  colorId: string;
  storeId?: string;
  isGlobal?: boolean;
  name: string; // Nome da cor (campo principal)
  status?: string; // Status (ACTIVE/INACTIVE)
}

/**
 * DTO para criar cor
 * Corresponde ao VehicleColorRecordDto do backend
 */
export interface CreateColor {
  storeId?: string;
  name: string; // Nome obrigatório
  status?: string; // Status (default: ACTIVE)
  isGlobal?: boolean; // Se é cor global
}

/**
 * DTO para atualizar cor
 */
export interface UpdateColor {
  colorId: string;
  name?: string;
  status?: string;
  isGlobal?: boolean;
}
