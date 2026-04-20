export const formatCurrency = (num: number | null | undefined): string => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
  }).format(num);
};

export const getNextMonthStr = (currentMonthStr: string): string => {
  const [year, month] = currentMonthStr.split('-').map(Number);
  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear++;
  }
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
};

export const getCurrentMonthStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
