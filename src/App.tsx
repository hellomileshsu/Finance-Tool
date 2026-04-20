import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc,
  onSnapshot, 
  writeBatch,
  deleteField
} from 'firebase/firestore';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush 
} from 'recharts';
import { 
  Table as TableIcon, Settings, Plus, 
  Trash2, TrendingUp, LogOut, PieChart as PieChartIcon, GripVertical
} from 'lucide-react';

import firebaseConfig from '../firebase-applet-config.json';

// --- Firebase Initialization ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export const db = getFirestore(app);

// --- Utility Functions ---
const formatCurrency = (num: number | null | undefined) => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(num);
};

const getNextMonthStr = (currentMonthStr: string) => {
  const [year, month] = currentMonthStr.split('-').map(Number);
  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear++;
  }
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
};

const getCurrentMonthStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// --- Components ---

// 1. Table Cell Input (Handles local state while typing, flushes on blur)
const NumberInputCell = ({ value, onChange, isNegativeDanger }: any) => {
  const [localValue, setLocalValue] = useState<string | number>(value || '');

  useEffect(() => {
    setLocalValue(value === 0 ? '' : value || '');
  }, [value]);

  const handleBlur = () => {
    const numVal = parseInt(localValue as string, 10);
    if (isNaN(numVal)) {
      onChange(0);
      setLocalValue('');
    } else {
      onChange(numVal);
      setLocalValue(numVal);
    }
  };

  const handleKeyDown = (e: any) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  return (
    <input
      type="number"
      className={`w-full bg-transparent text-right outline-none hover:bg-zinc-800/80 focus:bg-zinc-800 focus:ring-1 focus:ring-indigo-500 rounded px-1 py-1 transition-colors ${
        isNegativeDanger && value < 0 ? 'text-red-400 font-semibold' : 'text-zinc-300'
      }`}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder="0"
    />
  );
};

const CustomLineTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-xl shadow-2xl min-w-[180px]">
        <p className="text-zinc-400 text-xs font-mono mb-3 py-1 border-b border-zinc-800/80">{label}</p>
        <div className="space-y-1.5 text-sm">
          <p className="flex justify-between gap-6">
            <span className="text-zinc-500">收入</span>
            <span className="text-emerald-400 font-medium font-mono">{formatCurrency(data.totalIncome)}</span>
          </p>
          <p className="flex justify-between gap-6">
            <span className="text-zinc-500">支出</span>
            <span className="text-red-400 font-medium font-mono">{formatCurrency(data.totalExpense)}</span>
          </p>
          <div className="border-t border-[#27272a] my-2 pt-2"></div>
          <p className="flex justify-between gap-6">
            <span className="text-zinc-400">淨現金流</span>
            <span className={`font-mono font-medium ${data.netValue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {data.netValue > 0 ? '+' : ''}{formatCurrency(data.netValue)}
            </span>
          </p>
          <p className="flex justify-between items-center gap-6 mt-3 bg-[#09090b] -mx-2 px-2 py-2 rounded-lg border border-[#27272a]">
            <span className="text-zinc-400 text-xs">期末餘額</span>
            <span className="text-indigo-400 font-bold font-mono text-[15px]">{formatCurrency(data.finalBalance)}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const income = payload.find((p: any) => p.dataKey === 'totalIncome')?.value || 0;
    const expense = payload.find((p: any) => p.dataKey === 'totalExpense')?.value || 0;
    const net = income - expense;
    const savingsRate = income > 0 ? ((net / income) * 100).toFixed(1) : 0;
    
    return (
      <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-xl shadow-2xl min-w-[170px]">
        <p className="text-zinc-400 text-xs font-mono mb-3 py-1 border-b border-zinc-800/80">{label}</p>
        <div className="space-y-2 text-sm">
          <p className="flex justify-between gap-6">
            <span className="text-emerald-400/80 font-medium text-xs uppercase tracking-wider">收入</span>
            <span className="font-semibold text-emerald-400 font-mono">{formatCurrency(income)}</span>
          </p>
          <p className="flex justify-between gap-6">
            <span className="text-red-400/80 font-medium text-xs uppercase tracking-wider">支出</span>
            <span className="font-semibold text-red-400 font-mono">{formatCurrency(expense)}</span>
          </p>
          <div className="border-t border-[#27272a] my-2 pt-2"></div>
          <p className="flex justify-between gap-6 items-center">
            <span className="text-zinc-400 text-xs">差額</span>
            <span className={`font-mono font-medium ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {net > 0 ? '+' : ''}{formatCurrency(net)}
            </span>
          </p>
          {income > 0 && (
             <p className="flex justify-between gap-6 items-center pt-1">
               <span className="text-zinc-500 text-[10px] uppercase tracking-widest">儲蓄率</span>
               <span className="text-zinc-300 font-mono text-xs bg-zinc-800 px-1.5 py-0.5 rounded">{savingsRate}%</span>
             </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-[#18181b] border border-[#27272a] p-3 rounded-lg shadow-xl flex items-center gap-3">
        <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: data.payload.fill, boxShadow: `0 0 8px ${data.payload.fill}` }}></div>
        <div>
          <p className="text-zinc-300 text-sm font-medium pr-4">{data.name}</p>
          <p className="text-zinc-400 text-xs font-mono mt-0.5">{formatCurrency(data.value)}</p>
        </div>
      </div>
    );
  }
  return null;
};

export default function App() {
  // --- State ---
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('table'); // 'table', 'charts', 'settings'
  
  const [categories, setCategories] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({ baseInitialBalance: 0 });

  // --- Auth Effect ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Auth Error:", err);
    }
  };

  // --- Data Fetching Effect ---
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    
    // 1. Fetch Categories
    const unsubCategories = onSnapshot(collection(userDocRef, 'categories'), (snap) => {
      if (snap.empty && categories.length === 0) {
        // Init default categories
        const defaultCats = [
          { id: 'inc_salary', name: '薪資收入', type: 'income', order: 1 },
          { id: 'inc_bonus', name: '獎金/其他', type: 'income', order: 2 },
          { id: 'exp_housing', name: '房租/房貸', type: 'expense', order: 1 },
          { id: 'exp_food', name: '餐飲生活', type: 'expense', order: 2 },
          { id: 'exp_transport', name: '交通通訊', type: 'expense', order: 3 },
          { id: 'exp_insurance', name: '保險/醫療', type: 'expense', order: 4 },
        ];
        const batch = writeBatch(db);
        defaultCats.forEach(cat => {
          batch.set(doc(collection(userDocRef, 'categories'), cat.id), cat);
        });
        batch.commit();
      } else {
        const cats = snap.docs.map(d => ({ id: d.id, ...d.data() } as any)).sort((a: any, b: any) => a.order - b.order);
        setCategories(cats);
      }
    }, console.error);

    // 2. Fetch Records
    const unsubRecords = onSnapshot(collection(userDocRef, 'records'), (snap) => {
      if (snap.empty) {
        // Init current month if empty
        const currentMonth = getCurrentMonthStr();
        setDoc(doc(collection(userDocRef, 'records'), currentMonth), { month: currentMonth, values: {} });
      } else {
        const recs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setRecords(recs);
      }
    }, console.error);

    // 3. Fetch Settings (Base Initial Balance)
    const unsubSettings = onSnapshot(doc(userDocRef, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      } else {
        setDoc(doc(userDocRef, 'settings', 'general'), { baseInitialBalance: 0 });
      }
    }, console.error);

    return () => {
      unsubCategories();
      unsubRecords();
      unsubSettings();
    };
  }, [user]);

  // --- Computation Logic ---
  const incomeCategories = useMemo(() => categories.filter(c => c.type === 'income'), [categories]);
  const expenseCategories = useMemo(() => categories.filter(c => c.type === 'expense'), [categories]);

  const computedData = useMemo(() => {
    // 1. Sort records by month chronologically
    const sortedRecords = [...records].sort((a, b) => a.month.localeCompare(b.month));
    
    let currentBalance = settings.baseInitialBalance || 0;

    return sortedRecords.map(record => {
      let totalIncome = 0;
      let totalExpense = 0;
      const values = record.values || {};

      incomeCategories.forEach(cat => {
        totalIncome += (values[cat.id] || 0);
      });
      expenseCategories.forEach(cat => {
        totalExpense += (values[cat.id] || 0);
      });

      const netValue = totalIncome - totalExpense;
      const initialBalance = currentBalance;
      const finalBalance = initialBalance + netValue;
      
      // Update running balance for next month
      currentBalance = finalBalance;

      return {
        ...record,
        values,
        initialBalance,
        totalIncome,
        totalExpense,
        netValue,
        finalBalance
      };
    });
  }, [records, categories, settings.baseInitialBalance, incomeCategories, expenseCategories]);


  // --- Actions ---
  const updateRecordValue = async (monthId: string, categoryId: string, value: number) => {
    if (!user) return;
    const recordRef = doc(db, 'users', user.uid, 'records', monthId);
    
    // Optimistic update logic handled by snapshot
    const existingRecord = records.find(r => r.id === monthId);
    const newValues = { ...(existingRecord?.values || {}) };
    newValues[categoryId] = value;

    await setDoc(recordRef, { month: monthId, values: newValues }, { merge: true });
  };

  const addNextMonth = async () => {
    if (!user || records.length === 0) return;
    const sortedRecords = [...records].sort((a, b) => a.month.localeCompare(b.month));
    const lastMonth = sortedRecords[sortedRecords.length - 1].month;
    const nextMonth = getNextMonthStr(lastMonth);
    
    // Auto-fill recurring defaults
    const newValues: any = {};
    categories.forEach(cat => {
      if (cat.defaultAmount && cat.defaultAmount > 0) {
        newValues[cat.id] = cat.defaultAmount;
      }
    });

    await setDoc(doc(db, 'users', user.uid, 'records', nextMonth), { 
      month: nextMonth, values: newValues 
    });
  };

  const updateBaseBalance = async (val: number) => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid, 'settings', 'general'), { 
      baseInitialBalance: val 
    }, { merge: true });
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!user) return;
    if (window.confirm(`確定要刪除分類 "${categoryName}" 嗎？此操作無法還原。`)) {
      await deleteDoc(doc(db, 'users', user.uid, 'categories', categoryId));
    }
  };

  const updateCategoryDefaultAmount = async (categoryId: string, amount: number | null) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'categories', categoryId);
    if (amount === null || amount <= 0 || isNaN(amount)) {
      await setDoc(ref, { defaultAmount: deleteField() }, { merge: true });
    } else {
      await setDoc(ref, { defaultAmount: amount }, { merge: true });
    }
  };

  // --- Drag and Drop Logic ---
  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, index: number, type: string) => {
    e.dataTransfer.setData('dragIndex', index.toString());
    e.dataTransfer.setData('dragType', type);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent<HTMLLIElement>, dropIndex: number, type: string) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('dragIndex'), 10);
    const dragType = e.dataTransfer.getData('dragType');

    if (dragType !== type || dragIndex === dropIndex || isNaN(dragIndex)) return;

    const list = type === 'income' ? [...incomeCategories] : [...expenseCategories];
    const [draggedItem] = list.splice(dragIndex, 1);
    list.splice(dropIndex, 0, draggedItem);

    const batch = writeBatch(db);
    list.forEach((cat, idx) => {
      const ref = doc(db, 'users', user.uid, 'categories', cat.id);
      batch.update(ref, { order: idx + 1 });
    });
    await batch.commit();
  };

  const handleLogout = () => signOut(auth);

  // --- Render Views ---
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-[#fafafa]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div></div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-[#fafafa] font-sans">
        <div className="bg-[#18181b] p-8 rounded-xl shadow-xl border border-[#27272a] text-center max-w-sm w-full">
          <TrendingUp size={48} className="mx-auto mb-6 text-indigo-500" />
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">財務預測大師</h1>
          <p className="text-zinc-500 text-sm mb-8">Personal Finance Planner V1</p>
          <button 
            onClick={handleLogin}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Google Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] font-sans flex flex-col md:flex-row">
      
      {/* Sidebar / Navigation */}
      <aside className="w-full md:w-64 bg-[#09090b] border-r border-[#27272a] flex flex-col shrink-0">
        <div className="p-6 border-b border-[#27272a]">
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <TrendingUp size={24} className="text-indigo-400" />
            財務預測大師
          </h1>
          <p className="text-xs text-zinc-500 mt-2 font-mono">FINANCE_PLANNER_V1</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('table')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${activeTab === 'table' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent'}`}
          >
            <TableIcon size={18} />
            月度總覽表
          </button>
          <button 
            onClick={() => setActiveTab('charts')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${activeTab === 'charts' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent'}`}
          >
            <PieChartIcon size={18} />
            數據分析看板
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${activeTab === 'settings' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent'}`}
          >
            <Settings size={18} />
            系統與分類
          </button>
        </nav>

        <div className="p-4 border-t border-[#27272a]">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-mono text-zinc-500 hover:text-red-400 transition-colors">
            <LogOut size={16} />
            登出 ({user?.uid.slice(0,6)})
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col h-screen bg-[#09090b]">
        <header className="bg-[#0c0c0e] border-b border-[#27272a] h-16 px-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-zinc-500 font-medium text-sm">Modules</span>
            <span className="text-zinc-700">/</span>
            <span className="text-zinc-100 font-semibold text-sm">
              {activeTab === 'table' && 'Financial_Overview_Grid'}
              {activeTab === 'charts' && 'Analytics_Dashboard'}
              {activeTab === 'settings' && 'System_Configuration'}
            </span>
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs rounded border border-emerald-500/20 font-mono hidden sm:inline-block">LIVE</span>
          </div>
          
          <div className="flex items-center gap-6">
            {activeTab === 'table' && (
              <button 
                onClick={addNextMonth}
                className="bg-zinc-100 text-zinc-950 px-4 py-1.5 rounded text-sm font-semibold hover:bg-white transition-colors flex items-center gap-2 shadow-sm"
              >
                <Plus size={16} />
                新增下個月
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-8 content-start">
          
          {/* TAB: TABLE */}
          {activeTab === 'table' && (
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
                      <th className="px-4 py-3 sticky left-0 bg-zinc-900/95 backdrop-blur z-30 border-b border-r border-zinc-800 font-semibold">月份</th>
                      <th className="px-4 py-3 border-b border-zinc-800 font-semibold">期初餘額</th>
                      
                      {/* Income Columns */}
                      {incomeCategories.map(cat => (
                        <th key={cat.id} className="px-4 py-3 border-b border-emerald-500/20 text-emerald-400 bg-emerald-500/5">{cat.name}</th>
                      ))}
                      <th className="px-4 py-3 border-b border-emerald-500/20 font-bold text-emerald-400 bg-emerald-500/10 border-r border-[#27272a]">總收入</th>
                      
                      {/* Expense Columns */}
                      {expenseCategories.map(cat => (
                        <th key={cat.id} className="px-4 py-3 border-b border-red-500/20 text-red-400 bg-red-500/5">{cat.name}</th>
                      ))}
                      <th className="px-4 py-3 border-b border-red-500/20 font-bold text-red-400 bg-red-500/10 border-r border-[#27272a]">總支出</th>
                      
                      <th className="px-4 py-3 border-b border-indigo-500/20 font-bold text-indigo-400 bg-indigo-500/10 border-r border-[#27272a]">淨現金流</th>
                      <th className="px-4 py-3 border-b border-indigo-500/20 font-bold text-indigo-300 bg-indigo-500/20">期末餘額</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {computedData.map((row) => (
                      <tr key={row.id} className="hover:bg-zinc-800/40 transition-colors group">
                        <td className="px-4 py-3 sticky left-0 bg-[#18181b] group-hover:bg-[#202024] z-10 border-r border-[#27272a] font-medium text-zinc-300 font-mono text-xs">
                          {row.month}
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-500 font-mono text-xs">
                          {formatCurrency(row.initialBalance)}
                        </td>
                        
                        {/* Income Cells */}
                        {incomeCategories.map(cat => (
                          <td key={cat.id} className="px-2 py-1 min-w-[100px] border-l border-zinc-800">
                            <NumberInputCell 
                              value={row.values[cat.id]} 
                              onChange={(val: number) => updateRecordValue(row.id, cat.id, val)} 
                            />
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right font-medium text-emerald-400 bg-emerald-500/5 border-x border-[#27272a] font-mono text-xs">
                          {formatCurrency(row.totalIncome)}
                        </td>

                        {/* Expense Cells */}
                        {expenseCategories.map(cat => (
                          <td key={cat.id} className="px-2 py-1 min-w-[100px] border-l border-zinc-800">
                            <NumberInputCell 
                              value={row.values[cat.id]} 
                              onChange={(val: number) => updateRecordValue(row.id, cat.id, val)} 
                            />
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right font-medium text-red-400 bg-red-500/5 border-x border-[#27272a] font-mono text-xs">
                          {formatCurrency(row.totalExpense)}
                        </td>

                        <td className={`px-4 py-3 text-right font-bold border-r border-[#27272a] font-mono text-xs ${row.netValue < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {row.netValue > 0 ? '+' : ''}{formatCurrency(row.netValue)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-indigo-400 bg-indigo-500/10 font-mono text-xs">
                          {formatCurrency(row.finalBalance)}
                        </td>
                      </tr>
                    ))}
                    {computedData.length === 0 && (
                      <tr>
                        <td colSpan={100} className="text-center py-12 text-zinc-600 font-mono text-xs">
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
                  <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">已啟用自動儲存</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">資料筆數: {computedData.length}</span>
              </div>
            </div>
          )}

          {/* TAB: CHARTS */}
          {activeTab === 'charts' && (
            <div className="grid grid-cols-12 gap-6 content-start">
              
              {/* Line Chart - Assets Trend */}
              <div className="col-span-12 bg-[#18181b] p-6 rounded-xl shadow-xl border border-[#27272a]">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                      <TrendingUp size={18} className="text-indigo-400"/> 
                      資產累積軌跡
                    </h3>
                    <p className="text-sm text-zinc-500">月底餘額模型預測</p>
                  </div>
                  <span className="text-xs font-mono text-indigo-400 px-2 py-1 bg-indigo-500/10 rounded border border-indigo-500/20">趨勢分析中</span>
                </div>
                
                <div className="h-72 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={computedData} syncId="finance-charts" margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                      <XAxis dataKey="month" stroke="#71717a" fontSize={11} tickMargin={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#71717a" fontSize={11} tickFormatter={(val) => `¥${val/1000}k`} tickLine={false} axisLine={false} />
                      <Tooltip 
                        content={<CustomLineTooltip />}
                        cursor={{ stroke: '#27272a', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      <Line type="monotone" dataKey="finalBalance" name="Balance" stroke="#818cf8" strokeWidth={3} dot={{ r: 4, fill: '#18181b', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#818cf8' }} />
                      <Brush dataKey="month" height={30} stroke="#4f46e5" fill="#09090b" tickFormatter={(val) => val} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Chart - Income vs Expense */}
              <div className="col-span-12 lg:col-span-7 bg-[#18181b] p-6 rounded-xl shadow-xl border border-[#27272a]">
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-zinc-100">收支差額分析</h3>
                  <p className="text-xs text-zinc-500 mt-1">每月現金流分析</p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={computedData} syncId="finance-charts" margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a"/>
                      <XAxis dataKey="month" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickMargin={10} />
                      <YAxis stroke="#71717a" fontSize={11} tickFormatter={(val) => `${val/1000}k`} tickLine={false} axisLine={false} />
                      <Tooltip 
                        content={<CustomBarTooltip />}
                        cursor={{ fill: '#27272a', opacity: 0.4 }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                      <Bar dataKey="totalIncome" name="Income" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="totalExpense" name="Expense" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie Chart - Expense Breakdown */}
              <div className="col-span-12 lg:col-span-5 bg-[#18181b] p-6 rounded-xl shadow-xl border border-[#27272a]">
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-zinc-100">全局支出分佈</h3>
                  <p className="text-xs text-zinc-500 mt-1">累積分類支出</p>
                </div>
                <div className="h-64">
                  {(() => {
                    const pieData = expenseCategories.map(cat => {
                      const total = computedData.reduce((sum, row) => sum + (row.values[cat.id] || 0), 0);
                      return { name: cat.name, value: total };
                    }).filter(d => d.value > 0);

                    const COLORS = ['#818cf8', '#34d399', '#f87171', '#facc15', '#2dd4bf', '#a78bfa', '#fb923c', '#f472b6'];

                    if (pieData.length === 0) return <div className="h-full flex items-center justify-center text-zinc-600 text-xs font-mono">[ 尚無數據 ]</div>;

                    return (
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
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            content={<CustomPieTooltip />}
                          />
                          <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }} iconType="circle"/>
                        </PieChart>
                      </ResponsiveContainer>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* TAB: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-4xl grid grid-cols-12 gap-6 content-start">
              
              {/* Base Balance Setting */}
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
                      onChange={(e) => updateBaseBalance(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex-1 text-xs text-zinc-400 bg-indigo-500/10 p-4 rounded-lg border border-indigo-500/20 leading-relaxed font-mono">
                    <span className="text-indigo-400 font-bold block mb-1">提示：</span>
                    修改此根參數將觸發所有後續月份數據的連鎖重新計算。
                  </div>
                </div>
              </div>

              {/* Categories Management */}
              <div className="col-span-12 bg-[#18181b] p-6 rounded-xl shadow-xl border border-[#27272a]">
                <h3 className="text-sm font-semibold text-zinc-100 mb-6">分類架構 (Taxonomy Schemas)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Income Cats */}
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-4 flex items-center justify-between border-b border-zinc-800 pb-3">
                      收入類別 (Income Vectors)
                      <button 
                        onClick={async () => {
                          const name = prompt("請輸入新的收入類別名稱：");
                          if (name) {
                            try {
                              const id = 'inc_' + Date.now();
                              await setDoc(doc(db, 'users', user.uid, 'categories', id), {
                                id, name, type: 'income', order: incomeCategories.length + 1
                              });
                            } catch (error: any) {
                              alert(`無法新增類別: ${error.message}`);
                              console.error(error);
                            }
                          }
                        }}
                        className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded hover:bg-emerald-500/20 transition-colors"
                      >+ 新增類別</button>
                    </h4>
                    <ul className="space-y-2">
                      {incomeCategories.map((cat, index) => (
                        <li 
                          key={cat.id} 
                          draggable
                          onDragStart={(e) => handleDragStart(e, index, 'income')}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, index, 'income')}
                          className="flex justify-between items-center bg-zinc-900/50 hover:bg-zinc-800/80 px-3 py-2 rounded-lg border border-[#27272a] shadow-sm cursor-grab active:cursor-grabbing transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <GripVertical size={14} className="text-zinc-600" />
                            <span className="text-sm text-zinc-300">{cat.name}</span>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                               <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">自動：</span>
                               <input 
                                  type="number" 
                                  placeholder="0"
                                  className="w-16 bg-zinc-950 border border-[#27272a] text-zinc-300 rounded px-2 py-0.5 text-xs text-right focus:outline-none focus:border-indigo-500 font-mono"
                                  value={cat.defaultAmount || ''}
                                  onChange={(e) => updateCategoryDefaultAmount(cat.id, parseInt(e.target.value))}
                               />
                            </div>
                            <button 
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                            ><Trash2 size={14}/></button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Expense Cats */}
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-4 flex items-center justify-between border-b border-zinc-800 pb-3">
                      支出類別 (Expense Vectors)
                      <button 
                        onClick={async () => {
                          const name = prompt("請輸入新的支出類別名稱：");
                          if (name) {
                            try {
                              const id = 'exp_' + Date.now();
                              await setDoc(doc(db, 'users', user.uid, 'categories', id), {
                                id, name, type: 'expense', order: expenseCategories.length + 1
                              });
                            } catch (error: any) {
                              alert(`無法新增類別: ${error.message}`);
                              console.error(error);
                            }
                          }
                        }}
                        className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded hover:bg-red-500/20 transition-colors"
                      >+ 新增類別</button>
                    </h4>
                    <ul className="space-y-2">
                      {expenseCategories.map((cat, index) => (
                        <li 
                          key={cat.id} 
                          draggable
                          onDragStart={(e) => handleDragStart(e, index, 'expense')}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, index, 'expense')}
                          className="flex justify-between items-center bg-zinc-900/50 hover:bg-zinc-800/80 px-3 py-2 rounded-lg border border-[#27272a] shadow-sm cursor-grab active:cursor-grabbing transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <GripVertical size={14} className="text-zinc-600" />
                            <span className="text-sm text-zinc-300">{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                               <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">自動：</span>
                               <input 
                                  type="number" 
                                  placeholder="0"
                                  className="w-16 bg-zinc-950 border border-[#27272a] text-zinc-300 rounded px-2 py-0.5 text-xs text-right focus:outline-none focus:border-indigo-500 font-mono"
                                  value={cat.defaultAmount || ''}
                                  onChange={(e) => updateCategoryDefaultAmount(cat.id, parseInt(e.target.value))}
                               />
                            </div>
                            <button 
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                            ><Trash2 size={14}/></button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}
