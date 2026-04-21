import {useEffect, useState} from 'react';
import {Plus, Trash2, X} from 'lucide-react';

import type {Category, GroupItem} from '../types';
import {newItemId, sumItems} from '../utils/finance';
import {formatCurrency} from '../utils/format';

type Props = {
  monthId: string;
  category: Category;
  initialItems: GroupItem[];
  onClose: () => void;
  onSave: (items: GroupItem[]) => void;
};

export function GroupItemsModal({
  monthId,
  category,
  initialItems,
  onClose,
  onSave,
}: Props) {
  const [items, setItems] = useState<GroupItem[]>(() =>
    initialItems.length > 0
      ? initialItems.map((it) => ({...it}))
      : [{id: newItemId(), name: '', amount: 0}],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const updateItem = (id: string, patch: Partial<GroupItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? {...it, ...patch} : it)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const addItem = () => {
    setItems((prev) => [...prev, {id: newItemId(), name: '', amount: 0}]);
  };

  const handleSave = () => {
    const cleaned = items
      .map((it) => ({...it, name: it.name.trim(), amount: Number(it.amount) || 0}))
      .filter((it) => it.name !== '');
    onSave(cleaned);
  };

  const total = sumItems(items);
  const accent =
    category.type === 'income' ? 'text-emerald-400' : 'text-red-400';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#18181b] rounded-xl shadow-2xl border border-[#27272a] w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 border-b border-[#27272a]">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              {category.name}
              <span className="text-zinc-600 mx-2">·</span>
              <span className="font-mono text-zinc-400">{monthId}</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              編輯明細項目（Enter 儲存、Esc 取消）
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="關閉"
            className="text-zinc-500 hover:text-zinc-200 transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-2">
          {items.length === 0 && (
            <div className="text-center py-8 text-zinc-600 font-mono text-xs">
              [ 尚無項目 ]
            </div>
          )}
          {items.map((it) => (
            <div
              key={it.id}
              className="flex items-center gap-2 bg-zinc-900/50 border border-[#27272a] rounded-lg p-2"
            >
              <input
                type="text"
                value={it.name}
                placeholder="項目名稱"
                onChange={(e) => updateItem(it.id, {name: e.target.value})}
                className="flex-1 bg-[#09090b] border border-[#27272a] text-zinc-100 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none"
              />
              <input
                type="number"
                value={it.amount === 0 ? '' : it.amount}
                placeholder="0"
                onChange={(e) =>
                  updateItem(it.id, {
                    amount: e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0,
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                }}
                className="w-28 bg-[#09090b] border border-[#27272a] text-zinc-100 rounded px-3 py-1.5 text-sm text-right font-mono focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none"
              />
              <button
                onClick={() => removeItem(it.id)}
                aria-label={`刪除 ${it.name || '項目'}`}
                className="text-zinc-600 hover:text-red-400 transition-colors p-1"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={addItem}
            className="w-full mt-3 border border-dashed border-zinc-700 hover:border-indigo-500/50 text-zinc-500 hover:text-indigo-400 rounded-lg py-2 text-xs font-mono transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={14} />
            新增項目
          </button>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-[#27272a]">
          <div className="text-xs font-mono text-zinc-500">
            小計：
            <span className={`ml-2 text-sm font-semibold ${accent}`}>
              {formatCurrency(total)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded text-sm font-semibold transition-colors"
            >
              儲存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
