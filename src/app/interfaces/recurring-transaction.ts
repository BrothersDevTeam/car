import { IFinancialCategory } from './financial-category';

export interface IRecurringTransaction {
  recurringTransactionId: string;
  storeId: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  status: 'ACTIVE' | 'INACTIVE';
  startDate: string; // ISO Date String
  endDate?: string; // ISO Date String
  dueDay: number;
  nextGenerationDate: string; // ISO Date String
  financialCategory?: IFinancialCategory;
  description: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface IRecurringTransactionRecord {
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  dueDay: number;
  description: string;
  storeId: string;
  financialCategoryId?: string;
}
