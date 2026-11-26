import Link from 'next/link';
import { getSession } from '@/lib/supabase/server';
import { eat, kes } from '@/lib/format';

type Row = { lot_id: string; lot_no: number; title: string; auction_title: string; status: string; current_bid: number | null; bid_count: number; closes_at: string; invoice_status: string | null; commission_pct: number };

export default async function SellerSales() {
  const { supabase, profile } = await getSession();
  const { data } = await supabase.rpc('auction_seller_sales');
  const rows = (data ?? []) as Row[];
  const sold = rows.filter((r) => r.status === 'sold');
  const pct = Number(profile?.commission_pct ?? 10);
  const gross = sold.reduce((s, r) => s + Number(r.current_bid ?? 0), 0);
  const commission = Math.round((gross * pct) / 100);
  const paidOut = sold.filter((r) => r.invoice_status === 'collected');
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 style={{ fontSize: 28 }}>Sales &amp; payouts</h1>
        <span className="small muted">Your lots in Mnada auctions. You are paid the hammer price minus {pct}% commission once the buyer has paid and collected.</span>
      </div>
      <div className="kpis">
        <div className="kpi"><span className="eyebrow">Sold (hammer)</span><b>KES {kes(gross)}</b></div>
        <div className="kpi"><span className="eyebrow">Commission ({pct}%)</span><b>KES {kes(commission)}</b></div>
        <div className="kpi"><span className="eyebrow">Your net</span><b style={{ color: 'var(--green)' }}>KES {kes(gross - commission)}</b></div>
        <div className="kpi"><span className="eyebrow">Ready for payout</span><b>{paidOut.length} lots</b><span className="small muted">buyer paid &amp; collected</span></div>
      </div>
      <section className="panel">
        {rows.length === 0 ? <p className="small muted">No auction lots yet. <Link href="/seller/consign">Send an item for auction</Link>.</p> : (
          <div className="scroll-x">
            <table className="data" style={{ minWidth: 760 }}>
              <thead><tr><th>Lot</th><th>Auction</th><th>Closes</th><th style={{ textAlign: 'right' }}>Price (KES)</th><th style={{ textAlign: 'right' }}>Your net</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const price = Number(r.current_bid ?? 0);
                  const net = r.status === 'sold' ? price - Math.round((price * pct) / 100) : null;
                  const st = r.status === 'open' ? ['Live', 'pill-green'] : r.status === 'unsold' ? ['Not sold', 'pill-grey']
                    : r.invoice_status === 'collected' ? ['Collected — payout due', 'pill-green'] : r.invoice_status === 'paid' ? ['Buyer paid', 'pill-green'] : ['Awaiting buyer payment', 'pill-warn'];
                  return (
                    <tr key={r.lot_id}>
                      <td><Link href={`/lots/${r.lot_id}`} style={{ fontWeight: 600 }}>Lot {r.lot_no} · {r.title}</Link></td>
                      <td className="small">{r.auction_title}</td>
                      <td className="small">{eat(r.closes_at)}</td>
                      <td style={{ textAlign: 'right' }}>{r.bid_count ? kes(price) : '—'}<div className="small muted">{r.bid_count} bids</div></td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{net !== null ? kes(net) : '—'}</td>
                      <td><span className={`pill ${st[1]}`}>{st[0]}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
