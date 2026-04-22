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
    `shrink-0 md:w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg transition-colors text-xs md:text-sm font-medium whitespace-nowrap ${
      activeTab === tab
        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]'
        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent'
    }`;

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] font-sans flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-[#09090b] border-b md:border-b-0 md:border-r border-[#27272a] flex md:flex-col shrink-0">
        <div className="p-3 md:p-6 md:border-b md:border-[#27272a] shrink-0 flex items-center md:block">
          <h1 className="text-base md:text-xl font-bold text-zinc-100 flex items-center gap-2">
            <TrendingUp size={20} className="text-indigo-400" />
            <span className="hidden sm:inline">財務預測大師</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-2 font-mono hidden md:block">
            FINANCE_PLANNER_V1
          </p>
        </div>

        <nav className="flex-1 flex md:flex-col gap-1 md:gap-2 p-2 md:p-4 overflow-x-auto">
          <button onClick={() => setActiveTab('table')} className={navButtonClass('table')}>
            <TableIcon size={18} className="shrink-0" />
            月度總覽表
          </button>
          <button onClick={() => setActiveTab('charts')} className={navButtonClass('charts')}>
            <PieChartIcon size={18} className="shrink-0" />
            數據分析看板
          </button>
          <button
            onClick={() => setActiveTab('allocations')}
            className={navButtonClass('allocations')}
          >
            <PiggyBank size={18} className="shrink-0" />
            存款分類規劃
          </button>
          <button onClick={() => setActiveTab('settings')} className={navButtonClass('settings')}>
            <Settings size={18} className="shrink-0" />
            系統與分類
          </button>
        </nav>

        <div className="p-2 md:p-4 md:border-t md:border-[#27272a] shrink-0">
          <button
            onClick={logout}
            className="flex items-center gap-2 md:gap-3 px-2 md:px-4 py-2 text-xs font-mono text-zinc-500 hover:text-red-400 transition-colors whitespace-nowrap"
          >
            <LogOut size={16} />
            <span className="hidden md:inline">登出 ({user.uid.slice(0, 6)})</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 md:overflow-hidden flex flex-col md:h-screen bg-[#09090b] min-h-0">
        <header className="bg-[#0c0c0e] border-b border-[#27272a] min-h-14 md:h-16 px-3 md:px-6 py-2 md:py-0 flex justify-between items-center shrink-0 gap-2">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <span className="text-zinc-500 font-medium text-sm hidden md:inline">
              Modules
            </span>
            <span className="text-zinc-700 hidden md:inline">/</span>
            <span className="text-zinc-100 font-semibold text-xs md:text-sm truncate">
              {TAB_LABELS[activeTab]}
            </span>
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs rounded border border-emerald-500/20 font-mono hidden sm:inline-block">
              LIVE
            </span>
          </div>

          <div className="flex items-center gap-2 md:gap-6 shrink-0">
            {activeTab === 'table' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={removeLastMonth}
                  disabled={computedData.length === 0}
                  aria-label="減去最新月份"
                  className="bg-zinc-800 text-zinc-300 px-2 md:px-4 py-1.5 rounded text-sm font-semibold hover:bg-zinc-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Minus size={16} />
                  <span className="hidden sm:inline">減去最新月份</span>
                </button>
                <button
                  onClick={addNextMonth}
                  aria-label="新增下個月"
                  className="bg-zinc-100 text-zinc-950 px-2 md:px-4 py-1.5 rounded text-sm font-semibold hover:bg-white transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">新增下個月</span>
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 md:overflow-auto p-4 sm:p-8 content-start">
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
