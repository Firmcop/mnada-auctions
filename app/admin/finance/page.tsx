import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { kes } from '@/lib/format';
import FinanceExport from './FinanceExport';
import { incomeLines } from '@/lib/finance';

const PERIODS: [string, string, number][] = [['30', 'Last 30 days', 30], ['90', 'Last 90 days', 90], ['365', 'Last 12 months', 365]];

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p = '30' } = await searchParams;
  const days = PERIODS.find((x) => x[0] === p)?.[2] ?? 30;
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const supabase = await createClient();
  const [{ lines, aiCost }, { data: open }, { data: held }, { data: exp }] = await Promise.all([
    incomeLines(supabase, since),
    supabase.from('auction_invoices').select('total, paid').in('status', ['unpaid', 'part']),
    supabase.from('auction_settlements').select('net_kes, status').in('status', ['held', 'released']),
    supabase.from('auction_expenses').select('amount_kes, vat_kes').gte('spent_on', since.slice(0, 10)),
  ]);
  const expenses = (exp ?? []).reduce((s, x) => s + Number(x.amount_kes) - Number(x.vat_kes), 0);
  const streams = new Map<string, number>();
  for (const l of lines) streams.set(l.stream, (streams.get(l.stream) ?? 0) + l.amount);
  const vatOut = streams.get('VAT collected (output)') ?? 0;
  const revenue = [...streams.entries()].filter(([k]) => k !== 'VAT collected (output)').reduce((s, [, v]) => s + v, 0);
  const receivable = (open ?? []).reduce((s, x) => s + Number(x.total) - Number(x.paid), 0);
  const owed = (held ?? []).reduce((s, x) => s + Number(x.net_kes), 0);

  return (
    <>
      <div className="row between">
        <div className="stack" style={{ gap: 4 }}>
          <h1 style={{ fontSize: 28 }}>Finance</h1>
          <span className="small muted">Mnada&apos;s income from every stream, on payments received. Excludes money held for sellers and auctioneers.</span>
        </div>
        <div className="row">
          {PERIODS.map(([k, label]) => <Link key={k} href={`/admin/finance?p=${k}`} className={`btn btn-sm ${k === p ? 'btn-dark' : 'btn-outline'}`}>{label}</Link>)}
          <FinanceExport lines={lines} period={PERIODS.find((x) => x[0] === p)?.[1] ?? ''} />
        </div>
      </div>
      <div className="kpis">
        <div className="kpi"><span className="eyebrow">Mnada revenue (excl. VAT)</span><b style={{ color: 'var(--green)' }}>KES {kes(revenue)}</b></div>
        <div className="kpi"><span className="eyebrow">Expenses (excl. VAT)</span><b>KES {kes(expenses)}</b><Link href="/admin/expenses" className="small">Expenses</Link></div>
        <div className="kpi"><span className="eyebrow">Profit before tax</span><b style={{ color: revenue - expenses >= 0 ? 'var(--green)' : 'var(--danger)' }}>KES {kes(revenue - expenses)}</b><Link href="/admin/reports" className="small">Reports</Link></div>
        <div className="kpi"><span className="eyebrow">VAT collected</span><b>KES {kes(vatOut)}</b><span className="small muted">to remit to KRA</span></div>
        <div className="kpi"><span className="eyebrow">Buyers still owe</span><b>KES {kes(receivable)}</b><Link href="/admin/invoices" className="small">Payments &amp; collection</Link></div>
        <div className="kpi"><span className="eyebrow">Held for sellers / auctioneers</span><b>KES {kes(owed)}</b><Link href="/admin/payouts" className="small">Payouts</Link></div>
      </div>
      <section className="panel">
        <h3 style={{ marginBottom: 10 }}>Revenue by stream</h3>
        <table className="data">
          <thead><tr><th>Stream</th><th style={{ textAlign: 'right' }}>Entries</th><th style={{ textAlign: 'right' }}>KES</th></tr></thead>
          <tbody>
            {[...streams.entries()].filter(([k]) => k !== 'VAT collected (output)').sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <tr key={k}><td>{k}</td><td style={{ textAlign: 'right' }}>{lines.filter((l) => l.stream === k).length}</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{kes(v)}</td></tr>
            ))}
            {streams.size === 0 && <tr><td colSpan={3} className="small muted">No income recorded in this period yet.</td></tr>}
          </tbody>
        </table>
        {aiCost > 0 && <p className="small muted" style={{ marginTop: 10 }}>AI provider cost in this period: KES {kes(aiCost)} (including internal staff use).</p>}
        <p className="small muted" style={{ marginTop: 10 }}>For bookkeeping, export the lines and give them to your accountant. Expenses are recorded under Expenses; profit per auction and per job is under Reports.</p>
      </section>
    </>
  );
}
