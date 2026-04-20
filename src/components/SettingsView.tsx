import {DragEvent} from 'react';
import {GripVertical, Trash2} from 'lucide-react';

import type {Category, CategoryType, Settings} from '../types';
import {DefaultAmountInput} from './DefaultAmountInput';

type Props = {
  settings: Settings;
  incomeCategories: Category[];
  expenseCategories: Category[];
  updateBaseBalance: (val: number) => void;
  updateCategoryDefaultAmount: (id: string, amount: number | null) => void;
  deleteCategory: (id: string, name: string) => void;
  addCategory: (name: string, type: CategoryType) => Promise<void>;
  reorderCategories: (type: CategoryType, fromIdx: number, toIdx: number) => void;
};

export function SettingsView({
  settings,
  incomeCategories,
  expenseCategories,
  updateBaseBalance,
  updateCategoryDefaultAmount,
  deleteCategory,
  addCategory,
  reorderCategories,
}: Props) {
  const handleDragStart = (
    e: DragEvent<HTMLLIElement>,
    index: number,
    type: CategoryType,
  ) => {
    e.dataTransfer.setData('dragIndex', index.toString());
    e.dataTransfer.setData('dragType', type);
  };

  const handleDragOver = (e: DragEvent<HTMLLIElement>) => {
    e.preventDefault();
  };

  const handleDrop = (
    e: DragEvent<HTMLLIElement>,
    dropIndex: number,
    type: CategoryType,
  ) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('dragIndex'), 10);
    const dragType = e.dataTransfer.getData('dragType') as CategoryType;
    if (dragType !== type || dragIndex === dropIndex || isNaN(dragIndex)) return;
    reorderCategories(type, dragIndex, dropIndex);
  };

  const handleAddCategory = async (type: CategoryType) => {
    const label = type === 'income' ? '收入' : '支出';
    const name = prompt(`請輸入新的${label}類別名稱：`);
    if (!name) return;
    try {
      await addCategory(name, type);
    } catch (error) {
      alert(`無法新增類別: ${(error as Error).message}`);
      console.error(error);
    }
  };

  const renderCategoryList = (cats: Category[], type: CategoryType) => (
    <ul className="space-y-2">
      {cats.map((cat, index) => (
        <li
          key={cat.id}
          draggable
          onDragStart={(e) => handleDragStart(e, index, type)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, index, type)}
          className="flex justify-between items-center bg-zinc-900/50 hover:bg-zinc-800/80 px-3 py-2 rounded-lg border border-[#27272a] shadow-sm cursor-grab active:cursor-grabbing transition-colors group"
        >
          <div className="flex items-center gap-3">
            <GripVertical size={14} className="text-zinc-600" />
            <span className="text-sm text-zinc-300">{cat.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
                自動：
              </span>
              <DefaultAmountInput
                value={cat.defaultAmount}
                onCommit={(amount) => updateCategoryDefaultAmount(cat.id, amount)}
              />
            </div>
            <button
              onClick={() => deleteCategory(cat.id, cat.name)}
              className="text-zinc-600 hover:text-red-400 transition-colors p-1"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="max-w-4xl grid grid-cols-12 gap-6 content-start">
      <div className="col-span-12 bg-[#18181b] p-6 rounded-xl shadow-xl border border-[#27272a]">
        <h3 className="text-sm font-semibold text-zinc-100 mb-6">系統參數</h3>
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="w-full max-w-xs">
            <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-500 mb-2">
              初始資金 (Genesis Balance)
            </label>
            <input
              type="number"
              className="w-full bg-[#09090b] border border-[#27272a] text-zinc-100 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none font-mono text-sm transition-all"
              value={settings.baseInitialBalance}
              onChange={(e) =>
                updateBaseBalance(parseInt(e.target.value) || 0)
              }
            />
          </div>
          <div className="flex-1 text-xs text-zinc-400 bg-indigo-500/10 p-4 rounded-lg border border-indigo-500/20 leading-relaxed font-mono">
            <span className="text-indigo-400 font-bold block mb-1">提示：</span>
            修改此根參數將觸發所有後續月份數據的連鎖重新計算。
          </div>
        </div>
      </div>

      <div className="col-span-12 bg-[#18181b] p-6 rounded-xl shadow-xl border border-[#27272a]">
        <h3 className="text-sm font-semibold text-zinc-100 mb-6">
          分類架構 (Taxonomy Schemas)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-4 flex items-center justify-between border-b border-zinc-800 pb-3">
              收入類別 (Income Vectors)
              <button
                onClick={() => handleAddCategory('income')}
                className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded hover:bg-emerald-500/20 transition-colors"
              >
                + 新增類別
              </button>
            </h4>
            {renderCategoryList(incomeCategories, 'income')}
          </div>

          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-4 flex items-center justify-between border-b border-zinc-800 pb-3">
              支出類別 (Expense Vectors)
              <button
                onClick={() => handleAddCategory('expense')}
                className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded hover:bg-red-500/20 transition-colors"
              >
                + 新增類別
              </button>
            </h4>
            {renderCategoryList(expenseCategories, 'expense')}
          </div>
        </div>
      </div>
    </div>
  );
}
