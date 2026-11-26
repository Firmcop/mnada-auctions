'use client';
export type Line = { date: string; stream: string; ref: string; description: string; amount: number };

export default function FinanceExport({ lines, period }: { lines: Line[]; period: string }) {
  async function download() {
    const { default: writeXlsxFile } = await import('write-excel-file/browser');
    const head = ['Date', 'Stream', 'Reference', 'Description', 'Amount (KES)'].map((value) => ({ value, fontWeight: 'bold' as const }));
    const rows = [...lines].sort((a, b) => a.date.localeCompare(b.date)).map((l) => [l.date, l.stream, l.ref, l.description, { value: l.amount, type: Number }]);
    await writeXlsxFile([head, ...rows], { columns: [{ width: 12 }, { width: 28 }, { width: 14 }, { width: 60 }, { width: 16 }] }).toFile(`mnada-income-${period.toLowerCase().replace(/\s+/g, '-')}.xlsx`);
  }
  return <button type="button" className="btn btn-outline btn-sm" onClick={download} disabled={!lines.length}>Export to Excel</button>;
}
