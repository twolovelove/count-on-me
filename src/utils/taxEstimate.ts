import type { Transaction } from '../types/transaction';

export function estimateNetProfit(transactions: Transaction[], year: number): number {
  return transactions
    .filter((t) => new Date(t.date).getFullYear() === year)
    .reduce((sum, t) => (t.type === 'income' ? sum + t.amount : sum - t.amount), 0);
}

// 2024 종합소득세 세율표 (누진세)
const TAX_BRACKETS = [
  { limit: 14_000_000, rate: 0.06, deduction: 0 },
  { limit: 50_000_000, rate: 0.15, deduction: 1_260_000 },
  { limit: 88_000_000, rate: 0.24, deduction: 5_760_000 },
  { limit: 150_000_000, rate: 0.35, deduction: 15_440_000 },
  { limit: 300_000_000, rate: 0.38, deduction: 19_940_000 },
  { limit: 500_000_000, rate: 0.40, deduction: 25_940_000 },
  { limit: 1_000_000_000, rate: 0.42, deduction: 35_940_000 },
  { limit: Infinity, rate: 0.45, deduction: 65_940_000 },
];

// 단순경비율 적용 (업종 구분 없이 60% 가정, 참고용)
const SIMPLE_EXPENSE_RATE = 0.6;

export function estimateTax(grossIncome: number): {
  estimatedIncome: number;
  taxBefore: number;
  taxAfter: number;  // 기본공제 150만 원 적용
  disclaimer: string;
} {
  if (grossIncome <= 0) {
    return {
      estimatedIncome: 0,
      taxBefore: 0,
      taxAfter: 0,
      disclaimer: DISCLAIMER,
    };
  }

  // 단순경비율 추정 소득
  const estimatedIncome = Math.max(0, grossIncome * (1 - SIMPLE_EXPENSE_RATE));

  // 기본공제 150만 원 (근로소득 없는 경우 종합소득공제 단순 적용)
  const taxableIncome = Math.max(0, estimatedIncome - 1_500_000);

  const bracket = TAX_BRACKETS.find((b) => taxableIncome <= b.limit)!;
  const taxBefore = Math.floor(estimatedIncome * bracket.rate - bracket.deduction);
  const taxAfter = Math.floor(taxableIncome * bracket.rate - bracket.deduction);

  return {
    estimatedIncome,
    taxBefore: Math.max(0, taxBefore),
    taxAfter: Math.max(0, taxAfter),
    disclaimer: DISCLAIMER,
  };
}

const DISCLAIMER =
  '이 수치는 단순경비율(60%) 기준 참고용 추정치입니다. 실제 세금은 업종·공제 항목에 따라 크게 달라질 수 있으며, 정확한 신고는 세무사와 상담하세요.';
