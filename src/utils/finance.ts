import type {GroupItem, GroupValue, RecordValue} from '../types';

export const isGroupValue = (v: unknown): v is GroupValue =>
  typeof v === 'object' &&
  v !== null &&
  'total' in v &&
  'items' in v &&
  Array.isArray((v as GroupValue).items);

export const getAmount = (v: RecordValue | undefined): number => {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return v.total || 0;
};

export const getItems = (v: RecordValue | undefined): GroupItem[] =>
  isGroupValue(v) ? v.items : [];

export const sumItems = (items: GroupItem[]): number =>
  items.reduce((s, it) => s + (Number(it.amount) || 0), 0);

export const newItemId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};
