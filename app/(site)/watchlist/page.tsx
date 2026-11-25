import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import LotCard from '@/components/LotCard';
import type { Lot } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Watchlist' };

export default async function WatchlistPage() {
  const { supabase, user } = await getSession();
  if (!user) redirect('/login?next=/watchlist');
  const { data: watch } = await supabase.from('auction_watch').select('lot_id').eq('user_id', user.id);
  const ids = (watch ?? []).map((w) => w.lot_id);
  const { data } = ids.length ? await supabase.from('auction_lots').select('*').in('id', ids).order('closes_at') : { data: [] };
  const lots = (data ?? []) as Lot[];
  const open = lots.filter((l) => l.status === 'open');
  const ended = lots.filter((l) => l.status !== 'open');

  return (
    <div className="wrap section stack" style={{ gap: 24 }}>
      <div className="stack" style={{ gap: 6 }}>
        <h1>Watchlist</h1>
        <p className="muted">We alert you one hour before each watched lot closes. See your <Link href="/account/alerts">alerts</Link>.</p>
      </div>
      {open.length === 0 && ended.length === 0 && (
        <p>You aren&apos;t watching any lots yet. Tap the heart on a lot to add it. <Link href="/#auctions">Browse live auctions</Link></p>
      )}
      {open.length > 0 && <div className="lot-grid">{open.map((l) => <LotCard key={l.id} lot={l} watched signedIn />)}</div>}
      {ended.length > 0 && (
        <section className="stack">
          <h2 style={{ fontSize: 22 }}>Ended</h2>
          <div className="lot-grid">{ended.map((l) => <LotCard key={l.id} lot={l} watched signedIn />)}</div>
        </section>
      )}
    </div>
  );
}
