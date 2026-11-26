import Link from 'next/link';
import { createClient, getSession } from '@/lib/supabase/server';
import { areaFor, canArea, type StaffRole } from '@/lib/staff';
import { eat, kes } from '@/lib/format';

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;
  const { profile } = await getSession();
  const role = (profile?.admin_role ?? 'owner') as StaffRole;
  const supabase = await createClient();
  const since = new Date(Date.now() - 86400000).toISOString();
  const [auctions, openLots, bidsToday, pending, unpaid, vals, recent] = await Promise.all([
    supabase.from('auction_auctions').select('id, title, slug, status, location, first_close_at').neq('status', 'closed').order('first_close_at'),
    supabase.from('auction_lots').select('id, auction_id, bid_count, current_bid').eq('status', 'open'),
    supabase.from('auction_bids').select('id', { count: 'exact', head: true }).gte('created_at', since),
    supabase.from('auction_profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('auction_invoices').select('total, paid').in('status', ['unpaid', 'part']),
    supabase.from('auction_valuations').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    supabase.from('auction_bids').select('amount, created_at, is_auto, auction_lots(lot_no, title)').order('created_at', { ascending: false }).limit(8),
  ]);
  const [{ count: newEnquiries }, { count: sellerApps }, { count: listingReviews }, { count: consignments }, { count: aiPayments }, { count: helpJobs }, { count: firmApps }, { count: firmReviews }, { count: firmFees }, { count: toBatch }, { count: toPay }, { count: storageReq }] = await Promise.all([
    supabase.from('auction_enquiries').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('auction_profiles').select('id', { count: 'exact', head: true }).eq('seller_status', 'pending'),
    supabase.from('auction_listings').select('id', { count: 'exact', head: true }).eq('review_status', 'pending'),
    supabase.from('auction_consignments').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
    supabase.from('auction_ai_payments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('auction_help_requests').select('id', { count: 'exact', head: true }).in('status', ['requested', 'accepted']),
    supabase.from('auction_auctioneers').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('auction_auctions').select('id', { count: 'exact', head: true }).eq('publish_state', 'awaiting_review'),
    supabase.from('auction_auctioneer_fees').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('auction_settlements').select('id', { count: 'exact', head: true }).eq('status', 'released').is('payout_id', null),
    supabase.from('auction_payouts').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('auction_storage_bookings').select('id', { count: 'exact', head: true }).in('status', ['requested', 'accepted']),
  ]);
  const todo: [number, string, string][] = ([
    [sellerApps ?? 0, 'seller applications', '/admin/sellers'],
    [listingReviews ?? 0, 'seller listings to review', '/admin/listings'],
    [consignments ?? 0, 'items sent for auction', '/admin/consignments'],
    [aiPayments ?? 0, 'AI payments to confirm', '/admin/ai'],
    [helpJobs ?? 0, 'Listing Help jobs to quote or schedule', '/admin/help'],
    [firmApps ?? 0, 'auctioneer applications', '/admin/auctioneers'],
    [firmReviews ?? 0, 'auctioneer auctions to approve', '/admin/auctioneers'],
    [firmFees ?? 0, 'auctioneer listing fees to confirm', '/admin/auctioneers'],
    [(toBatch ?? 0) + (toPay ?? 0), 'seller/auctioneer payouts to make', '/admin/payouts'],
    [storageReq ?? 0, 'storage requests to quote or start', '/admin/storage'],
  ] as [number, string, string][]).filter(([n, , href]) => n > 0 && canArea(role, areaFor(href)));
  const lots = openLots.data ?? [];
  const owed = (unpaid.data ?? []).reduce((s, i) => s + Number(i.total) - Number(i.paid), 0);

  return (
    <>
      <div className="row between">
        <div className="stack" style={{ gap: 4 }}>
          <h1 style={{ fontSize: 28 }}>Dashboard</h1>
          <span className="small muted">{eat(new Date())}</span>
        </div>
        {canArea(role, 'catalogue') && <Link href="/admin/auctions" className="btn btn-primary">Add auction or lot</Link>}
      </div>
      {denied && <div className="alert alert-err">Your staff role doesn&apos;t include that page. Ask an owner if you need access.</div>}
      {todo.length > 0 && (
        <div className="alert alert-info row" style={{ gap: '6px 18px' }}>
          <b>To do:</b>
          {todo.map(([n, label, href]) => <Link key={label} href={href}>{n} {label}</Link>)}
        </div>
      )}
      <div className="kpis">
        <div className="kpi"><span className="eyebrow">Lots open</span><b>{lots.length}</b></div>
        <div className="kpi"><span className="eyebrow">Bids, last 24 h</span><b>{bidsToday.count ?? 0}</b></div>
        <Link href="/admin/bidders" className="kpi" style={{ textDecoration: 'none' }}><span className="eyebrow">Bidders to approve</span><b style={{ color: (pending.count ?? 0) > 0 ? 'var(--accent-text)' : undefined }}>{pending.count ?? 0}</b></Link>
        <Link href="/admin/invoices" className="kpi" style={{ textDecoration: 'none' }}><span className="eyebrow">Outstanding</span><b>KES {kes(owed)}</b><span className="small muted">{(unpaid.data ?? []).length} invoices</span></Link>
        <Link href="/admin/enquiries" className="kpi" style={{ textDecoration: 'none' }}><span className="eyebrow">New enquiries &amp; offers</span><b style={{ color: (newEnquiries ?? 0) > 0 ? 'var(--accent-text)' : undefined }}>{newEnquiries ?? 0}</b></Link>
        <Link href="/admin/valuations" className="kpi" style={{ textDecoration: 'none' }}><span className="eyebrow">Valuation requests (7 days)</span><b>{vals.count ?? 0}</b></Link>
      </div>
      <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
        <section className="panel" style={{ flex: '2 1 480px', minWidth: 0 }}>
          <h3 style={{ marginBottom: 10 }}>Live &amp; upcoming auctions</h3>
          <div className="scroll-x">
            <table className="data" style={{ minWidth: 560 }}>
              <thead><tr><th>Auction</th><th>Status</th><th>Open lots</th><th>With bids</th><th style={{ textAlign: 'right' }}>Bids total (KES)</th></tr></thead>
              <tbody>
                {(auctions.data ?? []).map((a) => {
                  const al = lots.filter((l) => l.auction_id === a.id);
                  const withBids = al.filter((l) => l.bid_count > 0);
                  return (
                    <tr key={a.id}>
                      <td><Link href={`/admin/auctions/${a.id}`} style={{ fontWeight: 600 }}>{a.title}</Link><div className="small muted">{a.location}{a.first_close_at ? ` · closes from ${eat(a.first_close_at)}` : ''}</div></td>
                      <td><span className={`pill ${a.status === 'live' ? 'pill-green' : 'pill-grey'}`}>{a.status === 'live' ? 'Live' : 'Draft'}</span></td>
                      <td>{al.length}</td>
                      <td>{withBids.length}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{kes(withBids.reduce((s, l) => s + Number(l.current_bid), 0))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel" style={{ flex: '1 1 300px', minWidth: 0 }}>
          <h3 style={{ marginBottom: 10 }}>Latest bids</h3>
          {(recent.data ?? []).length === 0 && <p className="small muted">No bids yet.</p>}
          {(recent.data ?? []).map((b, i) => {
            const lot = b.auction_lots as unknown as { lot_no: number; title: string } | null;
            return (
              <div key={i} className="small" style={{ padding: '8px 0', borderBottom: '1px solid #F0F2F4' }}>
                <b>KES {kes(b.amount)}</b>{b.is_auto ? ' (auto)' : ''} on Lot {lot?.lot_no} · {lot?.title}
                <div className="muted">{new Date(b.created_at).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            );
          })}
        </section>
      </div>
    </>
  );
}
