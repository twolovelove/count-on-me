import { useState, useEffect } from 'react';
import { loadAppState, saveAppState } from '../utils/storage';

type BusinessType = 'general' | 'simplified';

interface ChecklistItemDef {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  condition: 'always' | 'hasEmployees' | 'general' | 'simplified';
  activeMonths: number[] | 'all';
  deadlineDay?: number;
  deadlineLabel: string;
  category: 'monthly' | 'quarterly' | 'yearly';
}

const CHECKLIST_ITEMS: ChecklistItemDef[] = [
  {
    id: 'sales-check',
    emoji: '💰',
    title: '이달 매출 정산 확인',
    desc: '카드사, 배달앱, 쇼핑몰 등 모든 채널의 매출을 장부에 빠짐없이 기록했는지 확인하세요',
    condition: 'always',
    activeMonths: 'all',
    deadlineDay: 28,
    deadlineLabel: '이달 말',
    category: 'monthly',
  },
  {
    id: 'insurance-check',
    emoji: '🏥',
    title: '4대보험료 납부 확인',
    desc: '사업주 본인의 국민연금·건강보험료가 자동이체됐는지 통장을 확인하세요',
    condition: 'always',
    activeMonths: 'all',
    deadlineDay: 10,
    deadlineLabel: '이달 10일',
    category: 'monthly',
  },
  {
    id: 'withholding-tax',
    emoji: '🧾',
    title: '원천세 신고·납부',
    desc: '직원(알바 포함)에게 지급한 급여에서 뗀 소득세를 신고하고 납부하세요 (전월 귀속분)',
    condition: 'hasEmployees',
    activeMonths: 'all',
    deadlineDay: 10,
    deadlineLabel: '이달 10일 (전월 귀속분)',
    category: 'monthly',
  },
  {
    id: 'vat-preliminary',
    emoji: '🧮',
    title: '부가가치세 예정신고',
    desc: '1기 예정(4월), 2기 예정(10월)에 신고해요. 직전 분기 납부세액의 절반을 납부하면 돼요',
    condition: 'general',
    activeMonths: [4, 10],
    deadlineDay: 25,
    deadlineLabel: '이달 25일',
    category: 'quarterly',
  },
  {
    id: 'invoice-cleanup',
    emoji: '📄',
    title: '세금계산서 발행·수취 정리',
    desc: '이번 분기에 발행하거나 받은 세금계산서를 확인하고 누락 여부를 점검하세요',
    condition: 'general',
    activeMonths: [3, 6, 9, 12],
    deadlineDay: undefined,
    deadlineLabel: '분기 말',
    category: 'quarterly',
  },
  {
    id: 'vat-final-general',
    emoji: '📊',
    title: '부가가치세 확정신고',
    desc: '1기 확정(7월), 2기 확정(1월)에 신고해요. 반년치 매출·매입 내역을 정리하세요',
    condition: 'general',
    activeMonths: [1, 7],
    deadlineDay: 25,
    deadlineLabel: '이달 25일',
    category: 'yearly',
  },
  {
    id: 'vat-simplified',
    emoji: '📊',
    title: '부가가치세 신고·납부',
    desc: '간이과세자는 연 1회 1월 25일까지 전년도분 부가세를 신고·납부해요',
    condition: 'simplified',
    activeMonths: [1],
    deadlineDay: 25,
    deadlineLabel: '1월 25일',
    category: 'yearly',
  },
  {
    id: 'income-tax',
    emoji: '🏛️',
    title: '종합소득세 신고',
    desc: '전년도 사업 소득에 대한 세금을 신고해요. 5월 1일~31일이며 세무사 도움을 받는 걸 권장해요',
    condition: 'always',
    activeMonths: [5],
    deadlineDay: 31,
    deadlineLabel: '5월 31일',
    category: 'yearly',
  },
  {
    id: 'accountant-prep',
    emoji: '📁',
    title: '장부 정리 & 세무사 전달',
    desc: '종합소득세 신고를 위해 연간 장부를 정리하고 세무사에게 전달하세요',
    condition: 'always',
    activeMonths: [1, 2, 3, 4],
    deadlineDay: undefined,
    deadlineLabel: '1~4월 중',
    category: 'yearly',
  },
];

const STORAGE_KEY_PREFIX = 'count_checklist_';

function loadCheckState(monthKey: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${monthKey}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCheckState(monthKey: string, state: Record<string, boolean>): void {
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${monthKey}`, JSON.stringify(state));
}

function getActiveItems(
  month: number,
  businessType: BusinessType | undefined,
  hasEmployees: boolean,
): ChecklistItemDef[] {
  return CHECKLIST_ITEMS.filter((item) => {
    if (item.activeMonths !== 'all' && !item.activeMonths.includes(month)) return false;
    if (item.condition === 'hasEmployees' && !hasEmployees) return false;
    if (item.condition === 'general' && businessType !== 'general') return false;
    if (item.condition === 'simplified' && businessType !== 'simplified') return false;
    return true;
  });
}

function daysUntilDeadline(year: number, month: number, day: number): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(year, month - 1, day);
  deadline.setHours(0, 0, 0, 0);
  return Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

interface SectionProps {
  title: string;
  items: ChecklistItemDef[];
  checkState: Record<string, boolean>;
  onToggle: (id: string) => void;
  year: number;
  month: number;
  isCurrentMonth: boolean;
}

function ChecklistSection({ title, items, checkState, onToggle, year, month, isCurrentMonth }: SectionProps) {
  return (
    <div className="checklist-section">
      <h3 className="checklist-section-title">{title}</h3>
      {items.map((item) => {
        const checked = checkState[item.id] ?? false;
        let deadlineBadge: React.ReactNode = null;
        if (item.deadlineDay && isCurrentMonth) {
          const days = daysUntilDeadline(year, month, item.deadlineDay);
          if (days < 0) {
            deadlineBadge = <span className="deadline-badge passed">지남</span>;
          } else if (days === 0) {
            deadlineBadge = <span className="deadline-badge today">오늘 마감</span>;
          } else if (days <= 7) {
            deadlineBadge = <span className="deadline-badge urgent">D-{days}</span>;
          } else if (days <= 14) {
            deadlineBadge = <span className="deadline-badge warning">{days}일 후</span>;
          }
        }
        return (
          <div
            key={item.id}
            className={`checklist-item ${checked ? 'checked' : ''}`}
            onClick={() => onToggle(item.id)}
          >
            <div className="checklist-check">{checked ? '✓' : ''}</div>
            <div className="checklist-item-body">
              <div className="checklist-item-header">
                <span className="checklist-item-emoji">{item.emoji}</span>
                <span className="checklist-item-title">{item.title}</span>
                {deadlineBadge}
              </div>
              <p className="checklist-item-desc">{item.desc}</p>
              <span className="checklist-deadline-label">마감: {item.deadlineLabel}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Checklist() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [businessType, setBusinessType] = useState<BusinessType | undefined>(
    () => loadAppState().businessType,
  );
  const [hasEmployees, setHasEmployees] = useState<boolean>(
    () => loadAppState().hasEmployees ?? false,
  );
  const [setupDone, setSetupDone] = useState(() => loadAppState().checklistSetup ?? false);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const isCurrentMonth = selectedYear === currentYear && selectedMonth === currentMonth;

  const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const [checkState, setCheckState] = useState<Record<string, boolean>>(() =>
    loadCheckState(monthKey),
  );

  useEffect(() => {
    setCheckState(loadCheckState(monthKey));
  }, [monthKey]);

  function saveSetup() {
    if (!businessType) return;
    const current = loadAppState();
    saveAppState({ ...current, businessType, hasEmployees, checklistSetup: true });
    setSetupDone(true);
  }

  function toggleCheck(id: string) {
    const next = { ...checkState, [id]: !checkState[id] };
    setCheckState(next);
    saveCheckState(monthKey, next);
  }

  function prevMonth() {
    if (selectedMonth === 1) {
      setSelectedYear((y) => y - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (isCurrentMonth) return;
    if (selectedMonth === 12) {
      setSelectedYear((y) => y + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  }

  const activeItems = setupDone
    ? getActiveItems(selectedMonth, businessType, hasEmployees)
    : [];

  const monthlyItems = activeItems.filter((i) => i.category === 'monthly');
  const quarterlyItems = activeItems.filter((i) => i.category === 'quarterly');
  const yearlyItems = activeItems.filter((i) => i.category === 'yearly');

  const checkedCount = activeItems.filter((i) => checkState[i.id]).length;

  const urgentItems = isCurrentMonth
    ? activeItems.filter((item) => {
        if (!item.deadlineDay || checkState[item.id]) return false;
        const days = daysUntilDeadline(selectedYear, selectedMonth, item.deadlineDay);
        return days >= 0 && days <= 7;
      })
    : [];

  const monthLabel = `${selectedYear}년 ${selectedMonth}월`;

  // ── Setup screen ──────────────────────────────────────────────────────────
  if (!setupDone) {
    return (
      <div className="checklist-card">
        <div className="checklist-header">
          <h2 className="form-title">📅 세무 일정 체크리스트</h2>
        </div>
        <div className="checklist-setup">
          <p className="checklist-setup-desc">
            맞춤 일정을 보여드릴게요. 두 가지만 알려주세요!
          </p>

          <div className="setup-section">
            <p className="setup-question">부가가치세 유형이 어떻게 되세요?</p>
            <div className="choice-row">
              <button
                className={`choice-btn ${businessType === 'general' ? 'selected' : ''}`}
                onClick={() => setBusinessType('general')}
              >
                일반과세자
              </button>
              <button
                className={`choice-btn ${businessType === 'simplified' ? 'selected' : ''}`}
                onClick={() => setBusinessType('simplified')}
              >
                간이과세자
              </button>
            </div>
            <p className="setup-hint">
              모르시면 사업자등록증 또는 국세청 홈택스에서 확인할 수 있어요
            </p>
          </div>

          <div className="setup-section">
            <p className="setup-question">직원(알바 포함)이 있으세요?</p>
            <div className="choice-row">
              <button
                className={`choice-btn ${hasEmployees === true ? 'selected' : ''}`}
                onClick={() => setHasEmployees(true)}
              >
                네, 있어요
              </button>
              <button
                className={`choice-btn ${hasEmployees === false ? 'selected' : ''}`}
                onClick={() => setHasEmployees(false)}
              >
                아니요
              </button>
            </div>
          </div>

          <button
            className="btn-primary btn-full"
            onClick={saveSetup}
            disabled={!businessType}
          >
            맞춤 체크리스트 보기
          </button>

          <p className="checklist-disclaimer">
            ℹ️ 이 체크리스트는 일반적인 가이드이며, 정확한 기한과 신고 방법은 국세청
            홈택스 또는 세무사와 확인하세요.
          </p>
        </div>
      </div>
    );
  }

  // ── Main checklist view ───────────────────────────────────────────────────
  return (
    <div className="checklist-card">
      <div className="checklist-header">
        <h2 className="form-title">📅 세무 일정</h2>
        <button
          className="btn-ghost btn-sm"
          onClick={() => setSetupDone(false)}
          title="과세 유형·직원 설정 변경"
        >
          설정
        </button>
      </div>

      {/* Month navigator */}
      <div className="month-nav checklist-month-nav">
        <button className="month-nav-btn" onClick={prevMonth}>‹</button>
        <span className="checklist-month-label">{monthLabel}</span>
        <button
          className="month-nav-btn"
          onClick={nextMonth}
          disabled={isCurrentMonth}
          style={{ opacity: isCurrentMonth ? 0.3 : 1 }}
        >›</button>
      </div>

      {/* Progress bar */}
      {activeItems.length > 0 && (
        <div className="checklist-progress-wrap">
          <div className="checklist-progress-bar-outer">
            <div
              className="checklist-progress-bar"
              style={{ width: `${(checkedCount / activeItems.length) * 100}%` }}
            />
          </div>
          <span className="checklist-progress-label">{checkedCount}/{activeItems.length} 완료</span>
        </div>
      )}

      {/* Urgent banner */}
      {urgentItems.length > 0 && (
        <div className="checklist-urgent-banner">
          <span className="urgent-icon">⚠️</span>
          <div>
            <p className="urgent-title">마감이 다가오고 있어요!</p>
            <p className="urgent-list">
              {urgentItems.map((i) => i.title).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="checklist-body">
        {monthlyItems.length > 0 && (
          <ChecklistSection
            title="매월 챙겨야 할 것"
            items={monthlyItems}
            checkState={checkState}
            onToggle={toggleCheck}
            year={selectedYear}
            month={selectedMonth}
            isCurrentMonth={isCurrentMonth}
          />
        )}
        {quarterlyItems.length > 0 && (
          <ChecklistSection
            title="이번 분기 챙겨야 할 것"
            items={quarterlyItems}
            checkState={checkState}
            onToggle={toggleCheck}
            year={selectedYear}
            month={selectedMonth}
            isCurrentMonth={isCurrentMonth}
          />
        )}
        {yearlyItems.length > 0 && (
          <ChecklistSection
            title="이달의 연간 일정"
            items={yearlyItems}
            checkState={checkState}
            onToggle={toggleCheck}
            year={selectedYear}
            month={selectedMonth}
            isCurrentMonth={isCurrentMonth}
          />
        )}
        {activeItems.length === 0 && (
          <div className="empty-state">
            <p>이달에 챙겨야 할 세무 일정이 없어요</p>
            <p className="empty-sub">다른 달을 확인해 보세요</p>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="checklist-disclaimer-box">
        ℹ️ 이 체크리스트는 일반적인 가이드예요. 정확한 기한은 매년·사업자 유형별로
        달라질 수 있으니 국세청 홈택스에서 꼭 확인하세요.
      </div>
    </div>
  );
}
