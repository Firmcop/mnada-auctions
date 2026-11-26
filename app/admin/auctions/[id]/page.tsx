import { requireArea } from '@/lib/require-area';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { eat, kes, lotRef, type Auction, type Lot } from '@/lib/format';
import AuctionForm from '../AuctionForm';
import CloseNowButton from './CloseNowButton';

export default async function AdminAuction({ params }: { params: Promise<{ id: string }> }) {
  await requireArea('catalogue');
  const { id } = await params;
  const supabase = await createClient();
  const { data: auction } = await supabase.from('auction_auctions').select('*').eq('id', id).maybeSingle();
  if (!auction) notFound();
  const a = auction as Auction;
  const { data } = await supabase.from('auction_lots').select('*').eq('auction_id', id).order('lot_no');
  const lots = (data ?? []) as Lot[];
  return (
    <>
      <div className="row between">
        <div className="stack" style={{ gap: 4 }}>
          <Link href="/admin/auctions" className="small">← All auctions</Link>
          <h1 style={{ fontSize: 28 }}>{a.title}</h1>
        </div>
        <div className="row">
          {a.status !== 'draft' && <Link href={`/auctions/${a.slug}`} className="btn btn-outline">View on site</Link>}
          <Link href="/admin/import" className="btn btn-outline">Bulk import lots</Link>
          <Link href={`/admin/lots/new?auction=${a.id}`} className="btn btn-primary">Add lot</Link>
        </div>
      </div>
      <section className="panel stack">
        <div className="row between"><h3>Lots ({lots.length})</h3><CloseNowButton /></div>
        <div className="scroll-x">
          <table className="data" style={{ minWidth: 720 }}>
            <thead><tr><th>Lot</th><th>Title</th><th>Photos</th><th>Start</th><th>Current</th><th>Bids</th><th>Closes</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {lots.map((l) => (
                <tr key={l.id}>
                  <td>{l.lot_no}<div className="small muted">{lotRef(a.code, l.lot_no)}</div></td>
                  <td style={{ fontWeight: 600 }}>{l.title}</td>
                  <td>{l.photos.length === 0 ? <span className="pill pill-warn">None</span> : l.photos.length}</td>
                  <td>{kes(l.start_bid)}</td>
                  <td>{l.bid_count ? kes(l.current_bid) : '—'}</td>
                  <td>{l.bid_count}</td>
                  <td className="small">{eat(l.closes_at)}</td>
                  <td><span className={`pill ${l.status === 'open' ? 'pill-green' : 'pill-grey'}`}>{l.status}</span>{l.has_reserve && <div className="small muted">{l.reserve_met ? 'reserve met' : 'reserve not met'}</div>}</td>
                  <td><Link href={`/admin/lots/${l.id}`} className="btn btn-outline btn-sm">Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lots.length === 0 && <p className="muted small">No lots yet.</p>}
      </section>
      <section className="panel stack">
        <h3>Auction settings</h3>
        <AuctionForm auction={a} />
      </section>
    </>
  );
}
