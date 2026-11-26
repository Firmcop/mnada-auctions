import Link from 'next/link';
import { getSession, getWatchedIds } from '@/lib/supabase/server';
import ListingCard from '@/components/ListingCard';
import { Suspense } from 'react';
import { CATEGORY_NAMES, CATEGORY_TREE, searchHref } from '@/lib/categories';
import LotBrowser, { type BrowserLot } from '@/components/LotBrowser';
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

  // all open lots: the sidebar filters (category, type, price, search) work on these in the browser
  const lotQuery = supabase.from('auction_lots').select('*, auction_auctions!inner(status, title, slug)')
    .eq('auction_auctions.status', 'live').eq('status', 'open').order('closes_at').limit(1000);
  let listQuery = supabase.from('auction_listings').select('*').in('status', ['active', 'reserved']).order('featured', { ascending: false }).limit(30);
  if (cat) listQuery = listQuery.in('category', cat.split(','));
  if (sub) listQuery = listQuery.in('subcategory', sub.split(','));
  if (term) listQuery = listQuery.or(`title.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%,subcategory.ilike.%${term}%`);
  const [{ data: lotData }, { data: listData }] = await Promise.all([lotQuery, listQuery]);
  const lots = (lotData ?? []) as BrowserLot[];
  const listings = (listData ?? []) as Listing[];
  const oneCat = cat && !cat.includes(',') ? cat : undefined;
  const oneSub = sub && !sub.includes(',') ? sub : undefined;

  return (
    <div className="wrap section">
      <nav aria-label="Breadcrumb" className="small muted row" style={{ gap: 8, marginBottom: 10 }}>
        <Link href="/" style={{ color: 'var(--muted)' }}>Home</Link><span>/</span>
        <Link href="/search" style={{ color: 'var(--muted)' }}>All categories</Link>
        {oneCat && <><span>/</span><Link href={searchHref(oneCat)} style={{ color: oneSub ? 'var(--muted)' : 'var(--ink)' }}>{oneCat}</Link></>}
        {oneCat && oneSub && <><span>/</span><span style={{ color: 'var(--ink)' }}>{oneSub}</span></>}
      </nav>
      <h1 style={{ marginBottom: 6 }}>{oneSub ?? oneCat ?? (q ? `Results for “${q}”` : 'All open lots')}</h1>
      {oneCat && !q && <p style={{ color: 'var(--body)', maxWidth: 760, marginBottom: 8 }}>{categorySeo(oneCat, oneSub).description}</p>}
      <Suspense>
        <LotBrowser lots={lots} watched={Array.from(watched)} signedIn={!!user} categoryOrder={CATEGORY_NAMES}
          subsFor={Object.fromEntries(CATEGORY_TREE.map((c) => [c.name, c.subs]))} showAuction placeholder="Search all open lots…" />
      </Suspense>

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
