import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import ListingCard from '@/components/ListingCard';
import type { Listing } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Direct sale — buy now' };

export default async function DirectSalePage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from('auction_listings').select('*').in('status', ['active', 'reserved', 'sold'])
    .order('featured', { ascending: false }).order('created_at', { ascending: false });
  const all = (data ?? []) as Listing[];
  const cats = Array.from(new Set(all.map((l) => l.category)));
  const list = cat ? all.filter((l) => l.category === cat) : all;
  const available = list.filter((l) => l.status !== 'sold');
  const sold = list.filter((l) => l.status === 'sold');

  return (
    <>
      <section style={{ background: 'var(--navy)', color: '#fff' }}>
        <div className="wrap stack" style={{ padding: '44px 24px', gap: 12 }}>
          <span className="eyebrow" style={{ color: '#F5A27A' }}>Direct sale · no auction, no waiting</span>
          <h1 style={{ color: '#fff' }}>Buy now: container houses, A-frames &amp; steel structures</h1>
          <p style={{ color: '#C9D5DF', fontSize: 17, maxWidth: 720 }}>
            Ready-built and made-to-order units from our own yard. Ask for a quote, make an offer, or reserve one today — we can deliver and install anywhere in Kenya.
          </p>
        </div>
      </section>
      <div className="wrap section">
        <nav aria-label="Filter by category" className="row" style={{ gap: 8, marginBottom: 24 }}>
          <Link href="/direct-sale" className={`btn btn-sm ${!cat ? 'btn-dark' : 'btn-outline'}`}>All ({all.filter((l) => l.status !== 'sold').length})</Link>
          {cats.map((c) => (
            <Link key={c} href={`/direct-sale?cat=${encodeURIComponent(c)}`} className={`btn btn-sm ${cat === c ? 'btn-dark' : 'btn-outline'}`}>{c}</Link>
          ))}
        </nav>
        {available.length ? (
          <div className="lot-grid">{available.map((l) => <ListingCard key={l.id} listing={l} />)}</div>
        ) : (
          <p>Nothing listed here right now. <Link href="/sell">Tell us what you need</Link> and we&apos;ll quote.</p>
        )}
        {sold.length > 0 && (
          <section style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 24, marginBottom: 16 }}>Recently sold</h2>
            <div className="lot-grid">{sold.map((l) => <ListingCard key={l.id} listing={l} />)}</div>
          </section>
        )}
      </div>
    </>
  );
}
