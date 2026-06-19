export type TransactionType = 'INCOME' | 'EXPENSE';
export type TransactionOrigin = 'MANUAL' | 'VEHICLE_SALE' | 'VEHICLE_PURCHASE';
export type TransactionStatus = 'PENDING' | 'PAID' | 'CANCELLED';

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
}

export interface FinancialSummary {
  totalPaidIncome: number;
  totalPaidExpense: number;
  currentBalance: number;
  pendingIncome: number;
  pendingExpense: number;
}
