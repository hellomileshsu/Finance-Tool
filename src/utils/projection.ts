import type {Allocation, ComputedRow} from '../types';
import {getNextMonthStr} from './format';

export type AllocationForecast = {
  id: string;
  name: string;
  goalAmount: number;
  cumulativeGoal: number;
  currentAmount: number;
  progressRatio: number;
  monthsToGoal: number | null;
};

export function computeForecasts(
  activeAllocations: Allocation[],
  baseBalance: number,
  savingsRate: number,
): AllocationForecast[] {
  const withGoal = activeAllocations.filter(
    (a) => typeof a.goalAmount === 'number' && a.goalAmount > 0,
  );
  let cumulative = 0;
  return withGoal.map((a) => {
    const goalAmount = a.goalAmount as number;
    cumulative += goalAmount;
    const currentAmount =
      a.targetMode === 'fixed'
        ? a.targetValue
        : (a.targetValue / 100) * baseBalance;
    const progressRatio =
      goalAmount > 0
        ? Math.max(0, Math.min(1, currentAmount / goalAmount))
        : 0;

    let monthsToGoal: number | null;
    if (baseBalance >= cumulative) {
      monthsToGoal = 0;
    } else if (savingsRate > 0) {
      monthsToGoal = Math.ceil((cumulative - baseBalance) / savingsRate);
    } else {
      monthsToGoal = null;
    }

    return {
      id: a.id,
      name: a.name,
      goalAmount,
      cumulativeGoal: cumulative,
      currentAmount,
      progressRatio,
      monthsToGoal,
    };
  });
}

export function deriveSavingsRate(
  computedData: ComputedRow[],
  windowMonths = 6,
): {rate: number; sampleSize: number} {
  if (computedData.length === 0) return {rate: 0, sampleSize: 0};
  const sorted = [...computedData].sort((a, b) =>
    a.month.localeCompare(b.month),
  );
  const window = sorted.slice(-windowMonths);
  const sum = window.reduce((s, r) => s + r.netValue, 0);
  return {rate: sum / window.length, sampleSize: window.length};
}

export type TimelinePoint = {
  month: string;
  actualBalance?: number;
  projectedBalance?: number;
};

export function buildTimelinePoints(
  computedData: ComputedRow[],
  savingsRate: number,
  futureMonths = 24,
): TimelinePoint[] {
  if (computedData.length === 0) return [];
  const sorted = [...computedData].sort((a, b) =>
    a.month.localeCompare(b.month),
  );

  const points: TimelinePoint[] = sorted.map((r) => ({
    month: r.month,
    actualBalance: r.finalBalance,
  }));

  const anchor = sorted[sorted.length - 1];
  points[points.length - 1].projectedBalance = anchor.finalBalance;

  let cursor = anchor.month;
  for (let m = 1; m <= futureMonths; m++) {
    cursor = getNextMonthStr(cursor);
    points.push({
      month: cursor,
      projectedBalance: anchor.finalBalance + savingsRate * m,
    });
  }
  return points;
}
