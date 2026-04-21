import {useEffect, useMemo, useState} from 'react';
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Pencil,
  PiggyBank,
  Plus,
  Target,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type {
  Allocation,
  AllocationTargetMode,
  ComputedRow,
  Settings,
} from '../types';
import {formatCurrency} from '../utils/format';
import {buildProjectionSeries, computeForecasts} from '../utils/projection';

type Props = {
  allocations: Allocation[];
  computedData: ComputedRow[];
  settings: Settings;
  addAllocation: (
    name: string,
    targetMode: AllocationTargetMode,
    targetValue: number,
  ) => Promise<void>;
  updateAllocation: (
    id: string,
    patch: Partial<Omit<Allocation, 'id'>>,
  ) => Promise<void>;
  deleteAllocation: (id: string, name: string) => Promise<void>;
  archiveAllocation: (id: string, archive: boolean) => Promise<void>;
  reorderAllocations: (fromIdx: number, toIdx: number) => Promise<void>;
  updateSavingsRate: (val: number) => Promise<void>;
};

export function AllocationsView({
  allocations,
  computedData,
  settings,
  addAllocation,
  updateAllocation,
  deleteAllocation,
  archiveAllocation,
  reorderAllocations,
  updateSavingsRate,
}: Props) {
  const savingsRate = settings.monthlySavingsRate ?? 0;
  const monthOptions = useMemo(
    () =>
      [...computedData]
        .map((r) => r.month)
        .sort((a, b) => b.localeCompare(a)),
    [computedData],
  );

  const latestMonth = monthOptions[0] ?? '';
  const [selectedMonth, setSelectedMonth] = useState<string>(latestMonth);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (!monthOptions.includes(selectedMonth) && latestMonth) {
      setSelectedMonth(latestMonth);
    }
  }, [monthOptions, selectedMonth, latestMonth]);

  const baseRow = useMemo(
    () =>
      computedData.find((r) => r.month === selectedMonth) ??
      computedData[computedData.length - 1],
    [computedData, selectedMonth],
  );
  const baseBalance = baseRow?.finalBalance ?? 0;

  const activeAllocations = useMemo(
    () => allocations.filter((a) => !a.archived),
    [allocations],
  );
  const archivedAllocations = useMemo(
    () =>
      allocations
        .filter((a) => a.archived)
        .sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0)),
    [allocations],
  );

  const resolvedActive = useMemo(
    () =>
      activeAllocations.map((a) => ({
        ...a,
        resolvedAmount:
          a.targetMode === 'fixed'
            ? a.targetValue
            : (a.targetValue / 100) * baseBalance,
      })),
    [activeAllocations, baseBalance],
  );

  const totalAllocated = resolvedActive.reduce(
    (s, a) => s + a.resolvedAmount,
    0,
  );
  const freeBalance = baseBalance - totalAllocated;

  const forecasts = useMemo(
    () => computeForecasts(activeAllocations, baseBalance, savingsRate),
    [activeAllocations, baseBalance, savingsRate],
  );
  const forecastById = useMemo(() => {
    const map = new Map<string, (typeof forecasts)[number]>();
    forecasts.forEach((f) => map.set(f.id, f));
    return map;
  }, [forecasts]);
  const projectionSeries = useMemo(
    () => buildProjectionSeries(baseBalance, savingsRate, 24),
    [baseBalance, savingsRate],
  );
  const maxGoal = forecasts.length
    ? forecasts[forecasts.length - 1].cumulativeGoal
    : 0;
  const projectionYMax = Math.max(
    projectionSeries[projectionSeries.length - 1]?.balance ?? baseBalance,
    maxGoal,
    baseBalance,
  );

  const handleAdd = async () => {
    const name = window.prompt('請輸入存款分類名稱（例如：緊急備用金）：');
    if (name === null) return;
    const trimmed = name.trim();
    if (trimmed === '') {
      alert('名稱不可為空。');
      return;
    }
    const isFixed = window.confirm(
      '目標為固定金額？\n  確定 = 固定金額\n  取消 = 百分比（基準餘額的 %）',
    );
    const mode: AllocationTargetMode = isFixed ? 'fixed' : 'percent';
    const label = isFixed ? '目標金額' : '目標百分比 (0~100)';
    const raw = window.prompt(`請輸入${label}：`);
    if (raw === null) return;
    const num = parseFloat(raw);
    if (!isFinite(num) || num < 0) {
      alert('數值無效。');
      return;
    }
    if (mode === 'percent' && num > 100) {
      alert('百分比請介於 0 到 100 之間。');
      return;
    }
    await addAllocation(trimmed, mode, num);
  };

  const handleRename = async (a: Allocation) => {
    const next = window.prompt('請輸入新的分類名稱：', a.name);
    if (next === null) return;
    const trimmed = next.trim();
    if (trimmed === '' || trimmed === a.name) return;
    await updateAllocation(a.id, {name: trimmed});
  };

  const handleToggleMode = async (a: Allocation) => {
    const next: AllocationTargetMode =
      a.targetMode === 'fixed' ? 'percent' : 'fixed';
    await updateAllocation(a.id, {targetMode: next});
  };

  const handleChangeValue = async (a: Allocation, raw: string) => {
    const num = parseFloat(raw);
    if (!isFinite(num) || num < 0) return;
    if (a.targetMode === 'percent' && num > 100) return;
    if (num === a.targetValue) return;
    await updateAllocation(a.id, {targetValue: num});
  };

  const handleChangeGoal = async (a: Allocation, raw: string) => {
    const trimmed = raw.trim();
    const num = trimmed === '' ? 0 : parseFloat(trimmed);
    if (!isFinite(num) || num < 0) return;
    if (num === (a.goalAmount ?? 0)) return;
    await updateAllocation(a.id, {goalAmount: num});
  };

  const handleChangeSavingsRate = async (raw: string) => {
    const trimmed = raw.trim();
    const num = trimmed === '' ? 0 : parseFloat(trimmed);
    if (!isFinite(num) || num < 0) return;
    if (num === savingsRate) return;
    await updateSavingsRate(num);
  };

  if (computedData.length === 0) {
    return (
      <div className="bg-[#18181b] rounded-xl shadow-xl border border-[#27272a] p-12 text-center">
        <PiggyBank size={40} className="mx-auto mb-4 text-zinc-700" />
        <p className="text-zinc-400 text-sm mb-1">尚無任何月份資料</p>
        <p className="text-zinc-600 font-mono text-xs">
          請先到「月度總覽表」新增月份以建立基準餘額
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6 content-start">
      <div className="col-span-12 bg-[#18181b] p-6 rounded-xl shadow-xl border border-[#27272a]">
        <div className="flex justify-between items-start gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <PiggyBank size={18} className="text-indigo-400" />
              存款分類規劃
            </h3>
            <p className="text-sm text-zinc-500">
              Snapshot basis · 以選定月份期末餘額為基準
            </p>
          </div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-[#09090b] border border-[#27272a] text-zinc-300 text-xs font-mono rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SummaryCell
            label="基準餘額"
            value={formatCurrency(baseBalance)}
            tone="neutral"
          />
          <SummaryCell
            label="已分配"
            value={formatCurrency(totalAllocated)}
            tone="allocated"
          />
          <SummaryCell
            label="活用餘額"
            value={formatCurrency(freeBalance)}
            tone={freeBalance < 0 ? 'negative' : 'positive'}
          />
        </div>

        <div className="mt-4 flex items-center flex-wrap gap-3 pt-4 border-t border-[#27272a]">
          <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            每月存款速率
          </label>
          <input
            type="number"
            defaultValue={savingsRate || ''}
            key={`savings-rate-${savingsRate}`}
            placeholder="0"
            onBlur={(e) => handleChangeSavingsRate(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter')
                (e.target as HTMLInputElement).blur();
            }}
            className="w-32 bg-[#09090b] border border-[#27272a] text-zinc-100 rounded px-2 py-1 text-sm text-right font-mono focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none"
          />
          <span className="text-[10px] font-mono text-zinc-600">
            用於推算各目標達成月份；空白視為 0
          </span>
        </div>
      </div>

      <div className="col-span-12 bg-[#18181b] p-6 rounded-xl shadow-xl border border-[#27272a]">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-400" />
              達成預測
            </h4>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              依 allocation 順序累積；未來 24 個月線性外推
            </p>
          </div>
        </div>

        {savingsRate <= 0 ? (
          <div className="text-center py-10 text-zinc-600 font-mono text-xs">
            [ 請先輸入每月存款速率 ]
          </div>
        ) : forecasts.length === 0 ? (
          <div className="text-center py-10 text-zinc-600 font-mono text-xs">
            [ 尚無設定目標（goal）的分類 ]
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={projectionSeries}
                margin={{top: 5, right: 80, bottom: 5, left: 20}}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#27272a"
                />
                <XAxis
                  dataKey="month"
                  stroke="#71717a"
                  fontSize={11}
                  tickMargin={8}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(m: number) => `+${m}m`}
                />
                <YAxis
                  stroke="#71717a"
                  fontSize={11}
                  tickFormatter={(val: number) => `¥${Math.round(val / 1000)}k`}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, Math.ceil(projectionYMax * 1.1)]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  labelFormatter={(m) => `第 ${m} 個月`}
                  formatter={(val: number) => [formatCurrency(val), '預估餘額']}
                />
                {forecasts.map((f) => (
                  <ReferenceLine
                    key={f.id}
                    y={f.cumulativeGoal}
                    stroke="#a78bfa"
                    strokeDasharray="4 4"
                    label={{
                      value: `${f.name}${
                        f.monthsToGoal === 0
                          ? ' · 已達成'
                          : f.monthsToGoal !== null
                          ? ` · ${f.monthsToGoal}m`
                          : ''
                      }`,
                      position: 'right',
                      fill: '#a78bfa',
                      fontSize: 10,
                    }}
                  />
                ))}
                <Line
                  type="monotone"
                  dataKey="balance"
                  name="預估餘額"
                  stroke="#818cf8"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{r: 5, fill: '#818cf8'}}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="col-span-12 bg-[#18181b] p-6 rounded-xl shadow-xl border border-[#27272a]">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-semibold text-zinc-100">
            進行中 ({resolvedActive.length})
          </h4>
          <button
            onClick={handleAdd}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Plus size={14} />
            新增分類
          </button>
        </div>

        {resolvedActive.length === 0 ? (
          <div className="text-center py-10 text-zinc-600 font-mono text-xs">
            [ 尚無分類，點擊右上「新增分類」開始規劃 ]
          </div>
        ) : (
          <ul className="space-y-2">
            {resolvedActive.map((a, idx) => {
              const ratio =
                baseBalance > 0
                  ? Math.min(1, Math.max(0, a.resolvedAmount / baseBalance))
                  : 0;
              const isPercent = a.targetMode === 'percent';
              const forecast = forecastById.get(a.id);
              const hasGoal =
                typeof a.goalAmount === 'number' && a.goalAmount > 0;
              return (
                <li
                  key={a.id}
                  className="bg-zinc-900/40 border border-[#27272a] rounded-lg p-3"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => reorderAllocations(idx, idx - 1)}
                        disabled={idx === 0}
                        aria-label="上移"
                        className="text-zinc-600 hover:text-zinc-200 transition-colors p-1 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => reorderAllocations(idx, idx + 1)}
                        disabled={idx === resolvedActive.length - 1}
                        aria-label="下移"
                        className="text-zinc-600 hover:text-zinc-200 transition-colors p-1 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>

                    <button
                      onClick={() => handleRename(a)}
                      className="flex items-center gap-1.5 text-zinc-100 text-sm font-medium hover:text-indigo-300 transition-colors"
                    >
                      {a.name}
                      <Pencil
                        size={12}
                        className="text-zinc-600 group-hover:text-zinc-400"
                      />
                    </button>

                    <button
                      onClick={() => handleToggleMode(a)}
                      aria-label="切換目標模式"
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                        isPercent
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {isPercent ? 'PERCENT' : 'FIXED'}
                    </button>

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        defaultValue={a.targetValue}
                        key={`${a.id}-${a.targetMode}-${a.targetValue}`}
                        onBlur={(e) => handleChangeValue(a, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter')
                            (e.target as HTMLInputElement).blur();
                        }}
                        className="w-28 bg-[#09090b] border border-[#27272a] text-zinc-100 rounded px-2 py-1 text-sm text-right font-mono focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none"
                      />
                      {isPercent && (
                        <span className="text-zinc-500 font-mono text-xs">
                          %
                        </span>
                      )}
                    </div>

                    {isPercent && (
                      <span className="text-xs text-zinc-500 font-mono">
                        ≈ {formatCurrency(a.resolvedAmount)}
                      </span>
                    )}

                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Target size={12} className="text-zinc-600" />
                      <span className="font-mono text-[10px] uppercase tracking-wider">
                        Goal
                      </span>
                      <input
                        type="number"
                        defaultValue={a.goalAmount ?? ''}
                        key={`${a.id}-goal-${a.goalAmount ?? ''}`}
                        placeholder="—"
                        onBlur={(e) => handleChangeGoal(a, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter')
                            (e.target as HTMLInputElement).blur();
                        }}
                        className="w-24 bg-[#09090b] border border-[#27272a] text-zinc-100 rounded px-2 py-1 text-sm text-right font-mono focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none"
                      />
                    </div>

                    {forecast && <ForecastBadge months={forecast.monthsToGoal} />}

                    <div className="ml-auto flex items-center gap-1">
                      <button
                        onClick={() => archiveAllocation(a.id, true)}
                        aria-label="封存"
                        title="封存（目標達成）"
                        className="text-zinc-600 hover:text-indigo-400 transition-colors p-1"
                      >
                        <Archive size={14} />
                      </button>
                      <button
                        onClick={() => deleteAllocation(a.id, a.name)}
                        aria-label={`刪除 ${a.name}`}
                        className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {hasGoal && forecast ? (
                    <div className="mt-2">
                      <div className="h-1.5 w-full bg-zinc-800 rounded overflow-hidden">
                        <div
                          className={`h-full ${
                            forecast.progressRatio >= 1
                              ? 'bg-emerald-500'
                              : 'bg-indigo-500'
                          }`}
                          style={{width: `${forecast.progressRatio * 100}%`}}
                        />
                      </div>
                      <div className="mt-1 flex justify-between text-[10px] font-mono text-zinc-600">
                        <span>
                          {formatCurrency(forecast.currentAmount)} /{' '}
                          {formatCurrency(forecast.goalAmount)}
                        </span>
                        <span>
                          {Math.round(forecast.progressRatio * 100)}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    baseBalance > 0 && (
                      <div className="mt-2 h-1.5 w-full bg-zinc-800 rounded overflow-hidden">
                        <div
                          className={`h-full ${
                            a.resolvedAmount > baseBalance
                              ? 'bg-red-500'
                              : 'bg-indigo-500'
                          }`}
                          style={{width: `${ratio * 100}%`}}
                        />
                      </div>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="col-span-12 bg-[#18181b] p-6 rounded-xl shadow-xl border border-[#27272a]">
        <button
          onClick={() => setShowArchived((v) => !v)}
          className="w-full flex items-center justify-between text-sm font-semibold text-zinc-300 hover:text-zinc-100 transition-colors"
        >
          <span className="flex items-center gap-2">
            {showArchived ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
            已封存 ({archivedAllocations.length})
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            {showArchived ? '收合' : '展開'}
          </span>
        </button>

        {showArchived && (
          <ul className="mt-4 space-y-2">
            {archivedAllocations.length === 0 && (
              <li className="text-center py-6 text-zinc-600 font-mono text-xs">
                [ 無封存項目 ]
              </li>
            )}
            {archivedAllocations.map((a) => (
              <li
                key={a.id}
                className="bg-zinc-900/40 border border-[#27272a] rounded-lg p-3 flex items-center gap-3 flex-wrap"
              >
                <span className="text-zinc-300 text-sm font-medium">
                  {a.name}
                </span>
                <span className="text-[10px] font-mono text-zinc-600">
                  {a.targetMode === 'fixed'
                    ? formatCurrency(a.targetValue)
                    : `${a.targetValue}% of base`}
                </span>
                {a.archivedAt && (
                  <span className="text-[10px] font-mono text-zinc-600">
                    封存於 {new Date(a.archivedAt).toLocaleDateString('zh-TW')}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={() => archiveAllocation(a.id, false)}
                    aria-label="取消封存"
                    title="取消封存"
                    className="text-zinc-600 hover:text-indigo-400 transition-colors p-1"
                  >
                    <ArchiveRestore size={14} />
                  </button>
                  <button
                    onClick={() => deleteAllocation(a.id, a.name)}
                    aria-label={`刪除 ${a.name}`}
                    className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

type SummaryCellProps = {
  label: string;
  value: string;
  tone: 'neutral' | 'allocated' | 'positive' | 'negative';
};

function SummaryCell({label, value, tone}: SummaryCellProps) {
  const toneClass =
    tone === 'negative'
      ? 'text-red-400 border-red-500/30 bg-red-500/5'
      : tone === 'positive'
      ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5'
      : tone === 'allocated'
      ? 'text-indigo-300 border-indigo-500/30 bg-indigo-500/5'
      : 'text-zinc-200 border-zinc-700 bg-zinc-900/40';
  return (
    <div className={`rounded-lg border px-4 py-3 ${toneClass}`}>
      <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold font-mono">{value}</div>
    </div>
  );
}

function ForecastBadge({months}: {months: number | null}) {
  if (months === 0) {
    return (
      <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
        已達成
      </span>
    );
  }
  if (months === null) {
    return (
      <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-zinc-800 text-zinc-500 border-zinc-700">
        --
      </span>
    );
  }
  return (
    <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
      預計 {months} 個月
    </span>
  );
}
