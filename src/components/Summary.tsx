import { useMemo, useState } from 'react';
import type { Transaction, RecurringRule } from '../types/transaction';
import { estimateTax } from '../utils/taxEstimate';
import { loadRecurringRules, saveRecurringRules } from '../utils/storage';

interface Props {
  transactions: Transaction[];
  simpleMode: boolean;
  onToggleSimpleMode: () => void;
}

export function Summary({ transactions, simpleMode, onToggleSimpleMode }: Props) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [showTax, setShowTax] = useState(false);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>(() => loadRecurringRules());
  const [showRecurring, setShowRecurring] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const yearStr = String(selectedYear);

  function goToPrevMonth() {
    if (selectedMonth === 1) { setSelectedYear((y) => y - 1); setSelectedMonth(12); }
    else setSelectedMonth((m) => m - 1);
  }
  function goToNextMonth() {
    const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;
    if (isCurrentMonth) return;
    if (selectedMonth === 12) { setSelectedYear((y) => y + 1); setSelectedMonth(1); }
    else setSelectedMonth((m) => m + 1);
  }
  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;

  const monthlyStats = useMemo(() => {
    const txs = transactions.filter((t) => t.date.startsWith(monthStr));
    const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, profit: income - expense };
  }, [transactions, monthStr]);

  const yearlyStats = useMemo(() => {
    const txs = transactions.filter((t) => t.date.startsWith(yearStr));
    const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, profit: income - expense };
  }, [transactions, yearStr]);

  const taxEstimate = useMemo(() => estimateTax(yearlyStats.income), [yearlyStats.income]);

  const categoryBreakdown = useMemo(() => {
    const txs = transactions.filter((t) => t.date.startsWith(monthStr) && t.type === 'expense');
    const map = new Map<string, number>();
    for (const t of txs) map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [transactions, monthStr]);

  const years = useMemo(() => {
    const ys = new Set(transactions.map((t) => Number(t.date.slice(0, 4))));
    ys.add(now.getFullYear());
    return [...ys].sort((a, b) => b - a);
  }, [transactions, now]);

  function deleteRecurringRule(id: string) {
    const updated = recurringRules.filter((r) => r.id !== id);
    setRecurringRules(updated);
    saveRecurringRules(updated);
  }

  function toggleRecurringActive(id: string) {
    const updated = recurringRules.map((r) => r.id === id ? { ...r, active: !r.active } : r);
    setRecurringRules(updated);
    saveRecurringRules(updated);
  }

  function fmt(n: number) { return n.toLocaleString(); }
  function pct(part: number, total: number) {
    if (!total) return 0;
    return Math.round((part / total) * 100);
  }

  const monthLabel = `${selectedYear}년 ${selectedMonth}월`;
  const FREQ_LABEL: Record<string, string> = { monthly: '매월', weekly: '매주', once: '1회' };

  return (
    <div className="summary-card">
      {/* Month navigator */}
      <div className="month-nav">
        <button className="month-nav-btn" onClick={goToPrevMonth}>‹</button>
        <div className="month-nav-center">
          <select className="form-input select-sm" value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select className="form-input select-sm" value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{m}월</option>
            ))}
          </select>
        </div>
        <button className="month-nav-btn" onClick={goToNextMonth}
          disabled={isCurrentMonth} style={{ opacity: isCurrentMonth ? 0.3 : 1 }}>›</button>
      </div>

      {/* Monthly KPI */}
      <div className="kpi-grid">
        <div className="kpi-card income">
          <span className="kpi-label">{monthLabel} 수입</span>
          <span className="kpi-value">+{fmt(monthlyStats.income)}원</span>
        </div>
        <div className="kpi-card expense">
          <span className="kpi-label">{monthLabel} 지출</span>
          <span className="kpi-value">-{fmt(monthlyStats.expense)}원</span>
        </div>
        <div className={`kpi-card profit ${monthlyStats.profit >= 0 ? 'positive' : 'negative'}`}>
          <span className="kpi-label">순이익</span>
          <span className="kpi-value">
            {monthlyStats.profit >= 0 ? '+' : ''}{fmt(monthlyStats.profit)}원
          </span>
        </div>
      </div>

      {/* Expense breakdown */}
      {categoryBreakdown.length > 0 ? (
        <div className="category-breakdown">
          <h3 className="breakdown-title">{monthLabel} 지출 항목</h3>
          {categoryBreakdown.map(([cat, amount]) => (
            <div key={cat} className="breakdown-row">
              <span className="breakdown-cat">{cat}</span>
              <div className="breakdown-bar-wrap">
                <div className="breakdown-bar"
                  style={{ width: `${pct(amount, monthlyStats.expense)}%` }} />
              </div>
              <span className="breakdown-amount">{fmt(amount)}원</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-breakdown">
          <p>{monthLabel}에 지출 기록이 없어요</p>
        </div>
      )}

      {/* Yearly + tax */}
      <div className="yearly-section">
        <div className="yearly-header" onClick={() => setShowTax((v) => !v)}>
          <h3 className="breakdown-title">{selectedYear}년 연간 현황</h3>
          <span className="toggle-arrow">{showTax ? '▲' : '▼'}</span>
        </div>
        <div className="yearly-kpis">
          <div className="yearly-stat">
            <span>총 수입</span>
            <span className="income-text">{fmt(yearlyStats.income)}원</span>
          </div>
          <div className="yearly-stat">
            <span>총 지출</span>
            <span className="expense-text">{fmt(yearlyStats.expense)}원</span>
          </div>
          <div className="yearly-stat">
            <span>순이익</span>
            <span className={yearlyStats.profit >= 0 ? 'income-text' : 'expense-text'}>
              {fmt(yearlyStats.profit)}원
            </span>
          </div>
        </div>

        {showTax && yearlyStats.income > 0 && (
          <div className="tax-section">
            <div className="tax-disclaimer-badge">
              ⚠️ 아래 수치는 참고용 추정치입니다. 실제 납부액과 다를 수 있어요.
            </div>
            <div className="tax-rows">
              <div className="tax-row">
                <span>추정 사업 소득 (단순경비율 60%)</span>
                <span>{fmt(taxEstimate.estimatedIncome)}원</span>
              </div>
              <div className="tax-row highlight">
                <span>예상 종합소득세</span>
                <span>{fmt(taxEstimate.taxAfter)}원</span>
              </div>
            </div>
            <p className="tax-note">{taxEstimate.disclaimer}</p>
            <div className="vat-placeholder">
              <span className="vat-label">부가가치세 예측</span>
              <span className="badge-coming">준비 중</span>
            </div>
          </div>
        )}

        {showTax && yearlyStats.income === 0 && (
          <p className="tax-empty">연간 수입을 입력하면 세금 예측이 나타나요</p>
        )}
      </div>

      {/* Settings */}
      <div className="recurring-section">
        <div className="yearly-header" onClick={() => setShowSettings((v) => !v)}>
          <h3 className="breakdown-title">⚙️ 설정</h3>
          <span className="toggle-arrow">{showSettings ? '▲' : '▼'}</span>
        </div>
        {showSettings && (
          <div className="settings-list">
            <div className="settings-row">
              <div className="settings-info">
                <span className="settings-label">초심플 카테고리 모드</span>
                <span className="settings-desc">
                  {simpleMode
                    ? '원가 / 광고비 / 사무용품 (3분류)'
                    : '기본 8개 카테고리 (재료비, 임대료 등)'}
                </span>
              </div>
              <button
                className={`toggle-switch ${simpleMode ? 'on' : ''}`}
                onClick={onToggleSimpleMode}
                aria-label="초심플 카테고리 모드 토글"
              >
                <span className="toggle-knob" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recurring rules management */}
      <div className="recurring-section">
        <div className="yearly-header" onClick={() => setShowRecurring((v) => !v)}>
          <h3 className="breakdown-title">🔄 반복 거래 관리</h3>
          <span className="toggle-arrow">
            {recurringRules.length > 0 && (
              <span className="rule-count">{recurringRules.length}개</span>
            )}
            {showRecurring ? '▲' : '▼'}
          </span>
        </div>

        {showRecurring && (
          <div className="recurring-list">
            {recurringRules.length === 0 ? (
              <p className="recurring-empty">등록된 반복 거래가 없어요.<br />거래 입력 시 "반복 거래로 등록"을 체크해 보세요.</p>
            ) : (
              recurringRules.map((rule) => (
                <div key={rule.id} className={`recurring-rule-item ${rule.active ? '' : 'paused'}`}>
                  <div className="recurring-rule-info">
                    <span className="recurring-rule-name">
                      {rule.vendor || rule.memo || rule.category}
                    </span>
                    <span className="recurring-rule-meta">
                      {FREQ_LABEL[rule.frequency]} · {rule.type === 'expense' ? '-' : '+'}{fmt(rule.amount)}원
                    </span>
                    <span className="recurring-rule-next">
                      다음 예정: {rule.nextDate}
                    </span>
                  </div>
                  <div className="recurring-rule-actions">
                    <button
                      className={`btn-ghost btn-sm ${rule.active ? '' : 'paused-btn'}`}
                      onClick={() => toggleRecurringActive(rule.id)}
                      title={rule.active ? '일시정지' : '다시 시작'}
                    >
                      {rule.active ? '⏸' : '▶'}
                    </button>
                    <button className="btn-danger btn-sm"
                      onClick={() => { if (confirm('이 반복 거래를 삭제할까요?')) deleteRecurringRule(rule.id); }}>
                      삭제
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
