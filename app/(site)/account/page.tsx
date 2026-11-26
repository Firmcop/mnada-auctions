import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import Countdown from '@/components/Countdown';
import DocUpload from './DocUpload';
import { eat, kes, type Lot } from '@/lib/format';

export const dynamic = 'force-dynamic';

const STATUS_TEXT: Record<string, [string, string]> = {
  pending: ['Awaiting approval', 'pill-warn'],
  approved: ['Approved to bid', 'pill-green'],
  rejected: ['Not approved', 'pill-warn'],
  info_requested: ['More information needed', 'pill-warn'],
};

export default async function AccountPage() {
  const { supabase, user, profile } = await getSession();
  if (!user) redirect('/login?next=/account');

  const { data: bids } = await supabase.from('auction_bids').select('lot_id').eq('user_id', user.id);
  const lotIds = Array.from(new Set((bids ?? []).map((b) => b.lot_id)));
  const { data: lotsData } = lotIds.length
    ? await supabase.from('auction_lots').select('*').in('id', lotIds).order('closes_at')
    : { data: [] as Lot[] };
  const lots = (lotsData ?? []) as Lot[];
  const active = lots.filter((l) => l.status === 'open');
  const { data: maxes } = await supabase.from('auction_max_bids').select('lot_id, max_amount').eq('user_id', user.id);
  const maxFor = (id: string) => (maxes ?? []).find((m) => m.lot_id === id)?.max_amount as number | undefined;
  const { data: invoices } = await supabase.from('auction_invoices').select('*, auction_lots(title, lot_no)').eq('user_id', user.id).order('created_at', { ascending: false });
  const lost = lots.filter((l) => l.status !== 'open' && l.leader_id !== user.id);

  const [statusText, statusClass] = STATUS_TEXT[profile?.status ?? 'pending'];

  return (
    <div className="wrap section stack" style={{ gap: 28 }}>
      <div className="row between">
        <div className="stack" style={{ gap: 4 }}>
          <h1>My bids</h1>
          {profile && <span className="muted">{profile.full_name} · Bidder {profile.bidder_no}</span>}
        </div>
        {profile && <span className={`pill ${statusClass}`} style={{ fontSize: 14, padding: '8px 12px' }}>{statusText}</span>}
      </div>
      {profile && (
        <nav className="row small" aria-label="Account" style={{ gap: 8 }}>
          <Link href="/account/alerts" className="btn btn-outline btn-sm">Alerts</Link>
          <Link href="/watchlist" className="btn btn-outline btn-sm">Watchlist</Link>
          <Link href={profile.seller_status === 'approved' ? '/seller' : '/account/seller'} className="btn btn-outline btn-sm">{profile.seller_status === 'approved' ? 'Seller portal' : 'Sell on Mnada'}</Link>
          <Link href="/account/listing-help" className="btn btn-outline btn-sm">Listing Help</Link>
          <Link href="/account/storage" className="btn btn-outline btn-sm">Storage</Link>
          <Link href="/account/auctioneer" className="btn btn-outline btn-sm">Auctioneer firm</Link>
          <Link href="/account/ai" className="btn btn-outline btn-sm">AI tools</Link>
        </nav>
      )}

      {!profile && (
        <div className="alert alert-info">This login isn&apos;t registered for bidding. <Link href="/register">Register to bid</Link> with a different email.</div>
      )}
      {profile && profile.status !== 'approved' && (
        <section className="panel card stack" style={{ gap: 12 }}>
          <h2 style={{ fontSize: 22 }}>{profile.doc_path ? 'Documents received' : 'Upload your documents'}</h2>
          <p style={{ color: 'var(--body)' }}>
            {profile.status === 'rejected'
              ? 'Your registration was not approved. Contact us if you think this is a mistake.'
              : profile.doc_path
                ? 'Thanks — we’re checking your documents, usually within one working hour. You can replace the file below if needed.'
                : profile.account_type === 'company'
                  ? 'Upload your certificate of incorporation (photo or PDF) so we can approve you for bidding.'
                  : 'Upload a clear photo of your National ID (front) or passport photo page so we can approve you for bidding.'}
          </p>
          {profile.status !== 'rejected' && <DocUpload userId={user.id} hasDoc={!!profile.doc_path} />}
        </section>
      )}

      <section className="stack">
        <h2 style={{ fontSize: 24 }}>Active bids ({active.length})</h2>
        {active.length === 0 && <p className="muted">You have no active bids. <Link href="/#auctions">Browse live auctions</Link></p>}
        <div style={{ borderTop: active.length ? '1px solid var(--line)' : 0 }}>
          {active.map((l) => {
            const lead = l.leader_id === user.id;
            const mx = maxFor(l.id);
            return (
              <div key={l.id} className="list-row">
                <Link href={`/lots/${l.id}`} className="stack" style={{ flex: '1 1 280px', gap: 4, textDecoration: 'none', color: 'inherit' }}>
                  <span className="eyebrow">Lot {l.lot_no}</span>
                  <span style={{ fontWeight: 600 }}>{l.title}</span>
                </Link>
                <div className="stack" style={{ gap: 2, minWidth: 160 }}>
                  <span className="small muted">Current{mx ? ' · your max' : ''}</span>
                  <b>KES {kes(l.current_bid)}</b>
                  {mx && <span className="small muted">KES {kes(mx)}</span>}
                </div>
                <Countdown closesAt={l.closes_at} />
                <span className={`pill ${lead ? 'pill-green' : 'pill-warn'}`}>{lead ? 'Highest bidder' : 'Outbid'}</span>
                <Link href={`/lots/${l.id}`} className={`btn ${lead ? 'btn-outline' : 'btn-primary'}`}>{lead ? 'View lot' : 'Raise bid'}</Link>
              </div>
            );
          })}
        </div>
      </section>

      <section className="stack">
        <h2 style={{ fontSize: 24 }}>Won lots &amp; invoices</h2>
        {(invoices ?? []).length === 0 && <p className="muted">Nothing won yet.</p>}
        <div style={{ borderTop: (invoices ?? []).length ? '1px solid var(--line)' : 0 }}>
          {(invoices ?? []).map((inv) => (
            <div key={inv.id} className="list-row">
              <div className="stack" style={{ flex: '1 1 280px', gap: 4 }}>
                <span className="eyebrow">Invoice INV-{inv.invoice_no} · Lot {inv.auction_lots?.lot_no}</span>
                <span style={{ fontWeight: 600 }}>{inv.auction_lots?.title}</span>
              </div>
              <div className="stack" style={{ gap: 2, minWidth: 170 }}>
                <span className="small muted">Total due (incl. premium &amp; VAT)</span>
                <b>KES {kes(inv.total)}</b>
                {Number(inv.paid) > 0 && inv.status !== 'paid' && inv.status !== 'collected' && <span className="small muted">Paid KES {kes(inv.paid)}</span>}
              </div>
              <span className={`pill ${inv.status === 'paid' || inv.status === 'collected' ? 'pill-green' : 'pill-warn'}`}>
                {inv.status === 'unpaid' ? `Due ${eat(inv.due_at, false)}` : inv.status === 'part' ? 'Part-paid' : inv.status === 'paid' ? 'Paid · ready to collect' : 'Collected'}
              </span>
              <Link href={`/account/invoices/${inv.id}`} className="btn btn-outline">View invoice</Link>
            </div>
          ))}
        </div>
      </section>

      {lost.length > 0 && (
        <section className="stack">
          <h2 style={{ fontSize: 24 }}>Lots you didn&apos;t win</h2>
          {lost.map((l) => (
            <div key={l.id} className="row between small" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <span>Lot {l.lot_no} · {l.title}</span><span>Final: KES {kes(l.current_bid)}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
