import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Countdown from '@/components/Countdown';
import { Photo } from '@/components/LotCard';
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

export default async function AuctionPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cat?: string; sort?: string }>;
}) {
  const { slug } = await params;
  const { cat, sort } = await searchParams;
  const supabase = await createClient();
  const { data: auction } = await supabase.from('auction_auctions').select('*').eq('slug', slug).maybeSingle();
  if (!auction) notFound();
  const a = auction as Auction;
  const { data } = await supabase.from('auction_lots').select('*').eq('auction_id', a.id).order('lot_no');
  const all = (data ?? []) as Lot[];
  const cats = Array.from(new Set(all.map((l) => l.category).filter(Boolean))) as string[];
  let lots = cat ? all.filter((l) => l.category === cat) : all;
  if (sort === 'bids') lots = [...lots].sort((x, y) => y.bid_count - x.bid_count);
  if (sort === 'price') lots = [...lots].sort((x, y) => Number(x.current_bid ?? x.start_bid) - Number(y.current_bid ?? y.start_bid));
  if (sort === 'closing') lots = [...lots].sort((x, y) => x.closes_at.localeCompare(y.closes_at));
  const q = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { cat, sort, ...o };
    Object.entries(merged).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return s ? `?${s}` : '';
  };

  return (
    <div className="wrap" style={{ padding: '20px 24px 40px' }}>
      <nav aria-label="Breadcrumb" className="small muted row" style={{ gap: 8 }}>
        <Link href="/" style={{ color: 'var(--muted)' }}>Home</Link><span>/</span><span style={{ color: 'var(--ink)' }}>{a.title}</span>
      </nav>

      <section className="row" style={{ marginTop: 16, gap: 28, alignItems: 'stretch' }}>
        <div className="stack" style={{ flex: '2 1 520px', gap: 12 }}>
          <span className={`pill ${a.status === 'live' ? 'pill-green' : 'pill-grey'}`} style={{ alignSelf: 'flex-start' }}>
            {a.status === 'live' ? 'OPEN FOR BIDDING' : 'CLOSED'}
          </span>
          <h1>{a.title}</h1>
          {a.description && <p style={{ color: 'var(--body)', maxWidth: 720 }}>{a.description}</p>}
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

      <section className="row" style={{ marginTop: 32, gap: 28, alignItems: 'flex-start' }}>
        <aside aria-label="Filters" className="stack" style={{ flex: '1 1 220px', gap: 6 }}>
          <span style={{ fontWeight: 700, marginBottom: 6 }}>Category</span>
          <Link href={q({ cat: undefined })} style={{ fontWeight: !cat ? 700 : 400, textDecoration: 'none', padding: '6px 0' }}>All lots ({all.length})</Link>
          {cats.map((c) => (
            <Link key={c} href={q({ cat: c })} style={{ fontWeight: cat === c ? 700 : 400, textDecoration: 'none', padding: '6px 0' }}>
              {c} ({all.filter((l) => l.category === c).length})
            </Link>
          ))}
        </aside>
        <div className="stack" style={{ flex: '999 1 560px', minWidth: 0 }}>
          <div className="row between">
            <span><b>{lots.length} lots</b>{cat && <span className="muted"> in {cat}</span>}</span>
            <span className="row small" style={{ gap: 8 }}>
              Sort:
              <Link href={q({ sort: undefined })} style={{ fontWeight: !sort ? 700 : 400 }}>Lot number</Link>
              <Link href={q({ sort: 'closing' })} style={{ fontWeight: sort === 'closing' ? 700 : 400 }}>Closing time</Link>
              <Link href={q({ sort: 'bids' })} style={{ fontWeight: sort === 'bids' ? 700 : 400 }}>Most bids</Link>
              <Link href={q({ sort: 'price' })} style={{ fontWeight: sort === 'price' ? 700 : 400 }}>Price</Link>
            </span>
          </div>
          <div style={{ borderTop: '1px solid var(--line)' }}>
            {lots.map((l) => (
              <div key={l.id} className="list-row">
                <div style={{ width: 140, flex: 'none', borderRadius: 8, overflow: 'hidden' }}><Photo src={l.photos?.[0]} label={l.title} height={100} /></div>
                <Link href={`/lots/${l.id}`} className="stack" style={{ flex: '1 1 260px', gap: 4, textDecoration: 'none', color: 'inherit' }}>
                  <span className="eyebrow">Lot {l.lot_no}</span>
                  <span style={{ fontWeight: 600, fontSize: 16 }}>{l.title}</span>
                  {l.category && <span className="small muted">{l.category}</span>}
                </Link>
                <div className="stack" style={{ gap: 2, minWidth: 160 }}>
                  <span className="small muted">{l.bid_count > 0 ? `${l.bid_count} bids` : 'Starting bid'}</span>
                  <span className="price">KES {kes(l.bid_count > 0 ? l.current_bid : l.start_bid)}</span>
                  {l.status === 'open' ? <Countdown closesAt={l.closes_at} /> : <span className="pill pill-grey" style={{ alignSelf: 'flex-start' }}>{l.status === 'sold' ? 'Sold' : 'Closed'}</span>}
                </div>
                <Link href={`/lots/${l.id}`} className="btn btn-primary">{l.status === 'open' ? 'Bid' : 'View'}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>
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
