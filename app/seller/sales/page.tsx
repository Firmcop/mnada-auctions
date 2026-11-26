import Link from 'next/link';
import { getSession } from '@/lib/supabase/server';
import { eat, kes } from '@/lib/format';
import { SETTLE_LABEL, type Payout, type Settlement } from '@/lib/settlements';

type Row = { lot_id: string; lot_no: number; title: string; auction_title: string; status: string; current_bid: number | null; bid_count: number; closes_at: string; invoice_status: string | null; commission_pct: number };

export default async function SellerSales() {
  const { supabase, user, profile } = await getSession();
  const [{ data }, { data: st }, { data: po }] = await Promise.all([
    supabase.rpc('auction_seller_sales'),
    supabase.from('auction_settlements').select('*').eq('seller_id', user!.id),
    supabase.from('auction_payouts').select('*').eq('seller_id', user!.id).neq('status', 'cancelled').order('created_at', { ascending: false }),
  ]);
  const rows = (data ?? []) as Row[];
  const settlements = (st ?? []) as Settlement[];
  const payouts = (po ?? []) as Payout[];
  const pct = Number(profile?.commission_pct ?? 10);
  const sum = (f: (s: Settlement) => boolean) => settlements.filter(f).reduce((a, s) => a + Number(s.net_kes), 0);
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 style={{ fontSize: 28 }}>Sales &amp; payouts</h1>
        <span className="small muted">You receive the hammer price (plus VAT if you charge it) minus {pct}% commission and VAT on the commission, and minus any Listing Help you chose to pay from proceeds. Your money is released once the buyer has paid and collected.</span>
      </div>
      <div className="kpis">
        <div className="kpi"><span className="eyebrow">Awaiting buyer payment</span><b>KES {kes(sum((s) => s.status === 'awaiting_payment'))}</b></div>
        <div className="kpi"><span className="eyebrow">Paid, awaiting collection</span><b>KES {kes(sum((s) => s.status === 'held'))}</b></div>
        <div className="kpi"><span className="eyebrow">Released to you</span><b style={{ color: 'var(--green)' }}>KES {kes(sum((s) => s.status === 'released'))}</b><span className="small muted">being paid out</span></div>
        <div className="kpi"><span className="eyebrow">Paid out</span><b>KES {kes(sum((s) => s.status === 'paid'))}</b></div>
      </div>
      <section className="panel">
        {rows.length === 0 ? <p className="small muted">No auction lots yet. <Link href="/seller/consign">Send an item for auction</Link>.</p> : (
          <div className="scroll-x">
            <table className="data" style={{ minWidth: 900 }}>
              <thead><tr><th>Lot</th><th>Closes</th><th style={{ textAlign: 'right' }}>Price</th><th style={{ textAlign: 'right' }}>Commission + VAT</th><th style={{ textAlign: 'right' }}>Listing Help</th><th style={{ textAlign: 'right' }}>Your net</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const s = settlements.find((x) => x.lot_id === r.lot_id);
                  const st = r.status === 'open' ? ['Live', 'pill-green'] : r.status === 'unsold' ? ['Not sold', 'pill-grey'] : s ? SETTLE_LABEL[s.status] : ['Sold', 'pill-green'];
                  return (
                    <tr key={r.lot_id}>
                      <td><Link href={`/lots/${r.lot_id}`} style={{ fontWeight: 600 }}>Lot {r.lot_no} · {r.title}</Link><div className="small muted">{r.auction_title}</div></td>
                      <td className="small">{eat(r.closes_at)}</td>
                      <td style={{ textAlign: 'right' }}>{r.bid_count ? kes(r.current_bid) : '—'}<div className="small muted">{r.bid_count} bids</div></td>
                      <td style={{ textAlign: 'right' }}>{s ? kes(Number(s.fee_kes) + Number(s.fee_vat_kes)) : '—'}</td>
                      <td style={{ textAlign: 'right' }}>{s && Number(s.help_deduction_kes) ? kes(s.help_deduction_kes) : '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{s ? kes(s.net_kes) : '—'}</td>
                      <td><span className={`pill ${st[1]}`}>{st[0]}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="panel stack" style={{ gap: 0 }}>
        <h3 style={{ marginBottom: 8 }}>Payouts</h3>
        {payouts.length === 0 && <span className="small muted">No payouts yet.</span>}
        {payouts.map((p) => (
          <div key={p.id} className="row between small" style={{ padding: '6px 0', borderBottom: '1px solid #F0F2F4' }}>
            <span>{new Date(p.paid_at ?? p.created_at).toLocaleDateString('en-GB')} · {p.method === 'mpesa' ? 'M-Pesa' : 'Bank'} {p.details}</span>
            <span>{p.reference}{p.payment_ref ? ` · ${p.payment_ref}` : ''}</span>
            <b>KES {kes(p.amount_kes)}</b>
            <span className={`pill ${p.status === 'paid' ? 'pill-green' : 'pill-warn'}`}>{p.status === 'paid' ? 'Paid' : 'Being processed'}</span>
          </div>
        ))}
      </section>
    </>
  );
}
