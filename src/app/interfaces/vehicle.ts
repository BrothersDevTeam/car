import { FuelTypes } from '../enums/fuelTypes';
import { VehicleCategory } from '../enums/vehicleCategoryTypes';
import { VehicleSpecies } from '../enums/vehicleSpeciesTypes';
import { VehicleType } from '../enums/vehicleType';
import { Person } from './person';

/**
 * Interfaces de Resumo para otimização de payload (T-8)
 */
export interface PersonSummary {
  personId: string;
  name: string;
  nickName?: string;
  email?: string;
  phone?: string;
  relationship: string;
  legalEntity: boolean;
}

export interface NfeSummary {
  nfeId: string;
  nfeNumero?: number;
  nfeSerie?: string;
  nfeNaturezaOperacao?: string;
  nfeDataEmissao?: string;
  nfeStatus?: string;
  nfeChave?: string;
  nfeXmlUrl?: string;
  nfeDanfeUrl?: string;
  nfeValorTotal?: string;
}

export interface VendaSummary {
  vendaId: string;
  numero?: number;
  dataVenda?: string;
  valorFinal?: number;
  vendaStatus?: string;
  buyerName?: string;
}

/**
 * Interface para Vehicle retornado do backend (Completo)
 */
export interface Vehicle {
  storeId?: string;
  vehicleId?: string;
  owner?: Person;
  plate: string;
  brand: string;
  model: string;
  vehicleYear: string;
  modelYear?: string;
  color: string;
  chassis: string;
  renavam: string;
  doors: string;
  horsepower: string;
  engineDisplacement: string;
  engineNumber: string;
  km: string;
  vehicleType: string;
  species?: string;
  category?: string;
  features?: string;
  fuelTypes: FuelTypes[];
  origin?: string;
  valorCompra?: string;
  valorVenda?: string;
  observation?: string;
  entryDate?: string;
  exitDate?: string;
  status?: string;
  nfeHistory?: NfeSummary[];
  salesHistory?: VendaSummary[];
}

/**
 * Interface para listagem otimizada de veículos
 */
export interface VehicleList {
  vehicleId: string;
  storeId: string;
  plate: string;
  brand: string;
  model: string;
  vehicleYear: string;
  modelYear?: string;
  color: string;
  km: string;
  vehicleType: string;
  valorVenda?: string;
  entryDate?: string;
  exitDate?: string;
  status: string;
  owner?: PersonSummary;
  nfeHistory?: NfeSummary[];
  salesHistory?: VendaSummary[];
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

export const SPECIES_OPTIONS = [
  { label: 'Passageiro', value: VehicleSpecies.PASSAGEIRO },
  { label: 'Carga', value: VehicleSpecies.CARGA },
  { label: 'Misto', value: VehicleSpecies.MISTO },
  { label: 'Tração', value: VehicleSpecies.TRACAO },
  { label: 'Especial', value: VehicleSpecies.ESPECIAL },
  { label: 'Coleção', value: VehicleSpecies.COLECAO },
];

export const VEHICLE_TYPE_OPTIONS = [
  { label: 'Automóvel', value: VehicleType.AUTOMOVEL },
  { label: 'Motocicleta', value: VehicleType.MOTOCICLETA },
  { label: 'Caminhonete (Carga, ex: Hilux)', value: VehicleType.CAMINHONETE },
  { label: 'Camioneta (Misto, ex: SW4, SUV)', value: VehicleType.CAMIONETA },
  { label: 'Caminhão', value: VehicleType.CAMINHAO },
  { label: 'Ônibus', value: VehicleType.ONIBUS },
  { label: 'Reboque / Carretinha', value: VehicleType.REBOQUE },
];

export const CATEGORY_OPTIONS = [
  { label: 'Particular', value: VehicleCategory.PARTICULAR },
  { label: 'Aluguel (Comercial)', value: VehicleCategory.ALUGUEL },
  { label: 'Oficial', value: VehicleCategory.OFICIAL },
  { label: 'Aprendizagem (Autoescola)', value: VehicleCategory.APRENDIZAGEM },
  { label: 'Diplomático', value: VehicleCategory.DIPLOMATICO },
];
