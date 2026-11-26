import FirmBadge from '@/components/FirmBadge';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { createClient, getWatchedIds } from '@/lib/supabase/server';
import LotBrowser from '@/components/LotBrowser';
import { CATEGORY_NAMES, CATEGORY_TREE } from '@/lib/categories';
import Countdown from '@/components/Countdown';
import type { Metadata } from 'next';
import { eat, kes, photoUrl, type Auction, type Lot } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: a } = await supabase.from('auction_auctions').select('id, title, description, location, seo_title, seo_description').eq('slug', slug).maybeSingle();
  if (!a) return {};
  const { data: first } = await supabase.from('auction_lots').select('photos').eq('auction_id', a.id).order('lot_no').limit(1).maybeSingle();
  const title = a.seo_title || `${a.title} – online auction${a.location ? `, ${a.location}` : ''}`;
  const description = a.seo_description || (a.description ?? '').slice(0, 155);
  const images = (first?.photos ?? []).slice(0, 1).map((p: string) => ({ url: photoUrl(p) }));
  return { title, description, alternates: { canonical: `/auctions/${slug}` }, openGraph: { title, description, images } };
}

export default async function AuctionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: auction } = await supabase.from('auction_auctions').select('*').eq('slug', slug).maybeSingle();
  if (!auction) notFound();
  const a = auction as Auction;
  const { data: firm } = a.auctioneer_id ? await supabase.from('auction_auctioneers').select('slug, name, licence_no, logo').eq('id', a.auctioneer_id).maybeSingle() : { data: null };
  const { data } = await supabase.from('auction_lots').select('*').eq('auction_id', a.id).order('lot_no');
  const all = (data ?? []) as Lot[];
  const { data: { user } } = await supabase.auth.getUser();
  const watched = await getWatchedIds(supabase, user?.id);

  return (
    <div className="wrap" style={{ padding: '20px 24px 40px' }}>
      <nav aria-label="Breadcrumb" className="small muted row" style={{ gap: 8 }}>
        <Link href="/" style={{ color: 'var(--muted)' }}>Home</Link><span>/</span><Link href="/#auctions" style={{ color: 'var(--muted)' }}>Auctions</Link><span>/</span><span style={{ color: 'var(--ink)' }}>{a.title}</span>
      </nav>

      <section className="row" style={{ marginTop: 16, gap: 28, alignItems: 'stretch' }}>
        <div className="stack" style={{ flex: '2 1 520px', gap: 12 }}>
          <span className={`pill ${a.status === 'live' ? 'pill-green' : 'pill-grey'}`} style={{ alignSelf: 'flex-start' }}>
            {a.status === 'live' ? 'OPEN FOR BIDDING' : 'CLOSED'}
          </span>
          <h1>{a.title}</h1>
          {a.description && <p style={{ color: 'var(--body)', maxWidth: 720 }}>{a.description}</p>}
          {firm && <FirmBadge firm={firm} />}
          {a.terms_text && <details className="small" style={{ maxWidth: 720 }}><summary style={{ cursor: 'pointer', fontWeight: 600 }}>Terms of sale for this auction</summary><p style={{ whiteSpace: 'pre-line', color: 'var(--body)' }}>{a.terms_text}</p></details>}
        </div>
        <aside className="card" style={{ flex: '1 1 320px', padding: 20, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '14px 18px', fontSize: 14 }}>
          {a.first_close_at && <Info k="First lot closes" v={eat(a.first_close_at)} />}
          {a.first_close_at && <div className="stack" style={{ gap: 2 }}><span className="eyebrow">Time left</span>{a.status === 'live' ? <Countdown closesAt={a.first_close_at} icon={false} /> : <b>Closed</b>}</div>}
          {a.location && <Info k="Location" v={a.location} />}
          <Info k="Buyer's premium" v={`${a.premium_pct}% + VAT`} />
          {a.inspection_text && <Info k="Inspection" v={a.inspection_text} />}
          {a.collection_text && <Info k="Collection" v={a.collection_text} />}
          <p className="small" style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--line)', paddingTop: 10, color: 'var(--body)' }}>
            Lots close one per minute. A bid in the last 2 minutes extends that lot by 2 minutes.
          </p>
        </aside>
      </section>

      <Suspense>
        <LotBrowser lots={all} watched={Array.from(watched)} signedIn={!!user} categoryOrder={CATEGORY_NAMES} subsFor={Object.fromEntries(CATEGORY_TREE.map((c) => [c.name, c.subs]))} />
      </Suspense>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="stack" style={{ gap: 2 }}>
      <span className="eyebrow">{k}</span>
      <span style={{ fontWeight: 600 }}>{v}</span>
    </div>
  );
}
