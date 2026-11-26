'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { StorageBooking } from '@/lib/storage';

export default function StorageActions({ booking: b }: { booking: StorageBooking }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function update(patch: Partial<StorageBooking>, confirm?: string) {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true); setErr(null);
    const { error } = await createClient().from('auction_storage_bookings').update(patch).eq('id', b.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.refresh();
  }
  return (
    <section className="stack" style={{ gap: 10 }}>
      {b.status === 'quoted' && (
        <div className="panel stack" style={{ gap: 10, border: '2px solid #F2C3A8' }}>
          <b>Accept the storage quote?</b>
          <span className="small">After you accept we agree a delivery date; billing starts the day your items arrive.</span>
          <button type="button" className="btn btn-primary" disabled={busy} style={{ alignSelf: 'flex-start' }} onClick={() => update({ status: 'accepted' })}>Accept quote</button>
        </div>
      )}
      {b.status === 'accepted' && <div className="alert alert-ok">Quote accepted. We&apos;ll call you to agree when to bring the items in.</div>}
      {['requested', 'quoted', 'active', 'accepted'].includes(b.status) && (
        <label className="check"><input type="checkbox" checked={b.viewing_allowed} disabled={busy} onChange={(e) => update({ viewing_allowed: e.target.checked })} />Buyers may view these items at the yard by appointment</label>
      )}
      {['requested', 'quoted', 'accepted'].includes(b.status) && (
        <button type="button" className="btn btn-outline btn-sm" disabled={busy} style={{ alignSelf: 'flex-start' }} onClick={() => update({ status: 'cancelled' }, 'Cancel this storage request?')}>Cancel request</button>
      )}
      {b.status === 'active' && <span className="small muted">To end storage or collect your items, call us — storage is billed until the month the items leave.</span>}
      {err && <div role="alert" className="alert alert-err">{err}</div>}
    </section>
  );
}
