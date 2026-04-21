export type CategoryType = 'income' | 'expense';

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  order: number;
  defaultAmount?: number;
  isGroup?: boolean;
};

export type GroupItem = {
  id: string;
  name: string;
  amount: number;
};

export type GroupValue = {
  total: number;
  items: GroupItem[];
};

export type RecordValue = number | GroupValue;

export type FinanceRecord = {
  id: string;
  month: string;
  values: Record<string, RecordValue>;
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

export type AllocationTargetMode = 'fixed' | 'percent';

export type Allocation = {
  id: string;
  name: string;
  targetMode: AllocationTargetMode;
  targetValue: number;
  order: number;
  archived: boolean;
  archivedAt?: number;
};
