import Link from 'next/link';
import { getSession } from '@/lib/supabase/server';
import { eat, kes, type Auction } from '@/lib/format';
import { licenceExpiringSoon, myFirm, publishLabel, type FirmFee } from '@/lib/auctioneer';

export default async function AuctioneerDashboard() {
  const { supabase, user } = await getSession();
  const { firm } = (await myFirm(supabase, user!.id))!;
  const [{ data: auctions }, { data: fees }, { data: lots }] = await Promise.all([
    supabase.from('auction_auctions').select('*').eq('auctioneer_id', firm.id).order('created_at', { ascending: false }),
    supabase.from('auction_auctioneer_fees').select('*').eq('auctioneer_id', firm.id).order('created_at', { ascending: false }).limit(50),
    supabase.from('auction_lots').select('auction_id, status, current_bid, bid_count, auction_auctions!inner(auctioneer_id)').eq('auction_auctions.auctioneer_id', firm.id),
  ]);
  const list = (auctions ?? []) as Auction[];
  const pend = ((fees ?? []) as FirmFee[]).filter((f) => f.status === 'pending');
  const l = lots ?? [];
  const sold = l.filter((x) => x.status === 'sold');
  return (
    <>
      <div className="row between">
        <h1 style={{ fontSize: 28 }}>{firm.name}</h1>
        <div className="row">
          {firm.status === 'approved' && <Link href={`/auctioneers/${firm.slug}`} className="btn btn-outline">Public page</Link>}
          {firm.status === 'approved' && <Link href="/auctioneer/auctions/new" className="btn btn-primary">New auction</Link>}
        </div>
      </div>
      {licenceExpiringSoon(firm) && <div className="alert alert-info">Your licence expires on {new Date(firm.licence_expiry!).toLocaleDateString('en-GB')}. Upload the renewal in Firm profile.</div>}
      <div className="kpis">
        <div className="kpi"><span className="eyebrow">Live auctions</span><b>{list.filter((a) => a.status === 'live').length}</b></div>
        <div className="kpi"><span className="eyebrow">Open lots</span><b>{l.filter((x) => x.status === 'open').length}</b><span className="small muted">{l.reduce((s, x) => s + (x.status === 'open' ? x.bid_count : 0), 0)} bids</span></div>
        <div className="kpi"><span className="eyebrow">Sold lots</span><b>{sold.length}</b><span className="small muted">KES {kes(sold.reduce((s, x) => s + Number(x.current_bid ?? 0), 0))} hammer</span></div>
      </div>
      {pend.length > 0 && (
        <section className="panel stack" style={{ gap: 8, border: '2px solid #F2C3A8' }}>
          <h3>Listing fees due</h3>
          {pend.map((f) => (
            <div key={f.id} className="stack" style={{ gap: 2, padding: '6px 0', borderBottom: '1px solid #F0F2F4' }}>
              <b>KES {kes(f.amount_kes)} · {list.find((a) => a.id === f.auction_id)?.title ?? 'Auction'} ({f.lot_count} lots)</b>
              <span className="small">M-Pesa: Pay Bill › Business no. <b>[PAYBILL]</b> › Account no. <b>{f.reference}</b> — or bank transfer quoting {f.reference}. The auction goes live once payment is confirmed.</span>
            </div>
          ))}
        </section>
      )}
      <section className="panel stack" style={{ gap: 0 }}>
        <h3 style={{ marginBottom: 8 }}>Auctions</h3>
        {list.length === 0 && <p className="small muted">No auctions yet.</p>}
        {list.map((a) => {
          const [label, cls] = publishLabel(a);
          const al = l.filter((x) => x.auction_id === a.id);
          return (
            <Link key={a.id} href={`/auctioneer/auctions/${a.id}`} className="list-row" style={{ textDecoration: 'none', color: 'inherit' }}>
              <span className={`pill ${cls}`}>{label}</span>
              <span className="stack" style={{ gap: 2, flex: '1 1 300px' }}>
                <b>{a.title}</b>
                <span className="small muted">{al.length} lots · first lot closes {a.first_close_at ? eat(a.first_close_at) : '—'}</span>
              </span>
              <span className="small">{al.reduce((s, x) => s + x.bid_count, 0)} bids</span>
            </Link>
          );
        })}
      </section>
    </>
  );
}
