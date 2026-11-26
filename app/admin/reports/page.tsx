import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { kes } from '@/lib/format';
import { EXPENSE_CATEGORIES } from '@/lib/erp';
import { byStream, incomeLines, VAT_STREAM } from '@/lib/finance';

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ y?: string }> }) {
  const { y } = await searchParams;
  const nowYear = new Date(Date.now() + 3 * 3600 * 1000).getUTCFullYear();
  const year = Number(y) || nowYear;
  const since = new Date(`${year}-01-01T00:00:00+03:00`).toISOString();
  const until = new Date(`${year + 1}-01-01T00:00:00+03:00`).toISOString();
  const supabase = await createClient();
  const [{ lines }, { data: exp }, { data: auctions }, { data: lots }, { data: jobs }, { data: notes }, { data: allExp }] = await Promise.all([
    incomeLines(supabase, since, until),
    supabase.from('auction_expenses').select('spent_on, category, amount_kes, vat_kes').gte('spent_on', `${year}-01-01`).lt('spent_on', `${year + 1}-01-01`),
    supabase.from('auction_auctions').select('id, title, status, first_close_at, auctioneer_id').neq('status', 'draft').order('first_close_at', { ascending: false }).limit(100),
    supabase.from('auction_lots').select('auction_id, status, current_bid'),
    supabase.from('auction_help_requests').select('id, reference, contact_name, status, quote_subtotal_kes, completed_at').in('status', ['accepted', 'scheduled', 'in_progress', 'done']).order('created_at', { ascending: false }).limit(100),
    supabase.from('auction_help_notes').select('request_id, minutes, km'),
    supabase.from('auction_expenses').select('auction_id, help_request_id, amount_kes, vat_kes'),
  ]);
  // whole-life income per auction / job (not limited to the year)
  const { lines: allLines } = await incomeLines(supabase, '2000-01-01T00:00:00Z');

  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
  const inc = (m: string) => lines.filter((l) => l.stream !== VAT_STREAM && l.date.startsWith(m)).reduce((s, l) => s + l.amount, 0);
  const cost = (m: string) => (exp ?? []).filter((e) => e.spent_on.startsWith(m)).reduce((s, e) => s + Number(e.amount_kes) - Number(e.vat_kes), 0);
  const streams = byStream(lines);
  streams.delete(VAT_STREAM);
  const expByCat = new Map<string, number>();
  (exp ?? []).forEach((e) => expByCat.set(e.category, (expByCat.get(e.category) ?? 0) + Number(e.amount_kes) - Number(e.vat_kes)));
  const totalInc = [...streams.values()].reduce((a, b) => a + b, 0);
  const totalExp = [...expByCat.values()].reduce((a, b) => a + b, 0);
  const expNet = (f: (e: { auction_id: string | null; help_request_id: string | null }) => boolean) => (allExp ?? []).filter(f).reduce((s, e) => s + Number(e.amount_kes) - Number(e.vat_kes), 0);
  const M = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });

  return (
    <>
      <div className="row between">
        <div className="stack" style={{ gap: 4 }}>
          <h1 style={{ fontSize: 28 }}>Reports</h1>
          <span className="small muted">Profit and loss on payments received, less recorded expenses (excluding VAT). A management view, not statutory accounts.</span>
        </div>
        <div className="row">
          <Link href={`/admin/reports?y=${year - 1}`} className="btn btn-outline btn-sm">← {year - 1}</Link>
          <b>{year}</b>
          {year < nowYear && <Link href={`/admin/reports?y=${year + 1}`} className="btn btn-outline btn-sm">{year + 1} →</Link>}
        </div>
      </div>
      <div className="kpis">
        <div className="kpi"><span className="eyebrow">Income {year}</span><b>KES {kes(totalInc)}</b></div>
        <div className="kpi"><span className="eyebrow">Expenses {year}</span><b>KES {kes(totalExp)}</b></div>
        <div className="kpi"><span className="eyebrow">Profit {year}</span><b style={{ color: totalInc - totalExp >= 0 ? 'var(--green)' : 'var(--danger)' }}>KES {kes(totalInc - totalExp)}</b></div>
      </div>

      <section className="panel">
        <h3 style={{ marginBottom: 10 }}>Month by month</h3>
        <div className="scroll-x">
          <table className="data" style={{ minWidth: 900 }}>
            <thead><tr><th></th>{months.map((m) => <th key={m} style={{ textAlign: 'right' }}>{M(m)}</th>)}</tr></thead>
            <tbody>
              <tr><td>Income</td>{months.map((m) => <td key={m} style={{ textAlign: 'right' }}>{kes(inc(m))}</td>)}</tr>
              <tr><td>Expenses</td>{months.map((m) => <td key={m} style={{ textAlign: 'right' }}>{kes(cost(m))}</td>)}</tr>
              <tr><td><b>Profit</b></td>{months.map((m) => <td key={m} style={{ textAlign: 'right', fontWeight: 700, color: inc(m) - cost(m) < 0 ? 'var(--danger)' : undefined }}>{kes(inc(m) - cost(m))}</td>)}</tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
        <section className="panel" style={{ flex: '1 1 360px' }}>
          <h3 style={{ marginBottom: 10 }}>Income by stream</h3>
          <table className="data"><tbody>
            {[...streams.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => <tr key={k}><td>{k}</td><td style={{ textAlign: 'right' }}>{kes(v)}</td></tr>)}
            {streams.size === 0 && <tr><td className="small muted">No income yet.</td></tr>}
          </tbody></table>
        </section>
        <section className="panel" style={{ flex: '1 1 360px' }}>
          <h3 style={{ marginBottom: 10 }}>Expenses by category</h3>
          <table className="data"><tbody>
            {[...expByCat.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => <tr key={k}><td>{EXPENSE_CATEGORIES[k] ?? k}</td><td style={{ textAlign: 'right' }}>{kes(v)}</td></tr>)}
            {expByCat.size === 0 && <tr><td className="small muted">No expenses recorded.</td></tr>}
          </tbody></table>
        </section>
      </div>

      <section className="panel">
        <h3 style={{ marginBottom: 10 }}>Profit per auction</h3>
        <div className="scroll-x">
          <table className="data" style={{ minWidth: 860 }}>
            <thead><tr><th>Auction</th><th style={{ textAlign: 'right' }}>Lots sold</th><th style={{ textAlign: 'right' }}>Hammer total</th><th style={{ textAlign: 'right' }}>Mnada income</th><th style={{ textAlign: 'right' }}>Expenses</th><th style={{ textAlign: 'right' }}>Profit</th></tr></thead>
            <tbody>
              {(auctions ?? []).map((a) => {
                const al = (lots ?? []).filter((l) => l.auction_id === a.id);
                const sold = al.filter((l) => l.status === 'sold');
                const income = allLines.filter((l) => l.auctionId === a.id && l.stream !== VAT_STREAM).reduce((s, l) => s + l.amount, 0);
                const ex = expNet((e) => e.auction_id === a.id);
                return (
                  <tr key={a.id}>
                    <td><Link href={`/admin/auctions/${a.id}`}>{a.title}</Link><div className="small muted">{a.status}{a.auctioneer_id ? ' · run by auctioneer' : ''}</div></td>
                    <td style={{ textAlign: 'right' }}>{sold.length} / {al.length}<div className="small muted">{al.length ? Math.round((sold.length / al.length) * 100) : 0}%</div></td>
                    <td style={{ textAlign: 'right' }}>{kes(sold.reduce((s, l) => s + Number(l.current_bid ?? 0), 0))}</td>
                    <td style={{ textAlign: 'right' }}>{kes(income)}</td>
                    <td style={{ textAlign: 'right' }}>{kes(ex)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: income - ex < 0 ? 'var(--danger)' : undefined }}>{kes(income - ex)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>Income counts payments received so far; unpaid invoices are not included.</p>
      </section>

      <section className="panel">
        <h3 style={{ marginBottom: 10 }}>Profit per Listing Help job</h3>
        <div className="scroll-x">
          <table className="data" style={{ minWidth: 820 }}>
            <thead><tr><th>Job</th><th style={{ textAlign: 'right' }}>Quoted (excl. VAT)</th><th style={{ textAlign: 'right' }}>Received</th><th style={{ textAlign: 'right' }}>Expenses</th><th style={{ textAlign: 'right' }}>Staff time</th><th style={{ textAlign: 'right' }}>Profit so far</th></tr></thead>
            <tbody>
              {(jobs ?? []).map((j) => {
                const received = allLines.filter((l) => l.helpId === j.id && l.stream !== VAT_STREAM).reduce((s, l) => s + l.amount, 0);
                const ex = expNet((e) => e.help_request_id === j.id);
                const n = (notes ?? []).filter((x) => x.request_id === j.id);
                const mins = n.reduce((s, x) => s + (x.minutes ?? 0), 0);
                const km = n.reduce((s, x) => s + Number(x.km ?? 0), 0);
                return (
                  <tr key={j.id}>
                    <td><Link href={`/admin/help/${j.id}`}>{j.reference}</Link> · {j.contact_name}<div className="small muted">{j.status}</div></td>
                    <td style={{ textAlign: 'right' }}>{kes(j.quote_subtotal_kes)}</td>
                    <td style={{ textAlign: 'right' }}>{kes(received)}</td>
                    <td style={{ textAlign: 'right' }}>{kes(ex)}</td>
                    <td style={{ textAlign: 'right' }} className="small">{Math.round(mins / 6) / 10} h · {km} km</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: received - ex < 0 ? 'var(--danger)' : undefined }}>{kes(received - ex)}</td>
                  </tr>
                );
              })}
              {(jobs ?? []).length === 0 && <tr><td colSpan={6} className="small muted">No accepted jobs yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>&quot;Received&quot; is excluding VAT and covers deposits and balances paid. Amounts deducted from sale proceeds show under the auction where the lot sold.</p>
      </section>
    </>
  );
}
