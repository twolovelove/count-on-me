import type { Transaction, Category } from '../types/transaction';
import { suggestCategory } from './categoryPredict';

export interface CsvRow {
  date: string;
  amount: number;
  memo: string;
}

export interface ImportResult {
  imported: Transaction[];
  errors: string[];
}

function parseDate(raw: string): string | null {
  // Accept YYYY-MM-DD, YYYY/MM/DD, YYYYMMDD
  const clean = raw.trim().replace(/\//g, '-');
  if (/^\d{8}$/.test(clean)) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  return null;
}

function parseAmount(raw: string): number | null {
  const n = parseFloat(raw.trim().replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

export function parseCsv(text: string): ImportResult {
  const lines = text.trim().split(/\r?\n/);
  const imported: Transaction[] = [];
  const errors: string[] = [];

  // Skip header if first row looks like a header (non-numeric amount column)
  const startIdx = parseAmount(lines[0]?.split(',')[1] ?? '') === null ? 1 : 0;

  lines.slice(startIdx).forEach((line, idx) => {
    if (!line.trim()) return;
    const cols = line.split(',');
    if (cols.length < 2) {
      errors.push(`${startIdx + idx + 1}행: 컬럼이 부족합니다`);
      return;
    }

    const date = parseDate(cols[0]);
    const amount = parseAmount(cols[1]);
    const memo = (cols[2] ?? '').trim().replace(/^"|"$/g, '');

    if (!date) {
      errors.push(`${startIdx + idx + 1}행: 날짜 형식 오류 (${cols[0]})`);
      return;
    }
    if (amount === null) {
      errors.push(`${startIdx + idx + 1}행: 금액 형식 오류 (${cols[1]})`);
      return;
    }

    const type = amount >= 0 ? 'income' : 'expense';
    const absAmount = Math.abs(amount);
    const category: Category = suggestCategory(memo, '', type) ?? (type === 'income' ? '매출' : '기타경비');

    imported.push({
      id: `csv-${Date.now()}-${idx}`,
      date,
      type,
      amount: absAmount,
      vendor: '',
      memo,
      category,
      isRecurring: false,
      createdAt: new Date().toISOString(),
    });
  });

  return { imported, errors };
}
