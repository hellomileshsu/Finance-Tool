import {formatCurrency} from '../utils/format';

type TooltipProps = {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey?: string;
    name?: string;
    payload: any;
  }>;
  label?: string;
};

export function CustomLineTooltip({active, payload, label}: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-xl shadow-2xl min-w-[180px]">
      <p className="text-zinc-400 text-xs font-mono mb-3 py-1 border-b border-zinc-800/80">
        {label}
      </p>
      <div className="space-y-1.5 text-sm">
        <p className="flex justify-between gap-6">
          <span className="text-zinc-500">收入</span>
          <span className="text-emerald-400 font-medium font-mono">
            {formatCurrency(data.totalIncome)}
          </span>
        </p>
        <p className="flex justify-between gap-6">
          <span className="text-zinc-500">支出</span>
          <span className="text-red-400 font-medium font-mono">
            {formatCurrency(data.totalExpense)}
          </span>
        </p>
        <div className="border-t border-[#27272a] my-2 pt-2"></div>
        <p className="flex justify-between gap-6">
          <span className="text-zinc-400">淨現金流</span>
          <span
            className={`font-mono font-medium ${
              data.netValue >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {data.netValue > 0 ? '+' : ''}
            {formatCurrency(data.netValue)}
          </span>
        </p>
        <p className="flex justify-between items-center gap-6 mt-3 bg-[#09090b] -mx-2 px-2 py-2 rounded-lg border border-[#27272a]">
          <span className="text-zinc-400 text-xs">期末餘額</span>
          <span className="text-indigo-400 font-bold font-mono text-[15px]">
            {formatCurrency(data.finalBalance)}
          </span>
        </p>
      </div>
    </div>
  );
}

export function CustomBarTooltip({active, payload, label}: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const income = payload.find((p) => p.dataKey === 'totalIncome')?.value || 0;
  const expense = payload.find((p) => p.dataKey === 'totalExpense')?.value || 0;
  const net = income - expense;
  const savingsRate = income > 0 ? ((net / income) * 100).toFixed(1) : '0';

  return (
    <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-xl shadow-2xl min-w-[170px]">
      <p className="text-zinc-400 text-xs font-mono mb-3 py-1 border-b border-zinc-800/80">
        {label}
      </p>
      <div className="space-y-2 text-sm">
        <p className="flex justify-between gap-6">
          <span className="text-emerald-400/80 font-medium text-xs uppercase tracking-wider">
            收入
          </span>
          <span className="font-semibold text-emerald-400 font-mono">
            {formatCurrency(income)}
          </span>
        </p>
        <p className="flex justify-between gap-6">
          <span className="text-red-400/80 font-medium text-xs uppercase tracking-wider">
            支出
          </span>
          <span className="font-semibold text-red-400 font-mono">
            {formatCurrency(expense)}
          </span>
        </p>
        <div className="border-t border-[#27272a] my-2 pt-2"></div>
        <p className="flex justify-between gap-6 items-center">
          <span className="text-zinc-400 text-xs">差額</span>
          <span
            className={`font-mono font-medium ${
              net >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {net > 0 ? '+' : ''}
            {formatCurrency(net)}
          </span>
        </p>
        {income > 0 && (
          <p className="flex justify-between gap-6 items-center pt-1">
            <span className="text-zinc-500 text-[10px] uppercase tracking-widest">
              儲蓄率
            </span>
            <span className="text-zinc-300 font-mono text-xs bg-zinc-800 px-1.5 py-0.5 rounded">
              {savingsRate}%
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

export function CustomPieTooltip({active, payload}: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0];
  return (
    <div className="bg-[#18181b] border border-[#27272a] p-3 rounded-lg shadow-xl flex items-center gap-3">
      <div
        className="w-2 h-2 rounded-full shadow-sm"
        style={{
          backgroundColor: data.payload.fill,
          boxShadow: `0 0 8px ${data.payload.fill}`,
        }}
      ></div>
      <div>
        <p className="text-zinc-300 text-sm font-medium pr-4">{data.name}</p>
        <p className="text-zinc-400 text-xs font-mono mt-0.5">
          {formatCurrency(data.value)}
        </p>
      </div>
    </div>
  );
}
