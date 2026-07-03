import { useState } from 'react';
import type { Industry, Transaction, RecurringRule, Category } from '../types/transaction';
import { saveAppState } from '../utils/storage';

interface Props {
  onComplete: (industry: Industry, firstTx?: Omit<Transaction, 'id' | 'createdAt'>, recurringRule?: Omit<RecurringRule, 'id'>) => void;
}

const INDUSTRIES: { value: Industry; emoji: string; label: string; hint: string }[] = [
  { value: 'retail', emoji: '🛍️', label: '소매/판매', hint: '옷가게, 편의점, 마트 등' },
  { value: 'food', emoji: '🍱', label: '음식/카페', hint: '식당, 카페, 베이커리 등' },
  { value: 'service', emoji: '💼', label: '서비스/프리랜서', hint: '디자인, 개발, 강의, 미용 등' },
  { value: 'delivery', emoji: '🚗', label: '배달/운송', hint: '배달대행, 화물, 퀵서비스 등' },
  { value: 'online', emoji: '💻', label: '온라인 쇼핑몰/콘텐츠', hint: '스마트스토어, 유튜브, 블로그 등' },
  { value: 'other', emoji: '✨', label: '기타', hint: '위에 없는 업종' },
];

type Step = 1 | 2 | 3;

const today = new Date().toISOString().slice(0, 10);

export function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [industry, setIndustry] = useState<Industry | null>(null);

  // step 2 – first transaction
  const [hasTx, setHasTx] = useState<boolean | null>(null);
  const [txType, setTxType] = useState<'income' | 'expense'>('income');
  const [txAmount, setTxAmount] = useState('');
  const [txVendor, setTxVendor] = useState('');
  const [txMemo, setTxMemo] = useState('');
  const [txCategory, setTxCategory] = useState<Category>('매출');
  const [txDate, setTxDate] = useState(today);

  // step 3 – recurring
  const [hasRecurring, setHasRecurring] = useState<boolean | null>(null);
  const [recAmount, setRecAmount] = useState('');
  const [recVendor, setRecVendor] = useState('');
  const [recMemo, setRecMemo] = useState('');
  const [recCategory, setRecCategory] = useState<Category>('임대료');

  const incomeCategories: Category[] = ['매출', '기타수입'];
  const expenseCategories: Category[] = [
    '재료비/매입비', '임대료', '인건비', '통신비',
    '광고/마케팅비', '수수료(카드/플랫폼)', '소모품비', '기타경비',
  ];

  function handleIndustrySelect(ind: Industry) {
    setIndustry(ind);
    setTimeout(() => setStep(2), 150);
  }

  function handleStep2Next() {
    setStep(3);
  }

  function handleFinish() {
    if (!industry) return;

    saveAppState({ onboardingComplete: true, industry });

    const firstTx: Omit<Transaction, 'id' | 'createdAt'> | undefined =
      hasTx && txAmount
        ? {
            date: txDate,
            type: txType,
            amount: parseFloat(txAmount.replace(/,/g, '')),
            vendor: txVendor,
            memo: txMemo,
            category: txCategory,
            isRecurring: false,
          }
        : undefined;

    const recurringRule: Omit<RecurringRule, 'id'> | undefined =
      hasRecurring && recAmount
        ? {
            frequency: 'monthly',
            type: 'expense',
            amount: parseFloat(recAmount.replace(/,/g, '')),
            vendor: recVendor,
            memo: recMemo,
            category: recCategory,
            nextDate: today,
            active: true,
          }
        : undefined;

    onComplete(industry, firstTx, recurringRule);
  }

  function formatNumber(val: string) {
    const n = val.replace(/[^0-9]/g, '');
    return n ? parseInt(n).toLocaleString() : '';
  }

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="onboarding-progress">
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} className={`progress-dot ${step >= s ? 'active' : ''}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="onboarding-step">
            <h1 className="onboarding-title">어떤 일을 하고 계세요?</h1>
            <p className="onboarding-desc">업종에 맞게 카테고리를 자동으로 설정해 드릴게요</p>
            <div className="positioning-badge">
              세무사를 대체하는 게 아니라,<br />
              넘기기 전까지 방치 안 하게 도와주는 앱이에요
            </div>
            <div className="industry-grid">
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind.value}
                  className={`industry-btn ${industry === ind.value ? 'selected' : ''}`}
                  onClick={() => handleIndustrySelect(ind.value)}
                >
                  <span className="industry-emoji">{ind.emoji}</span>
                  <span className="industry-label">{ind.label}</span>
                  <span className="industry-hint">{ind.hint}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step">
            <h1 className="onboarding-title">최근에 돈 들어오거나 나간 적 있으세요?</h1>
            <p className="onboarding-desc">지금 바로 첫 거래를 기록해 보세요</p>

            <div className="choice-row">
              <button
                className={`choice-btn ${hasTx === true ? 'selected' : ''}`}
                onClick={() => setHasTx(true)}
              >
                네, 있어요
              </button>
              <button
                className={`choice-btn ${hasTx === false ? 'selected' : ''}`}
                onClick={() => setHasTx(false)}
              >
                아직 없어요
              </button>
            </div>

            {hasTx && (
              <div className="mini-form">
                <div className="type-toggle">
                  <button
                    className={`type-btn income ${txType === 'income' ? 'active' : ''}`}
                    onClick={() => { setTxType('income'); setTxCategory('매출'); }}
                  >
                    💰 돈 들어왔어요
                  </button>
                  <button
                    className={`type-btn expense ${txType === 'expense' ? 'active' : ''}`}
                    onClick={() => { setTxType('expense'); setTxCategory('기타경비'); }}
                  >
                    💸 돈 나갔어요
                  </button>
                </div>
                <input
                  type="date"
                  className="form-input"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-input"
                  placeholder="금액 (예: 150,000)"
                  value={txAmount}
                  onChange={(e) => setTxAmount(formatNumber(e.target.value))}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="거래처 (예: 배민, 쿠팡)"
                  value={txVendor}
                  onChange={(e) => setTxVendor(e.target.value)}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="메모 (선택)"
                  value={txMemo}
                  onChange={(e) => setTxMemo(e.target.value)}
                />
                <select
                  className="form-input"
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value as Category)}
                >
                  {(txType === 'income' ? incomeCategories : expenseCategories).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            {hasTx !== null && (
              <button className="btn-primary" onClick={handleStep2Next}>
                다음 →
              </button>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="onboarding-step">
            <h1 className="onboarding-title">매달 꼬박꼬박 나가는 돈 있으세요?</h1>
            <p className="onboarding-desc">등록하면 매달 자동으로 기록돼요</p>

            <div className="choice-row">
              <button
                className={`choice-btn ${hasRecurring === true ? 'selected' : ''}`}
                onClick={() => setHasRecurring(true)}
              >
                네, 있어요
              </button>
              <button
                className={`choice-btn ${hasRecurring === false ? 'selected' : ''}`}
                onClick={() => setHasRecurring(false)}
              >
                없어요
              </button>
            </div>

            {hasRecurring && (
              <div className="mini-form">
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-input"
                  placeholder="금액 (예: 500,000)"
                  value={recAmount}
                  onChange={(e) => setRecAmount(formatNumber(e.target.value))}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="거래처 (예: 건물주, KT)"
                  value={recVendor}
                  onChange={(e) => setRecVendor(e.target.value)}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="메모 (예: 1월 임대료)"
                  value={recMemo}
                  onChange={(e) => setRecMemo(e.target.value)}
                />
                <select
                  className="form-input"
                  value={recCategory}
                  onChange={(e) => setRecCategory(e.target.value as Category)}
                >
                  {(['재료비/매입비', '임대료', '인건비', '통신비', '광고/마케팅비', '수수료(카드/플랫폼)', '소모품비', '기타경비'] as Category[]).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            {hasRecurring !== null && (
              <button className="btn-primary" onClick={handleFinish}>
                시작하기 🎉
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
