import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import { kes } from '@/lib/format';
import { loadAllocations } from '@/lib/allocations';
import OfferActions from './OfferActions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Offers & allocation' };

export default async function MyOffers() {
  const { supabase, user } = await getSession();
  if (!user) redirect('/login?next=/account/offers');
  const all = await loadAllocations(supabase, { since: new Date(Date.now() - 30 * 86400000).toISOString() });
  const mine = all.filter((a) => a.top_bidder === user.id || a.buyer_id === user.id || a.offers.some((o) => o.bidder_id === user.id));
  const { count: decide } = await supabase.from('auction_allocations').select('id', { count: 'exact', head: true }).eq('status', 'open');
  const decidesOthers = (decide ?? 0) > mine.filter((a) => a.status === 'open').length;
  return (
    <div className="wrap section stack" style={{ maxWidth: 900, gap: 18 }}>
      <h1>Offers &amp; allocation</h1>
      <p className="small" style={{ color: 'var(--body)', margin: 0 }}>When bidding closes below the seller&apos;s reserve, the lot goes to <b>allocation</b>: the seller has 48 hours to accept your bid, send you an offer, or decline. Your highest bid stays binding until then. Prices shown exclude the buyer&apos;s premium and VAT.</p>
      {decidesOthers && <div className="alert alert-info">You also have lots of your own awaiting a decision — see <Link href="/seller/allocations">Seller portal</Link> or <Link href="/auctioneer/allocations">Auctioneer portal</Link>.</div>}
      {mine.length === 0 && <p className="small muted">Nothing here right now.</p>}
      {mine.map((a) => {
        const lot = a.auction_lots;
        const myOffers = a.offers.filter((o) => o.bidder_id === user.id);
        const pending = myOffers.find((o) => o.status === 'pending' && o.from_side === 'seller');
        const waiting = myOffers.find((o) => o.status === 'pending' && o.from_side === 'bidder');
        const status = a.status === 'open'
          ? pending ? ['Offer for you', 'pill-warn'] : waiting ? ['Waiting for the seller', 'pill-warn'] : ['Seller deciding', 'pill-warn']
          : a.buyer_id === user.id ? ['You bought this lot', 'pill-green'] : ['Not sold to you', 'pill-grey'];
        return (
          <section key={a.id} className="panel stack" style={{ gap: 8, border: pending ? '2px solid #F2C3A8' : undefined }}>
            <div className="row between">
              <Link href={`/lots/${lot?.id}`} style={{ fontWeight: 700 }}>Lot {lot?.lot_no} · {lot?.title}</Link>
              <span className={`pill ${status[1]}`}>{status[0]}</span>
            </div>
            {a.top_bidder === user.id && <span className="small">Your highest bid: KES {kes(a.top_bid)}{a.status === 'open' && !pending ? ` · decision by ${new Date(a.deadline).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}</span>}
            {a.status === 'agreed' && a.buyer_id === user.id && <span className="small">Agreed at KES {kes(a.agreed_price)} — <Link href="/account">see your invoice</Link>.</span>}
            {pending && <OfferActions offer={pending} />}
            {waiting && <span className="small">You countered with KES {kes(waiting.amount)}. The seller has until {new Date(waiting.expires_at).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'short', hour: '2-digit', minute: '2-digit' })} to answer.</span>}
          </section>
        );
      })}
    </div>
  );
}
