import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {User} from 'firebase/auth';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  setDoc,
  writeBatch,
} from 'firebase/firestore';

import {auth, db} from '../firebase';
import type {
  Allocation,
  AllocationTargetMode,
  Category,
  ComputedRow,
  FinanceRecord,
  GroupItem,
  Settings,
} from '../types';
import {getAmount, sumItems} from '../utils/finance';
import {getCurrentMonthStr, getNextMonthStr} from '../utils/format';

const DEFAULT_CATEGORIES: Category[] = [
  {id: 'inc_salary', name: '薪資收入', type: 'income', order: 1},
  {id: 'inc_bonus', name: '獎金/其他', type: 'income', order: 2},
  {id: 'exp_housing', name: '房租/房貸', type: 'expense', order: 1},
  {id: 'exp_food', name: '餐飲生活', type: 'expense', order: 2},
  {id: 'exp_transport', name: '交通通訊', type: 'expense', order: 3},
  {id: 'exp_insurance', name: '保險/醫療', type: 'expense', order: 4},
];

export function useFinanceData() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [settings, setSettings] = useState<Settings>({baseInitialBalance: 0});
  const [allocations, setAllocations] = useState<Allocation[]>([]);

  const seededCategoriesRef = useRef(false);
  const seededRecordsRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setCategories([]);
      setRecords([]);
      setSettings({baseInitialBalance: 0});
      setAllocations([]);
      seededCategoriesRef.current = false;
      seededRecordsRef.current = false;
      return;
    }
    seededCategoriesRef.current = false;
    seededRecordsRef.current = false;

    const userDocRef = doc(db, 'users', user.uid);

    const unsubCategories = onSnapshot(
      collection(userDocRef, 'categories'),
      (snap) => {
        if (snap.empty && !seededCategoriesRef.current) {
          seededCategoriesRef.current = true;
          const batch = writeBatch(db);
          DEFAULT_CATEGORIES.forEach((cat) => {
            batch.set(doc(collection(userDocRef, 'categories'), cat.id), cat);
          });
          batch.commit().catch(console.error);
          return;
        }
        seededCategoriesRef.current = true;
        const cats = snap.docs
          .map((d) => ({id: d.id, ...d.data()} as Category))
          .sort((a, b) => a.order - b.order);
        setCategories(cats);
      },
      console.error,
    );

    const unsubRecords = onSnapshot(
      collection(userDocRef, 'records'),
      (snap) => {
        if (snap.empty && !seededRecordsRef.current) {
          seededRecordsRef.current = true;
          const currentMonth = getCurrentMonthStr();
          setDoc(doc(collection(userDocRef, 'records'), currentMonth), {
            month: currentMonth,
            values: {},
          }).catch(console.error);
          return;
        }
        seededRecordsRef.current = true;
        const recs = snap.docs.map(
          (d) => ({id: d.id, ...d.data()} as FinanceRecord),
        );
        setRecords(recs);
      },
      console.error,
    );

    const unsubSettings = onSnapshot(
      doc(userDocRef, 'settings', 'general'),
      (docSnap) => {
        if (docSnap.exists()) {
          setSettings(docSnap.data() as Settings);
        } else {
          setDoc(doc(userDocRef, 'settings', 'general'), {
            baseInitialBalance: 0,
          }).catch(console.error);
        }
      },
      console.error,
    );

    const unsubAllocations = onSnapshot(
      collection(userDocRef, 'allocations'),
      (snap) => {
        const allocs = snap.docs
          .map((d) => ({id: d.id, ...d.data()} as Allocation))
          .sort((a, b) => a.order - b.order);
        setAllocations(allocs);
      },
      console.error,
    );

    return () => {
      unsubCategories();
      unsubRecords();
      unsubSettings();
      unsubAllocations();
    };
  }, [user]);

  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === 'income'),
    [categories],
  );
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories],
  );

  const computedData = useMemo<ComputedRow[]>(() => {
    const sortedRecords = [...records].sort((a, b) =>
      a.month.localeCompare(b.month),
    );

    let runningBalance = settings.baseInitialBalance || 0;

    return sortedRecords.map((record) => {
      const values = record.values || {};
      let totalIncome = 0;
      let totalExpense = 0;

      incomeCategories.forEach((cat) => {
        totalIncome += getAmount(values[cat.id]);
      });
      expenseCategories.forEach((cat) => {
        totalExpense += getAmount(values[cat.id]);
      });

      const netValue = totalIncome - totalExpense;
      const initialBalance = runningBalance;
      const finalBalance = initialBalance + netValue;
      runningBalance = finalBalance;

      return {
        ...record,
        values,
        initialBalance,
        totalIncome,
        totalExpense,
        netValue,
        finalBalance,
      };
    });
  }, [records, settings.baseInitialBalance, incomeCategories, expenseCategories]);

  const login = useCallback(async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Auth Error:', err);
    }
  }, []);

  const logout = useCallback(() => signOut(auth), []);

  const updateRecordValue = useCallback(
    async (monthId: string, categoryId: string, value: number) => {
      if (!user) return;
      const recordRef = doc(db, 'users', user.uid, 'records', monthId);
      const existingRecord = records.find((r) => r.id === monthId);
      const newValues = {...(existingRecord?.values || {})};
      newValues[categoryId] = value;
      await setDoc(recordRef, {month: monthId, values: newValues}, {merge: true});
    },
    [user, records],
  );

  const addNextMonth = useCallback(async () => {
    if (!user) return;

    let targetMonth: string;
    if (records.length === 0) {
      targetMonth = getCurrentMonthStr();
    } else {
      const sortedRecords = [...records].sort((a, b) =>
        a.month.localeCompare(b.month),
      );
      targetMonth = getNextMonthStr(sortedRecords[sortedRecords.length - 1].month);
    }

    const newValues: FinanceRecord['values'] = {};
    categories.forEach((cat) => {
      if (cat.isGroup) {
        newValues[cat.id] = {total: 0, items: []};
      } else if (cat.defaultAmount && cat.defaultAmount > 0) {
        newValues[cat.id] = cat.defaultAmount;
      }
    });

    await setDoc(doc(db, 'users', user.uid, 'records', targetMonth), {
      month: targetMonth,
      values: newValues,
    });
  }, [user, records, categories]);

  const updateBaseBalance = useCallback(
    async (val: number) => {
      if (!user) return;
      await setDoc(
        doc(db, 'users', user.uid, 'settings', 'general'),
        {baseInitialBalance: val},
        {merge: true},
      );
    },
    [user],
  );

  const updateSavingsRate = useCallback(
    async (val: number) => {
      if (!user) return;
      await setDoc(
        doc(db, 'users', user.uid, 'settings', 'general'),
        {monthlySavingsRate: val},
        {merge: true},
      );
    },
    [user],
  );

  const deleteCategory = useCallback(
    async (categoryId: string, categoryName: string) => {
      if (!user) return;
      if (
        !window.confirm(`確定要刪除分類 "${categoryName}" 嗎？此操作無法還原。`)
      )
        return;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'categories', categoryId));
      } catch (err) {
        console.error('Delete category failed:', err);
        alert(`無法刪除分類: ${(err as Error).message}`);
      }
    },
    [user],
  );

  const renameCategory = useCallback(
    async (categoryId: string, currentName: string) => {
      if (!user) return;
      const newName = window.prompt('請輸入新的類別名稱：', currentName);
      if (newName === null) return;
      const trimmed = newName.trim();
      if (trimmed === '' || trimmed === currentName) return;
      try {
        await setDoc(
          doc(db, 'users', user.uid, 'categories', categoryId),
          {name: trimmed},
          {merge: true},
        );
      } catch (err) {
        console.error('Rename category failed:', err);
        alert(`無法重新命名: ${(err as Error).message}`);
      }
    },
    [user],
  );

  const removeLastMonth = useCallback(async () => {
    if (!user || records.length === 0) return;
    const sorted = [...records].sort((a, b) => a.month.localeCompare(b.month));
    const last = sorted[sorted.length - 1];
    if (!window.confirm(`確定要刪除最新月份 ${last.month} 嗎？此操作無法還原。`))
      return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'records', last.id));
    } catch (err) {
      console.error('Delete last month failed:', err);
      alert(`無法刪除月份: ${(err as Error).message}`);
    }
  }, [user, records]);

  const updateCategoryDefaultAmount = useCallback(
    async (categoryId: string, amount: number | null) => {
      if (!user) return;
      const ref = doc(db, 'users', user.uid, 'categories', categoryId);
      if (amount === null || amount <= 0 || isNaN(amount)) {
        await setDoc(ref, {defaultAmount: deleteField()}, {merge: true});
      } else {
        await setDoc(ref, {defaultAmount: amount}, {merge: true});
      }
    },
    [user],
  );

  const addCategory = useCallback(
    async (name: string, type: 'income' | 'expense') => {
      if (!user) return;
      const id = (type === 'income' ? 'inc_' : 'exp_') + Date.now();
      const list = type === 'income' ? incomeCategories : expenseCategories;
      await setDoc(doc(db, 'users', user.uid, 'categories', id), {
        id,
        name,
        type,
        order: list.length + 1,
      });
    },
    [user, incomeCategories, expenseCategories],
  );

  const toggleCategoryGroup = useCallback(
    async (categoryId: string, nextIsGroup: boolean) => {
      if (!user) return;
      const modeLabel = nextIsGroup ? '明細模式 (group)' : '單值模式 (flat)';
      if (
        !window.confirm(
          `切換為${modeLabel}會清空此類別在所有月份的已輸入資料，是否繼續？`,
        )
      )
        return;
      try {
        const batch = writeBatch(db);
        batch.update(doc(db, 'users', user.uid, 'categories', categoryId), {
          isGroup: nextIsGroup,
        });
        records.forEach((record) => {
          if (record.values && categoryId in record.values) {
            const reset = nextIsGroup ? {total: 0, items: []} : 0;
            batch.set(
              doc(db, 'users', user.uid, 'records', record.id),
              {values: {[categoryId]: reset}},
              {merge: true},
            );
          }
        });
        await batch.commit();
      } catch (err) {
        console.error('Toggle category group failed:', err);
        alert(`無法切換模式: ${(err as Error).message}`);
      }
    },
    [user, records],
  );

  const updateCategoryItems = useCallback(
    async (monthId: string, categoryId: string, items: GroupItem[]) => {
      if (!user) return;
      const recordRef = doc(db, 'users', user.uid, 'records', monthId);
      const existingRecord = records.find((r) => r.id === monthId);
      const newValues = {...(existingRecord?.values || {})};
      newValues[categoryId] = {total: sumItems(items), items};
      try {
        await setDoc(
          recordRef,
          {month: monthId, values: newValues},
          {merge: true},
        );
      } catch (err) {
        console.error('Update category items failed:', err);
        alert(`無法儲存明細: ${(err as Error).message}`);
      }
    },
    [user, records],
  );

  const reorderCategories = useCallback(
    async (type: 'income' | 'expense', fromIdx: number, toIdx: number) => {
      if (!user) return;
      const list = type === 'income' ? [...incomeCategories] : [...expenseCategories];
      if (fromIdx === toIdx) return;
      const [dragged] = list.splice(fromIdx, 1);
      list.splice(toIdx, 0, dragged);

      const batch = writeBatch(db);
      list.forEach((cat, idx) => {
        const ref = doc(db, 'users', user.uid, 'categories', cat.id);
        batch.update(ref, {order: idx + 1});
      });
      await batch.commit();
    },
    [user, incomeCategories, expenseCategories],
  );

  const addAllocation = useCallback(
    async (
      name: string,
      targetMode: AllocationTargetMode,
      targetValue: number,
    ) => {
      if (!user) return;
      const id = 'alloc_' + Date.now();
      try {
        await setDoc(doc(db, 'users', user.uid, 'allocations', id), {
          id,
          name,
          targetMode,
          targetValue,
          order: allocations.length + 1,
          archived: false,
        });
      } catch (err) {
        console.error('Add allocation failed:', err);
        alert(`無法新增分類: ${(err as Error).message}`);
      }
    },
    [user, allocations],
  );

  const updateAllocation = useCallback(
    async (
      id: string,
      patch: Partial<Omit<Allocation, 'id'>>,
    ) => {
      if (!user) return;
      try {
        await setDoc(
          doc(db, 'users', user.uid, 'allocations', id),
          patch,
          {merge: true},
        );
      } catch (err) {
        console.error('Update allocation failed:', err);
        alert(`無法更新分類: ${(err as Error).message}`);
      }
    },
    [user],
  );

  const deleteAllocation = useCallback(
    async (id: string, name: string) => {
      if (!user) return;
      if (
        !window.confirm(`確定要刪除存款分類 "${name}" 嗎？此操作無法還原。`)
      )
        return;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'allocations', id));
      } catch (err) {
        console.error('Delete allocation failed:', err);
        alert(`無法刪除分類: ${(err as Error).message}`);
      }
    },
    [user],
  );

  const archiveAllocation = useCallback(
    async (id: string, archive: boolean) => {
      if (!user) return;
      try {
        await setDoc(
          doc(db, 'users', user.uid, 'allocations', id),
          archive
            ? {archived: true, archivedAt: Date.now()}
            : {archived: false, archivedAt: deleteField()},
          {merge: true},
        );
      } catch (err) {
        console.error('Archive allocation failed:', err);
        alert(`無法封存分類: ${(err as Error).message}`);
      }
    },
    [user],
  );

  const reorderAllocations = useCallback(
    async (fromIdx: number, toIdx: number) => {
      if (!user || fromIdx === toIdx) return;
      const activeList = allocations.filter((a) => !a.archived);
      if (
        fromIdx < 0 ||
        fromIdx >= activeList.length ||
        toIdx < 0 ||
        toIdx >= activeList.length
      )
        return;
      const list = [...activeList];
      const [dragged] = list.splice(fromIdx, 1);
      list.splice(toIdx, 0, dragged);
      try {
        const batch = writeBatch(db);
        list.forEach((a, idx) => {
          batch.update(doc(db, 'users', user.uid, 'allocations', a.id), {
            order: idx + 1,
          });
        });
        await batch.commit();
      } catch (err) {
        console.error('Reorder allocations failed:', err);
        alert(`無法重新排序: ${(err as Error).message}`);
      }
    },
    [user, allocations],
  );

  return {
    user,
    loading,
    categories,
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
    updateSavingsRate,
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
  };
}
