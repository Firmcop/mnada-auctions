import Link from 'next/link';
import { getSession } from '@/lib/supabase/server';
import { kes } from '@/lib/format';
import { myFirm } from '@/lib/auctioneer';
import { SETTLE_LABEL, type Payout, type Settlement } from '@/lib/settlements';

export default async function FirmPayouts() {
  const { supabase, user } = await getSession();
  const { firm } = (await myFirm(supabase, user!.id))!;
  const [{ data: st }, { data: po }] = await Promise.all([
    supabase.from('auction_settlements').select('*, auction_lots(lot_no, title, auction_auctions(title))').eq('auctioneer_id', firm.id).order('created_at', { ascending: false }),
    supabase.from('auction_payouts').select('*').eq('auctioneer_id', firm.id).neq('status', 'cancelled').order('created_at', { ascending: false }),
  ]);
  const rows = (st ?? []) as (Settlement & { auction_lots: { lot_no: number; title: string; auction_auctions: { title: string } } | null })[];
  const payouts = (po ?? []) as Payout[];
  const sum = (k: Settlement['status']) => rows.filter((s) => s.status === k).reduce((a, s) => a + Number(s.net_kes), 0);
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 style={{ fontSize: 28 }}>Sales &amp; payouts</h1>
        <span className="small muted">Buyers pay Mnada. For each sold lot you receive the full invoice (hammer, your buyer&apos;s premium, extras and VAT) minus Mnada&apos;s success fee and VAT on it. Money is released once the buyer has collected.</span>
      </div>
      <div className="kpis">
        <div className="kpi"><span className="eyebrow">Awaiting buyer payment</span><b>KES {kes(sum('awaiting_payment'))}</b></div>
        <div className="kpi"><span className="eyebrow">Paid, awaiting collection</span><b>KES {kes(sum('held'))}</b></div>
        <div className="kpi"><span className="eyebrow">Released to you</span><b style={{ color: 'var(--green)' }}>KES {kes(sum('released'))}</b></div>
        <div className="kpi"><span className="eyebrow">Paid out</span><b>KES {kes(sum('paid'))}</b></div>
      </div>
      <section className="panel">
        {rows.length === 0 ? <p className="small muted">No sold lots yet.</p> : (
          <div className="scroll-x">
            <table className="data" style={{ minWidth: 820 }}>
              <thead><tr><th>Lot</th><th style={{ textAlign: 'right' }}>Invoice total</th><th style={{ textAlign: 'right' }}>Success fee</th><th style={{ textAlign: 'right' }}>VAT on fee</th><th style={{ textAlign: 'right' }}>Your net</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td><Link href={`/lots/${s.lot_id}`} style={{ fontWeight: 600 }}>Lot {s.auction_lots?.lot_no} · {s.auction_lots?.title}</Link><div className="small muted">{s.auction_lots?.auction_auctions?.title}</div></td>
                    <td style={{ textAlign: 'right' }}>{kes(s.gross_kes)}</td>
                    <td style={{ textAlign: 'right' }}>{kes(s.fee_kes)}<div className="small muted">{Number(s.fee_pct)}% of hammer</div></td>
                    <td style={{ textAlign: 'right' }}>{kes(s.fee_vat_kes)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{kes(s.net_kes)}</td>
                    <td><span className={`pill ${SETTLE_LABEL[s.status][1]}`}>{SETTLE_LABEL[s.status][0]}</span></td>
                  </tr>
                ))}
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
