import { requireArea } from '@/lib/require-area';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { kes } from '@/lib/format';
import { EXPENSE_CATEGORIES, type Expense } from '@/lib/erp';
import ExpenseForm from './ExpenseForm';
import ExpenseList from './ExpenseList';

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  await requireArea('finance');
  const { m } = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(m ?? '') ? m! : new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 7);
  const [y, mo] = month.split('-').map(Number);
  const start = `${month}-01`;
  const end = new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 10);
  const prev = new Date(Date.UTC(y, mo - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 7);
  const supabase = await createClient();
  const [{ data }, { data: auctions }, { data: jobs }] = await Promise.all([
    supabase.from('auction_expenses').select('*').gte('spent_on', start).lt('spent_on', end).order('spent_on', { ascending: false }),
    supabase.from('auction_auctions').select('id, title').order('created_at', { ascending: false }).limit(100),
    supabase.from('auction_help_requests').select('id, reference, contact_name').not('status', 'in', '(cancelled,declined)').order('created_at', { ascending: false }).limit(100),
  ]);
  const rows = (data ?? []) as Expense[];
  const receipts: Record<string, string> = {};
  for (const r of rows) if (r.receipt) {
    const { data: u } = await supabase.storage.from('auction-finance').createSignedUrl(r.receipt, 3600);
    if (u?.signedUrl) receipts[r.id] = u.signedUrl;
  }
  const byCat = new Map<string, number>();
  rows.forEach((r) => byCat.set(r.category, (byCat.get(r.category) ?? 0) + Number(r.amount_kes)));
  const total = rows.reduce((s, r) => s + Number(r.amount_kes), 0);
  const vat = rows.reduce((s, r) => s + Number(r.vat_kes), 0);
  const label = new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return (
    <>
      <div className="row between">
        <div className="stack" style={{ gap: 4 }}>
          <h1 style={{ fontSize: 28 }}>Expenses</h1>
          <span className="small muted">Record what Mnada spends. Tag costs to an auction or Listing Help job to see the profit on each.</span>
        </div>
        <div className="row">
          <Link href={`/admin/expenses?m=${prev}`} className="btn btn-outline btn-sm">← </Link>
          <b>{label}</b>
          <Link href={`/admin/expenses?m=${next}`} className="btn btn-outline btn-sm"> →</Link>
        </div>
      </div>
      <div className="kpis">
        <div className="kpi"><span className="eyebrow">Spent in {label}</span><b>KES {kes(total)}</b><span className="small muted">incl. KES {kes(vat)} input VAT</span></div>
        {[...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, v]) => (
          <div key={c} className="kpi"><span className="eyebrow">{EXPENSE_CATEGORIES[c] ?? c}</span><b>KES {kes(v)}</b></div>
        ))}
      </div>
      <ExpenseForm auctions={auctions ?? []} jobs={jobs ?? []} />
      <ExpenseList rows={rows} receipts={receipts} auctions={auctions ?? []} jobs={jobs ?? []} month={month} />
    </>
  );
}
