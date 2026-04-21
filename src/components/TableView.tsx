import {useState} from 'react';
import {List} from 'lucide-react';

import type {Category, ComputedRow, GroupItem} from '../types';
import {getAmount, getItems} from '../utils/finance';
import {formatCurrency} from '../utils/format';
import {GroupItemsModal} from './GroupItemsModal';
import {NumberInputCell} from './NumberInputCell';

type Props = {
  incomeCategories: Category[];
  expenseCategories: Category[];
  computedData: ComputedRow[];
  updateRecordValue: (monthId: string, categoryId: string, value: number) => void;
  updateCategoryItems: (
    monthId: string,
    categoryId: string,
    items: GroupItem[],
  ) => void;
};

type ModalCtx = {
  monthId: string;
  category: Category;
  initialItems: GroupItem[];
};

export function TableView({
  incomeCategories,
  expenseCategories,
  computedData,
  updateRecordValue,
  updateCategoryItems,
}: Props) {
  const [modalCtx, setModalCtx] = useState<ModalCtx | null>(null);

  const renderCell = (row: ComputedRow, cat: Category) => {
    if (cat.isGroup) {
      const total = getAmount(row.values[cat.id]);
      const items = getItems(row.values[cat.id]);
      const accent =
        cat.type === 'income' ? 'text-emerald-300' : 'text-red-300';
      return (
        <button
          onClick={() =>
            setModalCtx({monthId: row.id, category: cat, initialItems: items})
          }
          className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded border border-transparent hover:border-zinc-700 hover:bg-zinc-900/60 transition-colors font-mono text-xs"
        >
          <span className="flex items-center gap-1.5 text-zinc-500">
            <List size={12} />
            {items.length}項
          </span>
          <span className={`font-semibold ${accent}`}>
            {formatCurrency(total)}
          </span>
        </button>
      );
    }
    const v = row.values[cat.id];
    return (
      <NumberInputCell
        value={typeof v === 'number' ? v : undefined}
        onChange={(val) => updateRecordValue(row.id, cat.id, val)}
      />
    );
  };

  return (
    <div className="bg-[#18181b] rounded-xl shadow-xl border border-[#27272a] overflow-hidden flex flex-col h-full max-h-[85vh]">
      <div className="flex justify-between items-start mb-4 p-6 pb-0">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">財務總覽網格</h2>
          <p className="text-sm text-zinc-500">Pipeline: input-ledger-stream</p>
        </div>
      </div>

      <div className="overflow-x-auto flex-1 mt-4 px-1 pb-1">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="text-[10px] uppercase tracking-wider text-zinc-400 bg-zinc-900 sticky top-0 z-20 shadow-sm border-y border-zinc-800">
            <tr>
              <th className="px-4 py-3 sticky left-0 bg-zinc-900/95 backdrop-blur z-30 border-b border-r border-zinc-800 font-semibold">
                月份
              </th>
              <th className="px-4 py-3 border-b border-zinc-800 font-semibold">
                期初餘額
              </th>

              {incomeCategories.map((cat) => (
                <th
                  key={cat.id}
                  className="px-4 py-3 border-b border-emerald-500/20 text-emerald-400 bg-emerald-500/5"
                >
                  {cat.name}
                  {cat.isGroup && (
                    <span className="ml-1 text-[8px] font-mono text-emerald-500/60">
                      ▾
                    </span>
                  )}
                </th>
              ))}
              <th className="px-4 py-3 border-b border-emerald-500/20 font-bold text-emerald-400 bg-emerald-500/10 border-r border-[#27272a]">
                總收入
              </th>

              {expenseCategories.map((cat) => (
                <th
                  key={cat.id}
                  className="px-4 py-3 border-b border-red-500/20 text-red-400 bg-red-500/5"
                >
                  {cat.name}
                  {cat.isGroup && (
                    <span className="ml-1 text-[8px] font-mono text-red-500/60">
                      ▾
                    </span>
                  )}
                </th>
              ))}
              <th className="px-4 py-3 border-b border-red-500/20 font-bold text-red-400 bg-red-500/10 border-r border-[#27272a]">
                總支出
              </th>

              <th className="px-4 py-3 border-b border-indigo-500/20 font-bold text-indigo-400 bg-indigo-500/10 border-r border-[#27272a]">
                淨現金流
              </th>
              <th className="px-4 py-3 border-b border-indigo-500/20 font-bold text-indigo-300 bg-indigo-500/20">
                期末餘額
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {computedData.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-zinc-800/40 transition-colors group"
              >
                <td className="px-4 py-3 sticky left-0 bg-[#18181b] group-hover:bg-[#202024] z-10 border-r border-[#27272a] font-medium text-zinc-300 font-mono text-xs">
                  {row.month}
                </td>
                <td className="px-4 py-3 text-right text-zinc-500 font-mono text-xs">
                  {formatCurrency(row.initialBalance)}
                </td>

                {incomeCategories.map((cat) => (
                  <td
                    key={cat.id}
                    className="px-2 py-1 min-w-[120px] border-l border-zinc-800"
                  >
                    {renderCell(row, cat)}
                  </td>
                ))}
                <td className="px-4 py-3 text-right font-medium text-emerald-400 bg-emerald-500/5 border-x border-[#27272a] font-mono text-xs">
                  {formatCurrency(row.totalIncome)}
                </td>

                {expenseCategories.map((cat) => (
                  <td
                    key={cat.id}
                    className="px-2 py-1 min-w-[120px] border-l border-zinc-800"
                  >
                    {renderCell(row, cat)}
                  </td>
                ))}
                <td className="px-4 py-3 text-right font-medium text-red-400 bg-red-500/5 border-x border-[#27272a] font-mono text-xs">
                  {formatCurrency(row.totalExpense)}
                </td>

                <td
                  className={`px-4 py-3 text-right font-bold border-r border-[#27272a] font-mono text-xs ${
                    row.netValue < 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {row.netValue > 0 ? '+' : ''}
                  {formatCurrency(row.netValue)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-indigo-400 bg-indigo-500/10 font-mono text-xs">
                  {formatCurrency(row.finalBalance)}
                </td>
              </tr>
            ))}
            {computedData.length === 0 && (
              <tr>
                <td
                  colSpan={100}
                  className="text-center py-12 text-zinc-600 font-mono text-xs"
                >
                  [ 等待數據輸入 ]
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-3 bg-[#0c0c0e] border-t border-[#27272a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
          <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">
            已啟用自動儲存
          </span>
        </div>
        <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
          資料筆數: {computedData.length}
        </span>
      </div>

      {modalCtx && (
        <GroupItemsModal
          monthId={modalCtx.monthId}
          category={modalCtx.category}
          initialItems={modalCtx.initialItems}
          onClose={() => setModalCtx(null)}
          onSave={(items) => {
            updateCategoryItems(modalCtx.monthId, modalCtx.category.id, items);
            setModalCtx(null);
          }}
        />
      )}
    </div>
  );
}
