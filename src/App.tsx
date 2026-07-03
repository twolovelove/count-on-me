import { useState, useCallback, useRef, useEffect } from 'react';
import type { Transaction, Industry, RecurringRule } from './types/transaction';
import {
  loadTransactions,
  saveTransactions,
  loadAppState,
  saveAppState,
  loadRecurringRules,
  saveRecurringRules,
  updateTransaction,
} from './utils/storage';
import { Onboarding } from './components/Onboarding';
import { TransactionForm } from './components/TransactionForm';
import { TransactionList } from './components/TransactionList';
import { Summary } from './components/Summary';
import { Checklist } from './components/Checklist';

type Tab = 'home' | 'list' | 'summary' | 'checklist';

function generateId() {
  return `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatHeaderAmount(n: number): string {
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(1)}천만`;
  if (n >= 1_000_000) return `${(n / 10_000).toFixed(0)}만`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}만`;
  return n.toLocaleString();
}

function applyDueRecurring(
  rules: RecurringRule[],
  today: string,
): { newTxs: Transaction[]; updatedRules: RecurringRule[] } {
  const newTxs: Transaction[] = [];
  const updatedRules = rules.map((rule) => {
    if (!rule.active) return rule;
    let nextDate = rule.nextDate;
    // while loop handles gap if app wasn't opened for multiple periods
    while (nextDate <= today) {
      newTxs.push({
        id: generateId(),
        date: nextDate,
        type: rule.type,
        amount: rule.amount,
        vendor: rule.vendor,
        memo: rule.memo,
        category: rule.category,
        isRecurring: true,
        recurringFrequency: rule.frequency,
        createdAt: new Date().toISOString(),
      });
      const next = new Date(nextDate + 'T00:00:00');
      if (rule.frequency === 'monthly') next.setMonth(next.getMonth() + 1);
      else next.setDate(next.getDate() + 7);
      nextDate = next.toISOString().slice(0, 10);
    }
    return { ...rule, nextDate };
  });
  return { newTxs, updatedRules };
}

export default function App() {
  const appState = loadAppState();
  const [onboardingDone, setOnboardingDone] = useState(appState.onboardingComplete);
  const [simpleMode, setSimpleMode] = useState(appState.simpleMode ?? false);
  const [tab, setTab] = useState<Tab>('home');

  const today = new Date().toISOString().slice(0, 10);
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const stored = loadTransactions();
    const rules = loadRecurringRules();
    if (rules.length === 0) return stored;
    const { newTxs, updatedRules } = applyDueRecurring(rules, today);
    if (newTxs.length > 0) {
      saveRecurringRules(updatedRules);
      const merged = [...newTxs, ...stored];
      saveTransactions(merged);
      return merged;
    }
    return stored;
  });

  const [lastTx, setLastTx] = useState<Transaction | undefined>(transactions[0]);
  const [cloneFrom, setCloneFrom] = useState<Transaction | undefined>();
  const [editingTx, setEditingTx] = useState<Transaction | undefined>();

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function showToast(msg: string, type: 'success' | 'info' = 'success') {
    clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }
  useEffect(() => {
    const timer = toastTimer.current;
    return () => clearTimeout(timer);
  }, []);

  const handleOnboardingComplete = useCallback(
    (
      industry: Industry,
      firstTx?: Omit<Transaction, 'id' | 'createdAt'>,
      recurringRule?: Omit<RecurringRule, 'id'>,
    ) => {
      saveAppState({ onboardingComplete: true, industry });
      let updated = [...transactions];
      if (firstTx) {
        const tx: Transaction = { ...firstTx, id: generateId(), createdAt: new Date().toISOString() };
        updated = [tx, ...updated];
        setLastTx(tx);
      }
      if (recurringRule) {
        const rules = loadRecurringRules();
        saveRecurringRules([...rules, { ...recurringRule, id: `rec-${Date.now()}` }]);
      }
      saveTransactions(updated);
      setTransactions(updated);
      setOnboardingDone(true);
      setTab('home');
    },
    [transactions],
  );

  const handleAdd = useCallback(
    (partial: Omit<Transaction, 'id' | 'createdAt'>) => {
      const tx: Transaction = { ...partial, id: generateId(), createdAt: new Date().toISOString() };
      const updated = [tx, ...transactions];
      saveTransactions(updated);
      setTransactions(updated);
      setLastTx(tx);
      setCloneFrom(undefined);
      showToast('거래가 기록됐어요 ✓');
      setTab('list');
    },
    [transactions],
  );

  const handleUpdate = useCallback(
    (tx: Transaction) => {
      const updated = updateTransaction(tx);
      setTransactions(updated);
      setEditingTx(undefined);
      showToast('수정됐어요 ✓');
      setTab('list');
    },
    [],
  );

  const handleEditRequest = useCallback((tx: Transaction) => {
    setEditingTx(tx);
    setCloneFrom(undefined);
    setTab('home');
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingTx(undefined);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      const updated = transactions.filter((t) => t.id !== id);
      saveTransactions(updated);
      setTransactions(updated);
      if (lastTx?.id === id) setLastTx(updated[0]);
      showToast('삭제됐어요', 'info');
    },
    [transactions, lastTx],
  );

  const handleCloneRequest = useCallback((tx: Transaction) => {
    setCloneFrom(tx);
    setEditingTx(undefined);
    setTab('home');
  }, []);

  const handleImport = useCallback(
    (imported: Transaction[]) => {
      const updated = [...imported, ...transactions];
      saveTransactions(updated);
      setTransactions(updated);
    },
    [transactions],
  );

  const handleToggleSimpleMode = useCallback(() => {
    setSimpleMode((prev) => {
      const next = !prev;
      const state = loadAppState();
      saveAppState({ ...state, simpleMode: next });
      return next;
    });
  }, []);

  if (!onboardingDone) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const thisMonth = today.slice(0, 7);
  const monthlyIncome = transactions
    .filter((t) => t.date.startsWith(thisMonth) && t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const monthlyExpense = transactions
    .filter((t) => t.date.startsWith(thisMonth) && t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  const balanceDiff = monthlyIncome - monthlyExpense;
  const balanceClass = balanceDiff > 0 ? 'pos' : balanceDiff < 0 ? 'neg' : 'zero';
  const balanceText = `${balanceDiff >= 0 ? '+' : ''}${formatHeaderAmount(balanceDiff)}원`;

  return (
    <div className="app">
      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
      )}

      {/* Desktop sidebar — hidden on mobile via CSS */}
      <aside className="desktop-sidebar">
        <div className="desktop-sidebar-top">
          <span className="logo">내 장부</span>
          <div className="desktop-balance">
            <span className="header-balance-label">이번달 순이익</span>
            <span className={`header-balance-value ${balanceClass}`}>{balanceText}</span>
          </div>
        </div>
        <nav className="desktop-nav">
          <button
            className={`desktop-nav-btn ${tab === 'home' ? 'active' : ''}`}
            onClick={() => { setEditingTx(undefined); setTab('home'); }}
          >
            <span className="nav-icon">✏️</span>
            <span>입력</span>
          </button>
          <button
            className={`desktop-nav-btn ${tab === 'list' ? 'active' : ''}`}
            onClick={() => setTab('list')}
          >
            <span className="nav-icon">📋</span>
            <span>내역</span>
          </button>
          <button
            className={`desktop-nav-btn ${tab === 'summary' ? 'active' : ''}`}
            onClick={() => setTab('summary')}
          >
            <span className="nav-icon">📊</span>
            <span>요약</span>
          </button>
          <button
            className={`desktop-nav-btn ${tab === 'checklist' ? 'active' : ''}`}
            onClick={() => setTab('checklist')}
          >
            <span className="nav-icon">📅</span>
            <span>일정</span>
          </button>
        </nav>
      </aside>

      {/* Mobile-only header */}
      <header className="app-header">
        <div className="header-inner">
          <span className="logo">내 장부</span>
          <div className="header-balance">
            <span className="header-balance-label">이번달 순이익</span>
            <span className={`header-balance-value ${balanceClass}`}>{balanceText}</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        {tab === 'home' && (
          <TransactionForm
            onAdd={handleAdd}
            onUpdate={handleUpdate}
            onCancelEdit={handleCancelEdit}
            lastTransaction={lastTx}
            cloneFrom={cloneFrom}
            editingTransaction={editingTx}
            simpleMode={simpleMode}
          />
        )}
        {tab === 'list' && (
          <TransactionList
            transactions={transactions}
            onDelete={handleDelete}
            onEdit={handleEditRequest}
            onClone={handleCloneRequest}
            onImport={handleImport}
          />
        )}
        {tab === 'summary' && (
          <Summary
            transactions={transactions}
            simpleMode={simpleMode}
            onToggleSimpleMode={handleToggleSimpleMode}
          />
        )}
        {tab === 'checklist' && <Checklist />}
      </main>

      {/* Mobile-only bottom nav */}
      <nav className="bottom-nav">
        <button
          className={`nav-btn ${tab === 'home' ? 'active' : ''}`}
          onClick={() => { setEditingTx(undefined); setTab('home'); }}
        >
          <span className="nav-icon">✏️</span>
          <span>입력</span>
        </button>
        <button
          className={`nav-btn ${tab === 'list' ? 'active' : ''}`}
          onClick={() => setTab('list')}
        >
          <span className="nav-icon">📋</span>
          <span>내역</span>
        </button>
        <button
          className={`nav-btn ${tab === 'summary' ? 'active' : ''}`}
          onClick={() => setTab('summary')}
        >
          <span className="nav-icon">📊</span>
          <span>요약</span>
        </button>
        <button
          className={`nav-btn ${tab === 'checklist' ? 'active' : ''}`}
          onClick={() => setTab('checklist')}
        >
          <span className="nav-icon">📅</span>
          <span>일정</span>
        </button>
      </nav>
    </div>
  );
}
