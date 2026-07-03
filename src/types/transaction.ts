export type TransactionType = 'income' | 'expense';

export type IncomeCategory = '매출' | '기타수입';

export type ExpenseCategory =
  | '재료비/매입비'
  | '임대료'
  | '인건비'
  | '통신비'
  | '광고/마케팅비'
  | '수수료(카드/플랫폼)'
  | '소모품비'
  | '기타경비'
  | '광고비'
  | '원가'
  | '사무용품';

export type Category = IncomeCategory | ExpenseCategory;

export type RecurringFrequency = 'monthly' | 'weekly' | 'once';

export interface Transaction {
  id: string;
  date: string;           // YYYY-MM-DD
  type: TransactionType;
  amount: number;
  vendor: string;         // 거래처
  memo: string;           // 적요
  category: Category;
  isRecurring: boolean;
  recurringFrequency?: RecurringFrequency;
  templateName?: string;  // 빠른 입력 템플릿 이름
  createdAt: string;
}

export interface Template {
  id: string;
  name: string;
  type: TransactionType;
  amount: number;
  vendor: string;
  memo: string;
  category: Category;
}

export interface RecurringRule {
  id: string;
  frequency: RecurringFrequency;
  type: TransactionType;
  amount: number;
  vendor: string;
  memo: string;
  category: Category;
  nextDate: string;       // YYYY-MM-DD
  active: boolean;
}

export type Industry =
  | 'retail'       // 소매/판매
  | 'food'         // 음식/카페
  | 'service'      // 서비스/프리랜서
  | 'delivery'     // 배달/운송
  | 'online'       // 온라인 쇼핑몰/콘텐츠
  | 'other';       // 기타

export interface AppState {
  onboardingComplete: boolean;
  industry: Industry | null;
  simpleMode?: boolean;
  businessType?: 'general' | 'simplified';
  hasEmployees?: boolean;
  checklistSetup?: boolean;
}
