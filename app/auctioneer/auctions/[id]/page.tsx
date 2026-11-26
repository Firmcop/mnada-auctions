import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import { eat, kes, lotRef, type Auction, type Lot } from '@/lib/format';
import { myFirm, publishLabel, type FirmFee } from '@/lib/auctioneer';
import AuctionForm from '@/app/admin/auctions/AuctionForm';
import PublishPanel from './PublishPanel';

type Result = { lot_id: string; lot_no: number; title: string; status: string; hammer: number | null; bid_count: number; winner_name: string | null; winner_phone: string | null; winner_email: string | null; invoice_no: string | null; invoice_status: string | null; invoice_total: number | null };

export default async function FirmAuction({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSession();
  const { firm } = (await myFirm(supabase, user!.id))!;
  const { data: auction } = await supabase.from('auction_auctions').select('*').eq('id', id).eq('auctioneer_id', firm.id).maybeSingle();
  if (!auction) notFound();
  const a = auction as Auction;
  const [{ data: lotsData }, { data: fees }, { data: settings }, { data: priv }, results] = await Promise.all([
    supabase.from('auction_lots').select('*').eq('auction_id', id).order('lot_no'),
    supabase.from('auction_auctioneer_fees').select('*').eq('auction_id', id).order('created_at', { ascending: false }),
    supabase.from('auction_auctioneer_settings').select('listing_fee_kes, lot_fee_kes, success_fee_pct').eq('id', 1).single(),
    supabase.from('auction_auctioneer_private').select('listing_fee_kes, lot_fee_kes, success_fee_pct').eq('auctioneer_id', firm.id).maybeSingle(),
    a.status !== 'draft' ? supabase.rpc('auction_firm_results', { p_auction: id }) : Promise.resolve({ data: [] }),
  ]);
  const lots = (lotsData ?? []) as Lot[];
  const res = (results.data ?? []) as Result[];
  const draft = a.status === 'draft';
  const listingFee = Number(priv?.listing_fee_kes ?? settings?.listing_fee_kes ?? 0);
  const lotFee = Number(priv?.lot_fee_kes ?? settings?.lot_fee_kes ?? 0);
  const successPct = a.success_fee_pct ?? priv?.success_fee_pct ?? settings?.success_fee_pct ?? null;
  const [label, cls] = publishLabel(a);

  return (
    <>
      <div className="row between">
        <div className="stack" style={{ gap: 4 }}>
          <Link href="/auctioneer" className="small">← Dashboard</Link>
          <h1 style={{ fontSize: 28 }}>{a.title} <span className={`pill ${cls}`} style={{ verticalAlign: 'middle' }}>{label}</span></h1>
        </div>
        <div className="row">
          {!draft && <Link href={`/auctions/${a.slug}`} className="btn btn-outline">View on site</Link>}
          {draft && <Link href={`/auctioneer/import?auction=${a.id}`} className="btn btn-outline">Bulk import lots</Link>}
          {draft && <Link href={`/auctioneer/lots/new?auction=${a.id}`} className="btn btn-primary">Add lot</Link>}
        </div>
      </div>
      {a.publish_state === 'rejected' && a.publish_note && <div className="alert alert-err"><b>Mnada asked for changes:</b> {a.publish_note}</div>}
      {draft && <PublishPanel auction={a} lotCount={lots.length} listingFee={listingFee} lotFee={lotFee} successPct={successPct} fees={(fees ?? []) as FirmFee[]} />}
      <section className="panel stack">
        <h3>Lots ({lots.length})</h3>
        <div className="scroll-x">
          <table className="data" style={{ minWidth: 760 }}>
            <thead><tr><th>Lot</th><th>Title</th><th>Photos</th><th>Start</th><th>Current</th><th>Bids</th><th>Closes</th><th>Status</th>{!draft && <th>Winner / invoice</th>}<th></th></tr></thead>
            <tbody>
              {lots.map((l) => {
                const r = res.find((x) => x.lot_id === l.id);
                return (
                  <tr key={l.id}>
                    <td>{l.lot_no}<div className="small muted">{lotRef(a.code, l.lot_no)}</div></td>
                    <td style={{ fontWeight: 600 }}>{l.title}</td>
                    <td>{l.photos.length === 0 ? <span className="pill pill-warn">None</span> : l.photos.length}</td>
                    <td>{kes(l.start_bid)}</td>
                    <td>{l.bid_count ? kes(l.current_bid) : '—'}</td>
                    <td>{l.bid_count}</td>
                    <td className="small">{eat(l.closes_at)}</td>
                    <td><span className={`pill ${l.status === 'open' ? 'pill-green' : 'pill-grey'}`}>{l.status}</span>{l.has_reserve && <div className="small muted">{l.reserve_met ? 'reserve met' : 'reserve not met'}</div>}</td>
                    {!draft && <td className="small">{r?.winner_name ? <>{r.winner_name}<br /><a href={`tel:${r.winner_phone}`}>{r.winner_phone}</a><br />{r.invoice_no ? `Inv ${r.invoice_no} · ${r.invoice_status} · KES ${kes(r.invoice_total)}` : ''}</> : '—'}</td>}
                    <td><Link href={`/auctioneer/lots/${l.id}`} className="btn btn-outline btn-sm">Edit</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {lots.length === 0 && <p className="muted small">No lots yet — add them one by one or import a spreadsheet.</p>}
      </section>
      <section className="panel stack">
        <h3>Auction settings</h3>
        <AuctionForm auction={a} mode="auctioneer" auctioneerId={firm.id} basePath="/auctioneer" />
      </section>
    </>
  );
}
