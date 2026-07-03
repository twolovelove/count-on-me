import type { Category, TransactionType } from '../types/transaction';

interface PatternRule {
  patterns: RegExp[];
  category: Category;
  type: TransactionType;
}

const RULES: PatternRule[] = [
  { patterns: [/쿠팡|배민|요기요|배달의민족|스마트스토어|네이버페이|카카오페이|토스|당근/i], category: '수수료(카드/플랫폼)', type: 'expense' },
  { patterns: [/광고|마케팅|sns|인스타|유튜브|구글광고|네이버광고|페이스북/i], category: '광고/마케팅비', type: 'expense' },
  { patterns: [/임대|월세|관리비|부동산/i], category: '임대료', type: 'expense' },
  { patterns: [/통신|핸드폰|휴대폰|인터넷|kt|sk|lg유플|olleh/i], category: '통신비', type: 'expense' },
  { patterns: [/알바|직원|급여|인건|노무/i], category: '인건비', type: 'expense' },
  { patterns: [/재료|원자재|매입|도매|식자재|부품/i], category: '재료비/매입비', type: 'expense' },
  { patterns: [/소모품|문구|사무용품|택배박스|포장/i], category: '소모품비', type: 'expense' },
  { patterns: [/매출|판매|입금|수입/i], category: '매출', type: 'income' },
  { patterns: [/환급|환불|보험금|지원금/i], category: '기타수입', type: 'income' },
];

export function suggestCategory(
  memo: string,
  vendor: string,
  type: TransactionType,
): Category | null {
  const text = `${vendor} ${memo}`.toLowerCase();

  for (const rule of RULES) {
    if (rule.type !== type) continue;
    if (rule.patterns.some((p) => p.test(text))) return rule.category;
  }
  return null;
}
