import type { Transaction, Template, RecurringRule, AppState } from '../types/transaction';

const KEYS = {
  transactions: 'count_transactions',
  templates: 'count_templates',
  recurringRules: 'count_recurring_rules',
  appState: 'count_app_state',
} as const;

function parse<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// Transactions
export function loadTransactions(): Transaction[] {
  return parse<Transaction[]>(KEYS.transactions, []);
}

export function saveTransactions(transactions: Transaction[]): void {
  save(KEYS.transactions, transactions);
}

export function addTransaction(tx: Transaction): Transaction[] {
  const all = loadTransactions();
  const updated = [tx, ...all];
  saveTransactions(updated);
  return updated;
}

export function deleteTransaction(id: string): Transaction[] {
  const updated = loadTransactions().filter((t) => t.id !== id);
  saveTransactions(updated);
  return updated;
}

export function updateTransaction(updated: Transaction): Transaction[] {
  const all = loadTransactions().map((t) => (t.id === updated.id ? updated : t));
  saveTransactions(all);
  return all;
}

// Templates
export function loadTemplates(): Template[] {
  return parse<Template[]>(KEYS.templates, []);
}

export function saveTemplates(templates: Template[]): void {
  save(KEYS.templates, templates);
}

// Recurring rules
export function loadRecurringRules(): RecurringRule[] {
  return parse<RecurringRule[]>(KEYS.recurringRules, []);
}

export function saveRecurringRules(rules: RecurringRule[]): void {
  save(KEYS.recurringRules, rules);
}

// App state (onboarding etc.)
export function loadAppState(): AppState {
  return parse<AppState>(KEYS.appState, { onboardingComplete: false, industry: null });
}

export function saveAppState(state: AppState): void {
  save(KEYS.appState, state);
}
