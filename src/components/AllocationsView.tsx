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
  Trash2,
} from 'lucide-react';

import type {
  Allocation,
  AllocationTargetMode,
  ComputedRow,
} from '../types';
import {formatCurrency} from '../utils/format';

type Props = {
  allocations: Allocation[];
  computedData: ComputedRow[];
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
};

export function AllocationsView({
  allocations,
  computedData,
  addAllocation,
  updateAllocation,
  deleteAllocation,
  archiveAllocation,
  reorderAllocations,
}: Props) {
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

                  {baseBalance > 0 && (
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
