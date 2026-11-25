import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSession, getWatchedIds } from '@/lib/supabase/server';
import WatchButton from '@/components/WatchButton';
import BidPanel from './BidPanel';
import Gallery from './Gallery';
import { CONDITION_TAGS, kes, lotRef, SELLER_TYPES, type Auction, type Lot } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function LotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await getSession();
  const { data } = await supabase.from('auction_lots').select('*, auction_auctions(*)').eq('id', id).maybeSingle();
  if (!data) notFound();
  const { auction_auctions: auction, ...rest } = data as Lot & { auction_auctions: Auction };
  const lot = rest as Lot;
  const watched = await getWatchedIds(supabase, user?.id);
  let myMax: number | null = null;
  if (user) {
    const { data: m } = await supabase.from('auction_max_bids').select('max_amount').eq('lot_id', lot.id).eq('user_id', user.id).maybeSingle();
    myMax = m ? Number(m.max_amount) : null;
  }

  return (
    <div className="wrap" style={{ padding: '20px 24px 40px' }}>
      <nav aria-label="Breadcrumb" className="small muted row" style={{ gap: 8 }}>
        <Link href="/" style={{ color: 'var(--muted)' }}>Home</Link><span>/</span>
        <Link href={`/auctions/${auction.slug}`} style={{ color: 'var(--muted)' }}>{auction.title}</Link><span>/</span>
        <span style={{ color: 'var(--ink)' }}>Lot {lot.lot_no}</span>
      </nav>
      <div className="row" style={{ marginTop: 16, gap: 32, alignItems: 'flex-start' }}>
        <div className="stack" style={{ flex: '999 1 540px', minWidth: 0, gap: 26 }}>
          <div className="stack" style={{ gap: 8 }}>
            <span className="eyebrow">Lot {lot.lot_no}{lot.category ? ` · ${lot.category}` : ''}{lot.location ? ` · ${lot.location}` : ''}</span>
            <h1 style={{ fontSize: 'clamp(26px, 3.4vw, 36px)' }}>{lot.title}</h1>
            <div className="row small" style={{ gap: 8 }}>
              {lot.status === 'open' && <WatchButton variant="full" lotId={lot.id} initialWatched={watched.has(lot.id)} initialCount={lot.watch_count ?? 0} signedIn={!!user} />}
              <span className="pill pill-grey">Ref {lotRef(auction.code, lot.lot_no)}</span>
              <span className="pill pill-grey">{SELLER_TYPES[lot.seller_type] ?? 'Seller'}</span>
              {(lot.condition_tags ?? []).map((t) => (
                <span key={t} className={`pill ${t === 'not_tested' || t === 'buyer_dismantles' ? 'pill-warn' : 'pill-green'}`}>{CONDITION_TAGS[t] ?? t}</span>
              ))}
            </div>
          </div>
          <Gallery photos={lot.photos ?? []} title={lot.title} />
          {lot.specs?.length > 0 && (
            <section className="stack">
              <h3 style={{ fontSize: 22 }}>Specifications</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', columnGap: 24, borderTop: '1px solid var(--line)' }}>
                {lot.specs.map(([k, v], i) => (
                  <div key={i} className="row between" style={{ padding: '11px 0', borderBottom: '1px solid var(--line)' }}>
                    <span className="muted">{k}</span><span style={{ fontWeight: 600, textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
          {lot.description && (
            <section className="stack">
              <h3 style={{ fontSize: 22 }}>Condition notes</h3>
              <p style={{ color: '#2D3540', whiteSpace: 'pre-line' }}>{lot.description}</p>
            </section>
          )}
          {(lot.extra_costs ?? []).length > 0 && (
            <section className="stack">
              <h3 style={{ fontSize: 22 }}>Additional costs</h3>
              <div style={{ borderTop: '1px solid var(--line)' }}>
                {lot.extra_costs.map((e) => (
                  <div key={e.label} className="row between" style={{ padding: '11px 0', borderBottom: '1px solid var(--line)' }}>
                    <span>{e.label} <span className={`pill ${e.mandatory ? 'pill-warn' : 'pill-grey'}`} style={{ marginLeft: 6 }}>{e.mandatory ? 'Mandatory — added to invoice' : 'Optional — on request'}</span></span>
                    <span style={{ fontWeight: 600 }}>KES {kes(e.amount)} + VAT</span>
                  </div>
                ))}
              </div>
            </section>
          )}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {auction.inspection_text && <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 18 }}><b>Inspection</b><p className="small" style={{ marginTop: 6 }}>{auction.inspection_text}</p></div>}
            {auction.collection_text && <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 18 }}><b>Collection</b><p className="small" style={{ marginTop: 6 }}>{auction.collection_text}</p></div>}
            <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 18 }}><b>Fees</b><p className="small" style={{ marginTop: 6 }}>Buyer&apos;s premium {auction.premium_pct}% + 16% VAT on the premium{lot.vat_on_hammer ? ', plus 16% VAT on the hammer price' : ''}. <a href="/help#costs">How costs work</a></p></div>
          </section>
        </div>
        <aside style={{ flex: '1 1 360px', minWidth: 0, position: 'sticky', top: 16 }}>
          <BidPanel
            initialLot={lot}
            auctionLive={auction.status === 'live'}
            premiumPct={Number(auction.premium_pct)}
            userId={user?.id ?? null}
            profileStatus={profile?.status ?? null}
            bidLimit={profile?.bid_limit ?? null}
            initialMyMax={myMax}
          />
        </aside>
      </div>
    </div>
  );
}
