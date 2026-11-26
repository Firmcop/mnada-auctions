import Link from 'next/link';
import { getSession } from '@/lib/supabase/server';
import { kes } from '@/lib/format';

export default async function SellerHome() {
  const { supabase, user, profile } = await getSession();
  const uid = user!.id;
  const [{ data: listings }, { data: cons }, { data: sales }, { count: newEnq }] = await Promise.all([
    supabase.from('auction_listings').select('id, status, review_status').eq('owner_id', uid),
    supabase.from('auction_consignments').select('id, status').eq('seller_id', uid),
    supabase.rpc('auction_seller_sales'),
    supabase.from('auction_enquiries').select('id, auction_listings!inner(owner_id)', { count: 'exact', head: true }).eq('auction_listings.owner_id', uid).eq('status', 'new'),
  ]);
  const ls = listings ?? [];
  const lots = (sales ?? []) as { status: string; current_bid: number | null; bid_count: number }[];
  const live = lots.filter((l) => l.status === 'open');
  const sold = lots.filter((l) => l.status === 'sold');
  return (
    <>
      <div className="row between">
        <div className="stack" style={{ gap: 4 }}>
          <h1 style={{ fontSize: 28 }}>Welcome, {profile?.business_name}</h1>
          <span className="small muted">Commission {profile?.commission_pct}% on sales · payouts by {profile?.payout_method === 'bank' ? 'bank transfer' : 'M-Pesa'}</span>
        </div>
        <div className="row">
          <Link href="/seller/consign" className="btn btn-outline">Send item for auction</Link>
          <Link href="/seller/listings/new" className="btn btn-primary">List an item for sale</Link>
        </div>
      </div>
      <div className="kpis">
        <Link href="/seller/listings" className="kpi" style={{ textDecoration: 'none' }}><span className="eyebrow">Live listings</span><b>{ls.filter((l) => l.status === 'active').length}</b><span className="small muted">{ls.filter((l) => l.review_status === 'pending').length} waiting for review</span></Link>
        <Link href="/seller/enquiries" className="kpi" style={{ textDecoration: 'none' }}><span className="eyebrow">New enquiries</span><b style={{ color: (newEnq ?? 0) > 0 ? 'var(--accent-text)' : undefined }}>{newEnq ?? 0}</b></Link>
        <Link href="/seller/consign" className="kpi" style={{ textDecoration: 'none' }}><span className="eyebrow">Items sent for auction</span><b>{(cons ?? []).length}</b><span className="small muted">{(cons ?? []).filter((c) => c.status === 'submitted').length} being reviewed</span></Link>
        <Link href="/seller/sales" className="kpi" style={{ textDecoration: 'none' }}><span className="eyebrow">In live auctions</span><b>{live.length}</b><span className="small muted">KES {kes(live.reduce((s, l) => s + Number(l.current_bid ?? 0), 0))} bid so far</span></Link>
        <Link href="/seller/sales" className="kpi" style={{ textDecoration: 'none' }}><span className="eyebrow">Sold at auction</span><b>{sold.length}</b><span className="small muted">KES {kes(sold.reduce((s, l) => s + Number(l.current_bid ?? 0), 0))}</span></Link>
      </div>
      <section className="panel stack" style={{ gap: 8 }}>
        <h3>How selling works</h3>
        <ol className="small" style={{ margin: 0, paddingLeft: 20, color: 'var(--body)', lineHeight: 1.8 }}>
          <li><b>Direct sale:</b> list an item with a fixed price, asking price or “price on request”. We check it and publish it, usually the same day. Buyers&apos; offers and questions arrive under Enquiries.</li>
          <li><b>Auction:</b> send us the item details and photos. We agree the reserve with you and place it in the right timed auction.</li>
          <li>Buyers pay Mnada. After collection we pay you the sale price minus your commission.</li>
        </ol>
      </section>
    </>
  );
}
