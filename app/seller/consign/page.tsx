import Link from 'next/link';
import { getSession } from '@/lib/supabase/server';
import { kes } from '@/lib/format';
import ConsignForm from './ConsignForm';
import WithdrawButton from './WithdrawButton';

const STATUS: Record<string, [string, string]> = {
  submitted: ['Being reviewed', 'pill-warn'], accepted: ['Accepted — in auction', 'pill-green'], rejected: ['Not accepted', 'pill-grey'], withdrawn: ['Withdrawn', 'pill-grey'],
};

export default async function ConsignPage() {
  const { supabase, user } = await getSession();
  const { data } = await supabase.from('auction_consignments').select('*, auction_lots(id, lot_no, current_bid, bid_count, status, closes_at)').eq('seller_id', user!.id).order('created_at', { ascending: false });
  const rows = data ?? [];
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 style={{ fontSize: 28 }}>Send items for auction</h1>
        <span className="small muted">Tell us about the item. We&apos;ll agree the reserve with you and place it in the right timed auction.</span>
      </div>
      {rows.length > 0 && (
        <section className="panel stack" style={{ gap: 0 }}>
          <h3 style={{ marginBottom: 8 }}>Your items</h3>
          {rows.map((c) => {
            const [t, cls] = STATUS[c.status];
            const lot = c.auction_lots as { id: string; lot_no: number; current_bid: number | null; bid_count: number; status: string } | null;
            return (
              <div key={c.id} className="row" style={{ padding: '12px 0', borderBottom: '1px solid var(--line)', gap: '8px 18px' }}>
                <span className="stack" style={{ gap: 2, flex: '1 1 260px' }}>
                  <b>{c.title}</b>
                  <span className="small muted">{[c.subcategory ?? c.category, c.location, c.desired_reserve ? `reserve wanted KES ${kes(c.desired_reserve)}` : null].filter(Boolean).join(' · ')}</span>
                  {c.admin_note && <span className="small" style={{ color: 'var(--body)' }}>Note from Mnada: {c.admin_note}</span>}
                </span>
                {lot && <span className="small">Lot {lot.lot_no} · {lot.bid_count ? `KES ${kes(lot.current_bid)} (${lot.bid_count} bids)` : 'no bids yet'}</span>}
                <span className={`pill ${cls}`}>{t}</span>
                {lot && <Link href={`/lots/${lot.id}`} className="btn btn-outline btn-sm">View lot</Link>}
                {c.status === 'submitted' && <WithdrawButton id={c.id} />}
              </div>
            );
          })}
        </section>
      )}
      <ConsignForm userId={user!.id} />
    </>
  );
}
