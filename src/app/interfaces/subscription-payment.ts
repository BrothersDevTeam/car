export interface SubscriptionPayment {
  paymentId: string;
  storeId: string;
  amount: number;
  paymentDate: string;
  previousDueDate?: string;
  newDueDate: string;
  paymentMethod: string;
  note: string;
  registeredBy: string;
  createdAt: string;
}

export interface StoreManualPaymentRequest {
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  extensionDays?: number;
  customDueDate?: string;
  note: string;
}
