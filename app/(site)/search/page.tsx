import { createClient } from '@/lib/supabase/server';
import LotCard from '@/components/LotCard';
import type { Lot } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string }> }) {
  const { q, cat } = await searchParams;
  const supabase = await createClient();
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
      <p className="muted" style={{ marginBottom: 24 }}>{lots.length} open lots</p>
      {lots.length ? (
        <div className="lot-grid">{lots.map((l) => <LotCard key={l.id} lot={l} />)}</div>
      ) : (
        <p>No open lots match. Try another word, or check back — new auctions are added every week.</p>
      )}
    </div>
  );
}
