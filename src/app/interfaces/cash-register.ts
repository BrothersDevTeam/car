export interface ICashRegister {
  cashRegisterId: string;
  storeId: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface ICashRegisterRecord {
  name: string;
  storeId: string;
}

export interface ICashRegisterSession {
  cashRegisterSessionId: string;
  cashRegisterId: string;
  cashRegisterName: string;
  storeId: string;
  openedAt: string;
  closedAt?: string;
  openedBy: string;
  closedBy?: string;
  initialBalance: number;
  finalBalance?: number;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
}

export interface IOpenSessionRequest {
  cashRegisterId: string;
  initialBalance: number;
}

export interface ICashRegisterReport {
  initialBalance: number;
  totalIncome: number;
  totalExpense: number;
  projectedBalance: number;
  finalBalance: number;
  incomeByMethod: { [key: string]: number };
  expenseByMethod: { [key: string]: number };
}
