'use client';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { kes } from '@/lib/format';
import { EXPENSE_CATEGORIES, type Expense } from '@/lib/erp';

type Opt = { id: string; title?: string; reference?: string; contact_name?: string };

export default function ExpenseList({ rows, receipts, auctions, jobs, month }: { rows: Expense[]; receipts: Record<string, string>; auctions: Opt[]; jobs: Opt[]; month: string }) {
  const router = useRouter();
  async function remove(r: Expense) {
    if (!window.confirm(`Delete "${r.description}" (KES ${kes(r.amount_kes)})?`)) return;
    const supabase = createClient();
    await supabase.from('auction_expenses').delete().eq('id', r.id);
    if (r.receipt) await supabase.storage.from('auction-finance').remove([r.receipt]);
    router.refresh();
  }
  async function exportXlsx() {
    const { default: writeXlsxFile } = await import('write-excel-file/browser');
    const head = ['Date', 'Category', 'Description', 'Supplier', 'Amount (KES)', 'Input VAT (KES)', 'Paid by', 'Reference', 'Auction', 'Listing Help job'].map((value) => ({ value, fontWeight: 'bold' as const }));
    const data = rows.map((r) => [r.spent_on, EXPENSE_CATEGORIES[r.category] ?? r.category, r.description, r.supplier ?? '', { value: Number(r.amount_kes), type: Number }, { value: Number(r.vat_kes), type: Number },
      r.paid_via ?? '', r.payment_ref ?? '', auctions.find((a) => a.id === r.auction_id)?.title ?? '', jobs.find((j) => j.id === r.help_request_id)?.reference ?? '']);
    await writeXlsxFile([head, ...data], { columns: [{ width: 12 }, { width: 24 }, { width: 40 }, { width: 20 }, { width: 14 }, { width: 14 }, { width: 10 }, { width: 16 }, { width: 30 }, { width: 14 }] }).toFile(`mnada-expenses-${month}.xlsx`);
  }
  return (
    <section className="panel stack" style={{ gap: 8 }}>
      <div className="row between"><h3>This month</h3><button type="button" className="btn btn-outline btn-sm" onClick={exportXlsx} disabled={!rows.length}>Export to Excel</button></div>
      {rows.length === 0 && <span className="small muted">No expenses recorded this month.</span>}
      {rows.length > 0 && (
        <div className="scroll-x">
          <table className="data" style={{ minWidth: 820 }}>
            <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>For</th><th style={{ textAlign: 'right' }}>KES</th><th>Receipt</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="small">{new Date(r.spent_on).toLocaleDateString('en-GB')}</td>
                  <td className="small">{EXPENSE_CATEGORIES[r.category] ?? r.category}</td>
                  <td>{r.description}<div className="small muted">{[r.supplier, r.paid_via, r.payment_ref].filter(Boolean).join(' · ')}</div></td>
                  <td className="small">{auctions.find((a) => a.id === r.auction_id)?.title ?? jobs.find((j) => j.id === r.help_request_id)?.reference ?? '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{kes(r.amount_kes)}{Number(r.vat_kes) > 0 && <div className="small muted">VAT {kes(r.vat_kes)}</div>}</td>
                  <td>{receipts[r.id] ? <a href={receipts[r.id]} target="_blank" rel="noreferrer" className="small">View</a> : <span className="small muted">—</span>}</td>
                  <td><button type="button" className="btn btn-outline btn-sm" onClick={() => remove(r)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
