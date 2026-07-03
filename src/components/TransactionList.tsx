import { useState, useMemo, useRef } from 'react';
import type { Transaction } from '../types/transaction';
import { parseCsv } from '../utils/csvImport';
import { exportHometaxCsv } from '../utils/csvExport';

interface Props {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (tx: Transaction) => void;
  onClone: (tx: Transaction) => void;
  onImport: (txs: Transaction[]) => void;
}

type FilterPeriod = 'all' | 'this-month' | 'last-month' | 'custom';

const CATEGORY_EMOJIS: Record<string, string> = {
  '매출': '💰', '기타수입': '💵',
  '재료비/매입비': '📦', '임대료': '🏠', '인건비': '👥',
  '통신비': '📱', '광고/마케팅비': '📣', '수수료(카드/플랫폼)': '💳',
  '소모품비': '🖊️', '기타경비': '🗂️',
  '원가': '📦', '광고비': '📣', '사무용품': '🖊️',
};

export function TransactionList({ transactions, onDelete, onEdit, onClone, onImport }: Props) {
  const [period, setPeriod] = useState<FilterPeriod>('this-month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [searchVendor, setSearchVendor] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (period === 'this-month' && !t.date.startsWith(thisMonth)) return false;
      if (period === 'last-month' && !t.date.startsWith(lastMonth)) return false;
      if (period === 'custom') {
        if (customStart && t.date < customStart) return false;
        if (customEnd && t.date > customEnd) return false;
      }
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (searchVendor && !t.vendor.includes(searchVendor) && !t.memo.includes(searchVendor)) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, period, thisMonth, lastMonth, customStart, customEnd, filterType, searchVendor]);

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of filtered) {
      const list = map.get(tx.date) ?? [];
      list.push(tx);
      map.set(tx.date, list);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  // Period totals for the filter bar
  const periodTotals = useMemo(() => {
    const income = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, count: filtered.length };
  }, [filtered]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { imported, errors } = parseCsv(text);
      if (imported.length > 0) onImport(imported);
      const msg = errors.length
        ? `${imported.length}건 가져옴, ${errors.length}건 오류:\n${errors.slice(0, 3).join('\n')}`
        : `${imported.length}건을 성공적으로 가져왔어요!`;
      setImportMsg(msg);
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    };
    reader.readAsText(file, 'UTF-8');
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${['일', '월', '화', '수', '목', '금', '토'][d.getDay()]})`;
  }

  const PERIOD_LABELS: Record<FilterPeriod, string> = {
    'this-month': '이번달', 'last-month': '지난달', all: '전체', custom: '기간선택',
  };

  return (
    <div className="list-card">
      <div className="list-header">
        <h2 className="form-title">거래 내역</h2>
        <div className="import-area">
          <input ref={fileRef} type="file" accept=".csv"
            style={{ display: 'none' }} onChange={handleFileChange} />
          <button className="btn-ghost btn-sm"
            onClick={() => fileRef.current?.click()} disabled={importing}>
            {importing ? '가져오는 중...' : '📥 가져오기'}
          </button>
          <button className="btn-ghost btn-sm"
            onClick={() => exportHometaxCsv(filtered)}
            disabled={filtered.length === 0}
            title="홈택스 간편장부 형식으로 내보내기">
            📤 내보내기
          </button>
        </div>
      </div>

      {importMsg && (
        <div className={`import-msg ${importMsg.includes('오류') ? 'error' : 'success'}`}>
          {importMsg}
          <button className="btn-icon" onClick={() => setImportMsg('')}>✕</button>
        </div>
      )}

      <div className="filter-bar">
        <div className="period-tabs">
          {(['this-month', 'last-month', 'all', 'custom'] as FilterPeriod[]).map((p) => (
            <button key={p} className={`tab-btn ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="custom-range">
            <input type="date" className="form-input" value={customStart}
              onChange={(e) => setCustomStart(e.target.value)} />
            <span>~</span>
            <input type="date" className="form-input" value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)} />
          </div>
        )}

        <div className="filter-row">
          <div className="type-filter">
            {(['all', 'income', 'expense'] as const).map((t) => (
              <button key={t} className={`filter-btn ${filterType === t ? 'active' : ''}`}
                onClick={() => setFilterType(t)}>
                {{ all: '전체', income: '수입', expense: '지출' }[t]}
              </button>
            ))}
          </div>
          <input type="text" className="form-input search-input"
            placeholder="거래처/메모 검색" value={searchVendor}
            onChange={(e) => setSearchVendor(e.target.value)} />
        </div>

        {/* Period summary strip */}
        {periodTotals.count > 0 && (
          <div className="period-summary-strip">
            <span className="ps-count">{periodTotals.count}건</span>
            <span className="ps-income">수입 +{periodTotals.income.toLocaleString()}원</span>
            <span className="ps-expense">지출 -{periodTotals.expense.toLocaleString()}원</span>
            <span className={`ps-profit ${periodTotals.income - periodTotals.expense >= 0 ? 'pos' : 'neg'}`}>
              순이익 {(periodTotals.income - periodTotals.expense >= 0 ? '+' : '')}{(periodTotals.income - periodTotals.expense).toLocaleString()}원
            </span>
          </div>
        )}
      </div>

      {grouped.length === 0 ? (
        <div className="empty-state">
          <p>거래 내역이 없어요</p>
          <p className="empty-sub">
            {period === 'this-month' ? '이번달 거래를 입력해 보세요 ✏️' : '조건에 맞는 거래가 없어요'}
          </p>
        </div>
      ) : (
        <div className="tx-groups">
          {grouped.map(([date, txs]) => {
            const dayTotal = txs.reduce(
              (acc, t) => ({
                income: acc.income + (t.type === 'income' ? t.amount : 0),
                expense: acc.expense + (t.type === 'expense' ? t.amount : 0),
              }),
              { income: 0, expense: 0 },
            );
            return (
              <div key={date} className="tx-group">
                <div className="tx-date-header">
                  <span className="tx-date">{formatDate(date)}</span>
                  <span className="day-summary">
                    {dayTotal.income > 0 && <span className="income-text">+{dayTotal.income.toLocaleString()}</span>}
                    {dayTotal.expense > 0 && <span className="expense-text"> -{dayTotal.expense.toLocaleString()}</span>}
                  </span>
                </div>
                {txs.map((tx) => (
                  <div key={tx.id}
                    className={`tx-item ${tx.type}-item ${expandedId === tx.id ? 'expanded' : ''}`}
                    onClick={() => setExpandedId(expandedId === tx.id ? null : tx.id)}>
                    <div className="tx-main">
                      <span className="tx-emoji">{CATEGORY_EMOJIS[tx.category] ?? '📝'}</span>
                      <div className="tx-info">
                        <span className="tx-category">{tx.category}</span>
                        {tx.vendor && <span className="tx-vendor">{tx.vendor}</span>}
                      </div>
                      <div className="tx-right">
                        <span className={`tx-amount ${tx.type}`}>
                          {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString()}원
                        </span>
                        {tx.isRecurring && <span className="recurring-dot" title="반복 거래">🔄</span>}
                      </div>
                    </div>

                    {expandedId === tx.id && (
                      <div className="tx-detail">
                        {tx.memo && <p className="tx-memo">📝 {tx.memo}</p>}
                        {tx.isRecurring && (
                          <p className="tx-recurring">🔄 {tx.recurringFrequency === 'monthly' ? '매월' : '매주'} 반복으로 등록된 거래예요</p>
                        )}
                        <div className="tx-detail-actions">
                          <button className="btn-secondary btn-sm"
                            onClick={(e) => { e.stopPropagation(); onEdit(tx); }}>
                            ✏️ 수정
                          </button>
                          <button className="btn-ghost btn-sm"
                            onClick={(e) => { e.stopPropagation(); onClone(tx); }}>
                            ↩ 복제
                          </button>
                          <button className="btn-danger btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('이 거래를 삭제할까요?')) onDelete(tx.id);
                            }}>
                            삭제
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
