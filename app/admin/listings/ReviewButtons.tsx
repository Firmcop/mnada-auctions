'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ReviewButtons({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function act(approve: boolean) {
    let note: string | null = null;
    if (!approve) { note = window.prompt('What should the seller change?') ?? null; if (note === null) return; }
    setBusy(true);
    await createClient().from('auction_listings').update(approve
      ? { review_status: 'approved', status: 'active', review_note: null }
      : { review_status: 'rejected', review_note: note }).eq('id', id);
    setBusy(false);
    router.refresh();
  }
  return (
    <span className="row" style={{ gap: 6 }}>
      <button type="button" className="btn btn-green btn-sm" disabled={busy} onClick={() => act(true)}>Approve &amp; publish</button>
      <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => act(false)}>Ask for changes</button>
    </span>
  );
}
