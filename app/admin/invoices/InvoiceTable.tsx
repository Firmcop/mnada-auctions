'use client';
import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { kes } from '@/lib/format';

export type InvoiceRow = {
  id: string; invoice_no: number; total: number; paid: number; status: 'unpaid' | 'part' | 'paid' | 'collected' | 'cancelled';
  due_at: string; buyer: string; phone: string; lot: string; auction: string;
};

const GROUPS = [['all', 'All'], ['unpaid', 'Unpaid'], ['overdue', 'Overdue'], ['paid', 'Paid · to collect'], ['collected', 'Collected'], ['cancelled', 'Cancelled']] as const;

export default function InvoiceTable({ initial }: { initial: InvoiceRow[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState(initial);
  const [group, setGroup] = useState<string>('all');
  const [payFor, setPayFor] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const groupOf = (r: InvoiceRow) => (r.status === 'unpaid' || r.status === 'part' ? 'unpaid' : r.status);
  const isOverdue = (r: InvoiceRow) => (r.status === 'unpaid' || r.status === 'part') && new Date(r.due_at) < new Date();
  const inGroup = (r: InvoiceRow, g: string) => (g === 'all' ? r.status !== 'cancelled' : g === 'overdue' ? isOverdue(r) : groupOf(r) === g);
  const shown = rows.filter((r) => inGroup(r, group));
  const live = rows.filter((r) => r.status !== 'cancelled');
  const invoiced = live.reduce((s, r) => s + r.total, 0);
  const received = live.reduce((s, r) => s + r.paid, 0);

  async function update(id: string, patch: Partial<InvoiceRow>) {
    setErr(null);
    const { error } = await supabase.from('auction_invoices').update({ paid: patch.paid, status: patch.status }).eq('id', id);
    if (error) { setErr(error.message); return; }
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function recordPayment(r: InvoiceRow) {
    const add = Number(amount.replace(/[^0-9]/g, ''));
    if (!add) return;
    const paid = r.paid + add;
    await update(r.id, { paid, status: paid >= r.total ? 'paid' : 'part' });
    setPayFor(null);
    setAmount('');
  }

  return (
    <>
      <div className="kpis">
        <div className="kpi"><span className="eyebrow">Invoiced</span><b>KES {kes(invoiced)}</b></div>
        <div className="kpi"><span className="eyebrow">Received</span><b style={{ color: 'var(--green)' }}>KES {kes(received)}</b></div>
        <div className="kpi"><span className="eyebrow">Outstanding</span><b style={{ color: 'var(--accent-text)' }}>KES {kes(invoiced - received)}</b></div>
        <div className="kpi"><span className="eyebrow">Collected</span><b>{rows.filter((r) => r.status === 'collected').length} of {live.length}</b></div>
      </div>
      <section className="panel stack">
        <div className="row" role="tablist" aria-label="Filter invoices">
          {GROUPS.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={group === id} className={`btn btn-sm ${group === id ? 'btn-dark' : 'btn-outline'}`} onClick={() => setGroup(id)}>
              {label} ({rows.filter((r) => inGroup(r, id)).length})
            </button>
          ))}
        </div>
        {err && <div className="alert alert-err">{err}</div>}
        <div className="scroll-x">
          <table className="data" style={{ minWidth: 820 }}>
            <thead><tr><th>Invoice</th><th>Buyer</th><th>Lot</th><th style={{ textAlign: 'right' }}>Total (KES)</th><th>Due</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {shown.map((r) => {
                const owed = r.total - r.paid;
                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>INV-{r.invoice_no}</td>
                    <td>{r.buyer}<div className="small muted">{r.phone}</div></td>
                    <td className="small">{r.lot}<div className="muted">{r.auction}</div></td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{kes(r.total)}</td>
                    <td className="small" style={{ color: isOverdue(r) ? 'var(--danger)' : undefined, fontWeight: isOverdue(r) ? 700 : 400 }}>{r.due_at ? new Date(r.due_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</td>
                    <td>
                      <span className={`pill ${r.status === 'paid' ? 'pill-green' : r.status === 'collected' || r.status === 'cancelled' ? 'pill-grey' : 'pill-warn'}`}>
                        {r.status === 'cancelled' ? 'Cancelled' : r.status === 'unpaid' ? (isOverdue(r) ? 'Overdue' : 'Unpaid') : r.status === 'part' ? 'Part-paid' : r.status === 'paid' ? 'Paid' : 'Collected'}
                      </span>
                      {owed > 0 && r.status !== 'cancelled' && <div className="small muted">KES {kes(owed)} due</div>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {(r.status === 'unpaid' || r.status === 'part') && (payFor === r.id ? (
                        <span className="row" style={{ gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                          <input className="input" style={{ width: 140, height: 38 }} inputMode="numeric" aria-label="Amount received" placeholder={kes(owed)} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
                          <button type="button" className="btn btn-dark btn-sm" onClick={() => recordPayment(r)}>Save</button>
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => setPayFor(null)}>Cancel</button>
                        </span>
                      ) : (
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => { setPayFor(r.id); setAmount(String(owed)); }}>Record payment</button>
                      ))}
                      {isOverdue(r) && r.paid === 0 && payFor !== r.id && <button type="button" className="btn btn-outline btn-sm" style={{ marginLeft: 6 }} onClick={async () => {
                        const why = window.prompt(`Cancel INV-${r.invoice_no} for non-payment? The lot goes back to allocation so it can be offered to the next bidder, and the buyer's record shows a default. Reason (optional):`);
                        if (why === null) return;
                        const { error } = await supabase.rpc('auction_invoice_default', { p_invoice: r.id, p_reason: why });
                        if (error) { setErr(error.message); return; }
                        setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, status: 'cancelled' } : x)));
                      }}>Cancel — not paid</button>}
                      {r.status === 'paid' && <button type="button" className="btn btn-primary btn-sm" onClick={() => update(r.id, { status: 'collected' })}>Mark collected</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {shown.length === 0 && <p className="small muted">No invoices here yet. Invoices are created automatically when a lot closes with a winning bid.</p>}
      </section>
    </>
  );
}
