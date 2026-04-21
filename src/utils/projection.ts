import type {Allocation} from '../types';

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

export type ProjectionPoint = {month: number; balance: number};

export function buildProjectionSeries(
  baseBalance: number,
  savingsRate: number,
  months = 24,
): ProjectionPoint[] {
  const series: ProjectionPoint[] = [];
  for (let m = 0; m <= months; m++) {
    series.push({month: m, balance: baseBalance + savingsRate * m});
  }
  return series;
}
