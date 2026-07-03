import { useState, useEffect, useRef } from 'react';
import type { Transaction, Category, Template, RecurringRule } from '../types/transaction';
import { suggestCategory } from '../utils/categoryPredict';
import { loadTemplates, saveTemplates, loadRecurringRules, saveRecurringRules } from '../utils/storage';

interface Props {
  onAdd: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onUpdate: (tx: Transaction) => void;
  onCancelEdit: () => void;
  lastTransaction?: Transaction;
  cloneFrom?: Transaction;
  editingTransaction?: Transaction;
  simpleMode?: boolean;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

const INCOME_CATS: Category[] = ['매출', '기타수입'];
const EXPENSE_CATS: Category[] = [
  '재료비/매입비', '임대료', '인건비', '통신비',
  '광고/마케팅비', '수수료(카드/플랫폼)', '소모품비', '기타경비',
];
const SIMPLE_EXPENSE_CATS: Category[] = ['원가', '광고비', '사무용품'];

// Default templates — never persisted to localStorage, always shown
const DEFAULT_TEMPLATES: Template[] = [
  { id: '__default_1', name: '배달 수수료', type: 'expense', amount: 0, vendor: '배달의민족', memo: '배달 수수료', category: '수수료(카드/플랫폼)' },
  { id: '__default_2', name: '카드 수수료', type: 'expense', amount: 0, vendor: '카드사', memo: '카드 수수료', category: '수수료(카드/플랫폼)' },
  { id: '__default_3', name: '매출 입금', type: 'income', amount: 0, vendor: '', memo: '매출', category: '매출' },
];

function isDefaultTemplate(id: string) { return id.startsWith('__default_'); }

export function TransactionForm({
  onAdd, onUpdate, onCancelEdit, lastTransaction, cloneFrom, editingTransaction, simpleMode,
}: Props) {
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [date, setDate] = useState(todayStr());
  const [amount, setAmount] = useState('');
  const [vendor, setVendor] = useState('');
  const [memo, setMemo] = useState('');
  const [category, setCategory] = useState<Category>('매출');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState<'monthly' | 'weekly'>('monthly');

  const [showMemoHint, setShowMemoHint] = useState(false);
  const [suggestedCat, setSuggestedCat] = useState<Category | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  // Only user-saved templates in state; defaults are always read from constant
  const [userTemplates, setUserTemplates] = useState<Template[]>(() => loadTemplates());

  const amountRef = useRef<HTMLInputElement>(null);
  const isEditing = !!editingTransaction;

  const expenseCats = simpleMode ? SIMPLE_EXPENSE_CATS : EXPENSE_CATS;
  const categories = type === 'income' ? INCOME_CATS : expenseCats;
  const allTemplates = [...DEFAULT_TEMPLATES, ...userTemplates];

  // Fill form when editing transaction changes
  useEffect(() => {
    if (!editingTransaction) return;
    setType(editingTransaction.type);
    setDate(editingTransaction.date);
    setAmount(editingTransaction.amount.toLocaleString());
    setVendor(editingTransaction.vendor);
    setMemo(editingTransaction.memo);
    setCategory(editingTransaction.category);
    setIsRecurring(editingTransaction.isRecurring);
    const freq = editingTransaction.recurringFrequency;
    if (freq === 'monthly' || freq === 'weekly') setRecurringFreq(freq);
    setSuggestedCat(null);
    window.scrollTo(0, 0);
  }, [editingTransaction]);

  // Auto-fill when cloning from list
  useEffect(() => {
    if (!cloneFrom) return;
    setType(cloneFrom.type);
    setDate(todayStr());
    setAmount(cloneFrom.amount.toLocaleString());
    setVendor(cloneFrom.vendor);
    setMemo(cloneFrom.memo);
    setCategory(cloneFrom.category);
    setIsRecurring(false);
    setSuggestedCat(null);
    amountRef.current?.focus();
  }, [cloneFrom]);

  // Auto-suggest category
  useEffect(() => {
    if (!vendor && !memo) { setSuggestedCat(null); return; }
    const suggested = suggestCategory(memo, vendor, type);
    if (suggested && suggested !== category) setSuggestedCat(suggested);
    else setSuggestedCat(null);
  }, [vendor, memo, type, category]);

  // Reset category default when type changes (but not during edit)
  useEffect(() => {
    if (isEditing) return;
    setCategory(type === 'income' ? '매출' : '기타경비');
    setSuggestedCat(null);
  }, [type, isEditing]);

  function formatAmount(val: string) {
    const n = val.replace(/[^0-9]/g, '');
    return n ? parseInt(n).toLocaleString() : '';
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const raw = parseFloat(amount.replace(/,/g, ''));
    if (!raw || raw <= 0) { amountRef.current?.focus(); return; }
    if (!memo.trim() && !showMemoHint) { setShowMemoHint(true); return; }

    if (isEditing && editingTransaction) {
      const updated: Transaction = {
        ...editingTransaction,
        date, type, amount: raw, vendor, memo, category,
        isRecurring,
        recurringFrequency: isRecurring ? recurringFreq : undefined,
      };
      onUpdate(updated);
    } else {
      const partial: Omit<Transaction, 'id' | 'createdAt'> = {
        date, type, amount: raw, vendor, memo, category,
        isRecurring,
        recurringFrequency: isRecurring ? recurringFreq : undefined,
      };
      if (isRecurring) {
        const rules = loadRecurringRules();
        const newRule: RecurringRule = {
          id: `rec-${Date.now()}`,
          frequency: recurringFreq,
          type, amount: raw, vendor, memo, category,
          nextDate: date,
          active: true,
        };
        saveRecurringRules([...rules, newRule]);
      }
      onAdd(partial);
    }
    resetForm();
  }

  function resetForm() {
    setAmount(''); setVendor(''); setMemo('');
    setDate(todayStr()); setIsRecurring(false); setSuggestedCat(null);
    setShowSaveTemplate(false); setTemplateName(''); setShowMemoHint(false);
  }

  function handleCopyLast() {
    if (!lastTransaction) return;
    setType(lastTransaction.type);
    setDate(todayStr());
    setAmount(lastTransaction.amount.toLocaleString());
    setVendor(lastTransaction.vendor);
    setMemo(lastTransaction.memo);
    setCategory(lastTransaction.category);
  }

  function applyTemplate(tpl: Template) {
    setType(tpl.type);
    setVendor(tpl.vendor);
    setMemo(tpl.memo);
    setCategory(tpl.category);
    if (tpl.amount > 0) setAmount(tpl.amount.toLocaleString());
    setShowTemplates(false);
    amountRef.current?.focus();
  }

  function handleSaveTemplate() {
    if (!templateName.trim()) return;
    const raw = parseFloat(amount.replace(/,/g, '')) || 0;
    const newTpl: Template = {
      id: `tpl-${Date.now()}`,
      name: templateName, type, amount: raw, vendor, memo, category,
    };
    const updated = [...userTemplates, newTpl];
    setUserTemplates(updated);
    saveTemplates(updated);
    setTemplateName(''); setShowSaveTemplate(false);
  }

  function deleteUserTemplate(id: string) {
    const updated = userTemplates.filter((t) => t.id !== id);
    setUserTemplates(updated);
    saveTemplates(updated);
  }

  return (
    <div className="form-card">
      <div className="form-header">
        <h2 className="form-title">
          {isEditing ? '✏️ 거래 수정' : '거래 입력'}
        </h2>
        <div className="form-actions-row">
          {!isEditing && lastTransaction && (
            <button className="btn-ghost btn-sm" onClick={handleCopyLast} title="최근 거래 복제">
              ↩ 복제
            </button>
          )}
          {!isEditing && (
            <button className="btn-ghost btn-sm" onClick={() => setShowTemplates((v) => !v)}>
              📋 템플릿
            </button>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="edit-banner">
          수정 중입니다. 변경사항을 저장하거나
          <button className="link-btn" onClick={() => { resetForm(); onCancelEdit(); }}>취소</button>
          할 수 있어요.
        </div>
      )}

      {showTemplates && !isEditing && (
        <div className="template-panel">
          <div className="template-list">
            {allTemplates.map((tpl) => (
              <div key={tpl.id} className="template-item">
                <button className="template-apply" onClick={() => applyTemplate(tpl)}>
                  <span className="tpl-name">{tpl.name}</span>
                  <span className={`tpl-type ${tpl.type}`}>
                    {tpl.type === 'income' ? '수입' : '지출'}
                  </span>
                  {tpl.amount > 0 && (
                    <span className="tpl-amount">{tpl.amount.toLocaleString()}원</span>
                  )}
                </button>
                {!isDefaultTemplate(tpl.id) && (
                  <button className="btn-icon-danger" onClick={() => deleteUserTemplate(tpl.id)}>✕</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="tx-form">
        <div className="type-toggle">
          <button
            type="button"
            className={`type-btn income ${type === 'income' ? 'active' : ''}`}
            onClick={() => setType('income')}
          >
            💰 돈 들어왔어요
          </button>
          <button
            type="button"
            className={`type-btn expense ${type === 'expense' ? 'active' : ''}`}
            onClick={() => setType('expense')}
          >
            💸 돈 나갔어요
          </button>
        </div>

        <label className="form-label">
          날짜
          <input type="date" className="form-input" value={date}
            onChange={(e) => setDate(e.target.value)} required />
        </label>

        <label className="form-label">
          금액 <span className="required">*</span>
          <div className="amount-wrapper">
            <input
              ref={amountRef}
              type="text" inputMode="numeric" className="form-input amount-input"
              placeholder="0" value={amount}
              onChange={(e) => setAmount(formatAmount(e.target.value))}
              required
            />
            <span className="amount-unit">원</span>
          </div>
        </label>

        <label className="form-label">
          거래처
          <input type="text" className="form-input"
            placeholder="예: 배달의민족, 쿠팡, 건물주"
            value={vendor} onChange={(e) => setVendor(e.target.value)} />
        </label>

        <label className="form-label">
          메모
          <input type="text" className="form-input"
            placeholder="예: 7월 임대료, 식자재 구입"
            value={memo} onChange={(e) => setMemo(e.target.value)} />
        </label>

        <label className="form-label">
          항목
          {suggestedCat && (
            <button type="button" className="suggestion-badge"
              onClick={() => { setCategory(suggestedCat); setSuggestedCat(null); }}>
              ✨ {suggestedCat}(으)로 자동 선택할까요?
            </button>
          )}
          <select className="form-input" value={category}
            onChange={(e) => { setCategory(e.target.value as Category); setSuggestedCat(null); }}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        {!isEditing && (
          <label className="form-label checkbox-label">
            <input type="checkbox" checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)} />
            <span>반복 거래로 등록</span>
          </label>
        )}

        {isRecurring && !isEditing && (
          <div className="recurring-options">
            <label className="form-label">
              반복 주기
              <select className="form-input" value={recurringFreq}
                onChange={(e) => setRecurringFreq(e.target.value as 'monthly' | 'weekly')}>
                <option value="monthly">매월</option>
                <option value="weekly">매주</option>
              </select>
            </label>
          </div>
        )}

        <div className="form-bottom">
          {isEditing ? (
            <div className="edit-action-row">
              <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                수정 완료
              </button>
              <button type="button" className="btn-ghost" onClick={() => { resetForm(); onCancelEdit(); }}>
                취소
              </button>
            </div>
          ) : (
            <>
              <button type="submit" className="btn-primary btn-full">
                {type === 'income' ? '💰 수입 기록' : '💸 지출 기록'}
              </button>
              <button type="button" className="btn-ghost btn-sm"
                onClick={() => setShowSaveTemplate((v) => !v)}>
                이 내용으로 템플릿 저장
              </button>
            </>
          )}
        </div>

        {showSaveTemplate && !isEditing && (
          <div className="save-template-row">
            <input type="text" className="form-input"
              placeholder="템플릿 이름 (예: 주간 식자재)"
              value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
            <button type="button" className="btn-secondary btn-sm" onClick={handleSaveTemplate}>
              저장
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
