import { getSession, getWatchedIds } from '@/lib/supabase/server';
import LotCard from '@/components/LotCard';
import Link from 'next/link';
import { CATEGORIES, type Lot } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string }> }) {
  const { q, cat } = await searchParams;
  const { supabase, user } = await getSession();
  const watched = await getWatchedIds(supabase, user?.id);
  let query = supabase.from('auction_lots').select('*, auction_auctions!inner(status)')
    .eq('auction_auctions.status', 'live').eq('status', 'open').order('closes_at').limit(60);
  if (cat) query = query.eq('category', cat);
  if (q) {
    const term = q.replace(/[%,()]/g, ' ').trim();
    if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`);
  }
  const { data } = await query;
  const lots = (data ?? []) as Lot[];
  return (
    <div className="wrap section">
      <h1 style={{ marginBottom: 6 }}>{cat ? cat : q ? `Results for “${q}”` : 'All open lots'}</h1>
      <p className="muted" style={{ marginBottom: 16 }}>{lots.length} open lots</p>
      <nav aria-label="Filter by category" className="row" style={{ gap: 8, marginBottom: 24 }}>
        <Link href={q ? `/search?q=${encodeURIComponent(q)}` : '/search'} className={`btn btn-sm ${!cat ? 'btn-dark' : 'btn-outline'}`}>All</Link>
        {CATEGORIES.filter((c) => c !== 'Other').map((c) => (
          <Link key={c} href={`/search?cat=${encodeURIComponent(c)}${q ? `&q=${encodeURIComponent(q)}` : ''}`} className={`btn btn-sm ${cat === c ? 'btn-dark' : 'btn-outline'}`}>{c}</Link>
        ))}
      </nav>
      {lots.length ? (
        <div className="lot-grid">{lots.map((l) => <LotCard key={l.id} lot={l} watched={watched.has(l.id)} signedIn={!!user} />)}</div>
      ) : (
        <p>No open lots match. Try another word, or check back — new auctions are added every week.</p>
      )}
    </div>
  );
}
