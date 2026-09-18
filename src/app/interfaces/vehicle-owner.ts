export interface VehicleOwner {
  vehicleOwnerId: string;
  vehicleId: string;
  personId: string;
  personName?: string;
  personCpfCnpj?: string;
  personPhone?: string;
  personEmail?: string;
  isCurrentOwner: boolean;
  observation?: string;
  createdAt?: string;
}

export interface VehicleOwnerPayload {
  personId: string;
  isCurrentOwner?: boolean;
  observation?: string;
}
