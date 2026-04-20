export type CategoryType = 'income' | 'expense';

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  order: number;
  defaultAmount?: number;
};

export type FinanceRecord = {
  id: string;
  month: string;
  values: Record<string, number>;
};

export type Settings = {
  baseInitialBalance: number;
};

export type ComputedRow = FinanceRecord & {
  initialBalance: number;
  totalIncome: number;
  totalExpense: number;
  netValue: number;
  finalBalance: number;
};
