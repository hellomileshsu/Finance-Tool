import {lazy, Suspense, useState} from 'react';
import {
  LogOut,
  Minus,
  PieChart as PieChartIcon,
  PiggyBank,
  Plus,
  Settings,
  Table as TableIcon,
  TrendingUp,
} from 'lucide-react';

import {AllocationsView} from './components/AllocationsView';
import {SettingsView} from './components/SettingsView';
import {TableView} from './components/TableView';
import {useFinanceData} from './hooks/useFinanceData';

const ChartsView = lazy(() => import('./components/ChartsView'));

type Tab = 'table' | 'charts' | 'allocations' | 'settings';

const TAB_LABELS: Record<Tab, string> = {
  table: 'Financial_Overview_Grid',
  charts: 'Analytics_Dashboard',
  allocations: 'Savings_Allocation_Planner',
  settings: 'System_Configuration',
};

export default function App() {
  const {
    user,
    loading,
    incomeCategories,
    expenseCategories,
    settings,
    computedData,
    allocations,
    login,
    logout,
    updateRecordValue,
    addNextMonth,
    updateBaseBalance,
    deleteCategory,
    renameCategory,
    removeLastMonth,
    updateCategoryDefaultAmount,
    addCategory,
    reorderCategories,
    toggleCategoryGroup,
    updateCategoryItems,
    addAllocation,
    updateAllocation,
    deleteAllocation,
    archiveAllocation,
    reorderAllocations,
  } = useFinanceData();
  const [activeTab, setActiveTab] = useState<Tab>('table');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-[#fafafa]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-[#fafafa] font-sans">
        <div className="bg-[#18181b] p-8 rounded-xl shadow-xl border border-[#27272a] text-center max-w-sm w-full">
          <TrendingUp size={48} className="mx-auto mb-6 text-indigo-500" />
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">財務預測大師</h1>
          <p className="text-zinc-500 text-sm mb-8">Personal Finance Planner V1</p>
          <button
            onClick={login}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Google Login
          </button>
        </div>
      </div>
    );
  }

  const navButtonClass = (tab: Tab) =>
    `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
      activeTab === tab
        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]'
        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent'
    }`;

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] font-sans flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-[#09090b] border-r border-[#27272a] flex flex-col shrink-0">
        <div className="p-6 border-b border-[#27272a]">
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <TrendingUp size={24} className="text-indigo-400" />
            財務預測大師
          </h1>
          <p className="text-xs text-zinc-500 mt-2 font-mono">FINANCE_PLANNER_V1</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('table')} className={navButtonClass('table')}>
            <TableIcon size={18} />
            月度總覽表
          </button>
          <button onClick={() => setActiveTab('charts')} className={navButtonClass('charts')}>
            <PieChartIcon size={18} />
            數據分析看板
          </button>
          <button
            onClick={() => setActiveTab('allocations')}
            className={navButtonClass('allocations')}
          >
            <PiggyBank size={18} />
            存款分類規劃
          </button>
          <button onClick={() => setActiveTab('settings')} className={navButtonClass('settings')}>
            <Settings size={18} />
            系統與分類
          </button>
        </nav>

        <div className="p-4 border-t border-[#27272a]">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2 text-xs font-mono text-zinc-500 hover:text-red-400 transition-colors"
          >
            <LogOut size={16} />
            登出 ({user.uid.slice(0, 6)})
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden flex flex-col h-screen bg-[#09090b]">
        <header className="bg-[#0c0c0e] border-b border-[#27272a] h-16 px-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-zinc-500 font-medium text-sm">Modules</span>
            <span className="text-zinc-700">/</span>
            <span className="text-zinc-100 font-semibold text-sm">
              {TAB_LABELS[activeTab]}
            </span>
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs rounded border border-emerald-500/20 font-mono hidden sm:inline-block">
              LIVE
            </span>
          </div>

          <div className="flex items-center gap-6">
            {activeTab === 'table' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={removeLastMonth}
                  disabled={computedData.length === 0}
                  className="bg-zinc-800 text-zinc-300 px-4 py-1.5 rounded text-sm font-semibold hover:bg-zinc-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Minus size={16} />
                  減去最新月份
                </button>
                <button
                  onClick={addNextMonth}
                  className="bg-zinc-100 text-zinc-950 px-4 py-1.5 rounded text-sm font-semibold hover:bg-white transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Plus size={16} />
                  新增下個月
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-8 content-start">
          {activeTab === 'table' && (
            <TableView
              incomeCategories={incomeCategories}
              expenseCategories={expenseCategories}
              computedData={computedData}
              updateRecordValue={updateRecordValue}
              updateCategoryItems={updateCategoryItems}
            />
          )}

          {activeTab === 'charts' && (
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-64 text-zinc-500 font-mono text-xs">
                  [ 載入圖表中... ]
                </div>
              }
            >
              <ChartsView
                computedData={computedData}
                expenseCategories={expenseCategories}
              />
            </Suspense>
          )}

          {activeTab === 'allocations' && (
            <AllocationsView
              allocations={allocations}
              computedData={computedData}
              addAllocation={addAllocation}
              updateAllocation={updateAllocation}
              deleteAllocation={deleteAllocation}
              archiveAllocation={archiveAllocation}
              reorderAllocations={reorderAllocations}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              incomeCategories={incomeCategories}
              expenseCategories={expenseCategories}
              updateBaseBalance={updateBaseBalance}
              updateCategoryDefaultAmount={updateCategoryDefaultAmount}
              deleteCategory={deleteCategory}
              renameCategory={renameCategory}
              addCategory={addCategory}
              reorderCategories={reorderCategories}
              toggleCategoryGroup={toggleCategoryGroup}
            />
          )}
        </div>
      </main>
    </div>
  );
}
