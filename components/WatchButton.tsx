'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function WatchButton({ lotId, initialWatched, initialCount, signedIn, variant = 'icon' }: {
  lotId: string;
  initialWatched: boolean;
  initialCount: number;
  signedIn: boolean;
  variant?: 'icon' | 'full';
}) {
  const router = useRouter();
  const [watched, setWatched] = useState(initialWatched);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!signedIn) { router.push(`/login?next=/lots/${lotId}`); return; }
    setBusy(true);
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) { setBusy(false); router.push(`/login?next=/lots/${lotId}`); return; }
    if (watched) {
      const { error } = await supabase.from('auction_watch').delete().eq('lot_id', lotId).eq('user_id', data.user.id);
      if (!error) { setWatched(false); setCount((c) => Math.max(0, c - 1)); }
    } else {
      const { error } = await supabase.from('auction_watch').insert({ lot_id: lotId, user_id: data.user.id });
      if (!error) { setWatched(true); setCount((c) => c + 1); }
    }
    setBusy(false);
  }

  const heart = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={watched ? 'var(--accent)' : 'none'} stroke={watched ? 'var(--accent)' : 'currentColor'} strokeWidth="2" aria-hidden="true">
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </svg>
  );

  if (variant === 'full') {
    return (
      <button type="button" onClick={toggle} disabled={busy} aria-pressed={watched} className="btn btn-outline" style={{ gap: 8 }}>
        {heart}{watched ? 'Watching' : 'Watch this lot'}{count > 0 && <span className="muted small">· {count}</span>}
      </button>
    );
  }
  return (
    <button type="button" onClick={toggle} disabled={busy} aria-pressed={watched}
      aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
      style={{ position: 'absolute', top: 10, right: 10, height: 40, minWidth: 40, padding: '0 10px', borderRadius: 20, border: 0, background: '#fff', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--navy)', boxShadow: '0 1px 4px rgba(0,0,0,.15)', fontSize: 13, fontWeight: 600, zIndex: 2 }}>
      {heart}{count > 0 && <span>{count}</span>}
    </button>
  );
}
