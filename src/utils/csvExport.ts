import type { Transaction } from '../types/transaction';

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function exportHometaxCsv(transactions: Transaction[]): void {
  const header = ['거래일자', '구분', '거래처', '계정과목', '적요', '수입금액', '지출금액'];
  const rows = transactions
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => [
      t.date,
      t.type === 'income' ? '수입' : '지출',
      escapeCsv(t.vendor),
      escapeCsv(t.category),
      escapeCsv(t.memo),
      t.type === 'income' ? String(t.amount) : '',
      t.type === 'expense' ? String(t.amount) : '',
    ]);

  const csv = [header, ...rows].map((r) => r.join(',')).join('\r\n');
  // BOM for Excel Korean encoding
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const today = new Date().toISOString().slice(0, 10);
  a.download = `간편장부_${today}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
