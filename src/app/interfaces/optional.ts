/**
 * Interface para Opcionais de Veículos
 * Corresponde ao OptionalResponseDto do backend
 */
export interface Optional {
  optionalId: string;
  storeId?: string;
  name: string;
  isGlobal: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}
