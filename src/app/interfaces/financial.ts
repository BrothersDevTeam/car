import { ICostCenter } from './cost-center';

export type TransactionType = 'INCOME' | 'EXPENSE';
export type TransactionOrigin = 'MANUAL' | 'VEHICLE_SALE' | 'VEHICLE_PURCHASE';
export type TransactionStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'PARTIALLY_PAID';
export type PaymentMethod = 'CASH' | 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER';

export interface FinancialTransactionPayment {
  paymentId: string;
  amountPaid: number;
  discountAmount: number;
  interestAmount: number;
  penaltyAmount: number;
  paymentDate: string; // LocalDateTime
  paymentMethod: PaymentMethod;
  createdBy: string;
  createdAt: string;
}

export interface FinancialTransactionPaymentRequest {
  amountPaid: number;
  discountAmount: number;
  interestAmount: number;
  penaltyAmount: number;
  paymentDate: string; // LocalDateTime (ISO String)
  paymentMethod: PaymentMethod;
}

export interface StoreSettings {
  storeSettingsId?: string;
  storeId: string;
  penaltyPercentage: number;
  interestPercentageMonthly: number;
}

export interface FinancialTransaction {
  financialTransactionId: string;
  storeId: string;
  amount: number;
  type: TransactionType;
  origin: TransactionOrigin;
  status: TransactionStatus;
  dueDate: string; // LocalDate (YYYY-MM-DD)
  paymentDate?: string; // LocalDateTime
  installmentNumber: number;
  totalInstallments: number;
  referenceId?: string;
  description?: string;
  costCenter?: ICostCenter;
  totalPaid: number;
  totalDiscount: number;
  totalInterest: number;
  totalPenalty: number;
  balanceDue: number;
  payments: FinancialTransactionPayment[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface FinancialTransactionRecord {
  amount: number;
  type: TransactionType;
  dueDate: string; // YYYY-MM-DD
  description: string;
  storeId: string;
  installments?: number;
  costCenterId?: string;
}

export interface FinancialSummary {
  totalPaidIncome: number;
  totalPaidExpense: number;
  currentBalance: number;
  pendingIncome: number;
  pendingExpense: number;
}
