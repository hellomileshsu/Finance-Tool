import {useMemo, useState} from 'react';
import {TrendingUp} from 'lucide-react';
import {
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type {Category, ComputedRow} from '../types';
import {CustomBarTooltip, CustomLineTooltip, CustomPieTooltip} from './Tooltips';

const PIE_COLORS = [
  '#818cf8',
  '#34d399',
  '#f87171',
  '#facc15',
  '#2dd4bf',
  '#a78bfa',
  '#fb923c',
  '#f472b6',
];

type Props = {
  computedData: ComputedRow[];
  expenseCategories: Category[];
};

const ALL_MONTHS = '__all__';

export default function ChartsView({computedData, expenseCategories}: Props) {
  const [selectedMonth, setSelectedMonth] = useState<string>(ALL_MONTHS);

  const monthOptions = useMemo(
    () =>
      [...computedData]
        .map((row) => row.month)
        .sort((a, b) => b.localeCompare(a)),
    [computedData],
  );

  const isAllMonths =
    selectedMonth === ALL_MONTHS || !monthOptions.includes(selectedMonth);

  const pieData = useMemo(() => {
    const rows = isAllMonths
      ? computedData
      : computedData.filter((row) => row.month === selectedMonth);
    return expenseCategories
      .map((cat) => ({
        name: cat.name,
        value: rows.reduce((sum, row) => sum + (row.values[cat.id] || 0), 0),
      }))
      .filter((d) => d.value > 0);
  }, [computedData, expenseCategories, selectedMonth, isAllMonths]);

  return (
    <div className="grid grid-cols-12 gap-6 content-start">
      <div className="col-span-12 bg-[#18181b] p-6 rounded-xl shadow-xl border border-[#27272a]">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-400" />
              資產累積軌跡
            </h3>
            <p className="text-sm text-zinc-500">月底餘額模型預測</p>
          </div>
          <span className="text-xs font-mono text-indigo-400 px-2 py-1 bg-indigo-500/10 rounded border border-indigo-500/20">
            趨勢分析中
          </span>
        </div>

        <div className="h-72 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={computedData}
              syncId="finance-charts"
              margin={{top: 5, right: 20, bottom: 5, left: 20}}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
              <XAxis
                dataKey="month"
                stroke="#71717a"
                fontSize={11}
                tickMargin={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#71717a"
                fontSize={11}
                tickFormatter={(val: number) => `¥${val / 1000}k`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={<CustomLineTooltip />}
                cursor={{stroke: '#27272a', strokeWidth: 1, strokeDasharray: '4 4'}}
              />
              <Line
                type="monotone"
                dataKey="finalBalance"
                name="Balance"
                stroke="#818cf8"
                strokeWidth={3}
                dot={{r: 4, fill: '#18181b', strokeWidth: 2}}
                activeDot={{r: 6, fill: '#818cf8'}}
              />
              <Brush
                dataKey="month"
                height={30}
                stroke="#4f46e5"
                fill="#09090b"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-7 bg-[#18181b] p-6 rounded-xl shadow-xl border border-[#27272a]">
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-zinc-100">收支差額分析</h3>
          <p className="text-xs text-zinc-500 mt-1">每月現金流分析</p>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={computedData}
              syncId="finance-charts"
              margin={{top: 5, right: 5, bottom: 5, left: 5}}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
              <XAxis
                dataKey="month"
                stroke="#71717a"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
              />
              <YAxis
                stroke="#71717a"
                fontSize={11}
                tickFormatter={(val: number) => `${val / 1000}k`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={<CustomBarTooltip />}
                cursor={{fill: '#27272a', opacity: 0.4}}
              />
              <Legend
                wrapperStyle={{fontSize: '11px', paddingTop: '10px'}}
                iconType="circle"
              />
              <Bar
                dataKey="totalIncome"
                name="Income"
                fill="#34d399"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="totalExpense"
                name="Expense"
                fill="#f87171"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-5 bg-[#18181b] p-6 rounded-xl shadow-xl border border-[#27272a]">
        <div className="flex justify-between items-start gap-4 mb-6">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">全局支出分佈</h3>
            <p className="text-xs text-zinc-500 mt-1">
              {isAllMonths ? '累積分類支出' : `${selectedMonth} 分類支出`}
            </p>
          </div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-[#09090b] border border-[#27272a] text-zinc-300 text-xs font-mono rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
          >
            <option value={ALL_MONTHS}>全部月份</option>
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="h-64">
          {pieData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-zinc-600 text-xs font-mono">
              [ 尚無數據 ]
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  wrapperStyle={{fontSize: '11px', color: '#a1a1aa'}}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
