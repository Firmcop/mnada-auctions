import Link from 'next/link';
import { getSession, getWatchedIds } from '@/lib/supabase/server';
import LotCard from '@/components/LotCard';
import ListingCard from '@/components/ListingCard';
import { CATEGORY_TREE, searchHref, subsOf } from '@/lib/categories';
import type { Metadata } from 'next';
import type { Listing, Lot } from '@/lib/format';
import { categorySeo } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string; sub?: string }> }): Promise<Metadata> {
  const { q, cat, sub } = await searchParams;
  const seo = categorySeo(cat, sub);
  const canonical = cat ? `/search?cat=${encodeURIComponent(cat)}${sub ? `&sub=${encodeURIComponent(sub)}` : ''}` : '/search';
  return { title: q && !cat ? `Search: ${q}` : seo.title, description: seo.description, alternates: { canonical }, robots: q ? { index: false, follow: true } : undefined };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string; sub?: string }> }) {
  const { q, cat, sub } = await searchParams;
  const { supabase, user } = await getSession();
  const watched = await getWatchedIds(supabase, user?.id);
  const term = (q ?? '').replace(/[%,()]/g, ' ').trim();

  let lotQuery = supabase.from('auction_lots').select('*, auction_auctions!inner(status)')
    .eq('auction_auctions.status', 'live').eq('status', 'open').order('closes_at').limit(60);
  let listQuery = supabase.from('auction_listings').select('*').in('status', ['active', 'reserved']).order('featured', { ascending: false }).limit(30);
  if (cat) { lotQuery = lotQuery.eq('category', cat); listQuery = listQuery.eq('category', cat); }
  if (sub) { lotQuery = lotQuery.eq('subcategory', sub); listQuery = listQuery.eq('subcategory', sub); }
  if (term) {
    const or = `title.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%,subcategory.ilike.%${term}%`;
    lotQuery = lotQuery.or(or);
    listQuery = listQuery.or(or);
  }
  const [{ data: lotData }, { data: listData }] = await Promise.all([lotQuery, listQuery]);
  const lots = (lotData ?? []) as Lot[];
  const listings = (listData ?? []) as Listing[];
  const subs = subsOf(cat);
  const withQ = (href: string) => (q ? `${href}${href.includes('?') ? '&' : '?'}q=${encodeURIComponent(q)}` : href);

  return (
    <div className="wrap section">
      <nav aria-label="Breadcrumb" className="small muted row" style={{ gap: 8, marginBottom: 10 }}>
        <Link href="/" style={{ color: 'var(--muted)' }}>Home</Link><span>/</span>
        <Link href="/search" style={{ color: 'var(--muted)' }}>All categories</Link>
        {cat && <><span>/</span><Link href={searchHref(cat)} style={{ color: sub ? 'var(--muted)' : 'var(--ink)' }}>{cat}</Link></>}
        {sub && <><span>/</span><span style={{ color: 'var(--ink)' }}>{sub}</span></>}
      </nav>
      <h1 style={{ marginBottom: 6 }}>{sub ?? cat ?? (q ? `Results for “${q}”` : 'All open lots')}</h1>
      {(cat || sub) && !q && <p style={{ color: 'var(--body)', maxWidth: 760, marginBottom: 8 }}>{categorySeo(cat, sub).description}</p>}
      <p className="muted" style={{ marginBottom: 16 }}>{lots.length} auction lots{listings.length ? ` · ${listings.length} for direct sale` : ''}{q && (cat || sub) ? ` matching “${q}”` : ''}</p>

      <nav aria-label="Filter by category" className="row" style={{ gap: 8, marginBottom: subs.length ? 10 : 24 }}>
        <Link href={withQ('/search')} className={`btn btn-sm ${!cat ? 'btn-dark' : 'btn-outline'}`}>All</Link>
        {CATEGORY_TREE.map((c) => (
          <Link key={c.name} href={withQ(searchHref(c.name))} className={`btn btn-sm ${cat === c.name ? 'btn-dark' : 'btn-outline'}`}>{c.short}</Link>
        ))}
      </nav>
      {subs.length > 0 && (
        <nav aria-label="Filter by type" className="row small" style={{ gap: '6px 16px', marginBottom: 24 }}>
          <Link href={withQ(searchHref(cat))} style={{ fontWeight: !sub ? 700 : 400 }}>All {cat}</Link>
          {subs.map((s) => <Link key={s} href={withQ(searchHref(cat, s))} style={{ fontWeight: sub === s ? 700 : 400 }}>{s}</Link>)}
        </nav>
      )}

      {lots.length > 0 ? (
        <div className="lot-grid">{lots.map((l) => <LotCard key={l.id} lot={l} watched={watched.has(l.id)} signedIn={!!user} />)}</div>
      ) : (
        <p>No open auction lots match{listings.length ? ' — see direct-sale items below.' : '. Try another word, or check back — new auctions are added every week.'}</p>
      )}

      {listings.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <div className="row between" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 26 }}>Buy now — direct sale</h2>
            <Link href="/direct-sale">All direct-sale items</Link>
          </div>
          <div className="lot-grid">{listings.map((l) => <ListingCard key={l.id} listing={l} />)}</div>
        </section>
      )}
    </div>
  );
}
