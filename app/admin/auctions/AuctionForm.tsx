'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { eatInputToIso, isoToEatInput, slugify } from '@/lib/eat-input';
import type { Auction } from '@/lib/format';

export default function AuctionForm({ auction, mode = 'admin', auctioneerId, basePath = '/admin', defaultTerms }: { auction?: Auction; mode?: 'admin' | 'auctioneer'; auctioneerId?: string; basePath?: string; defaultTerms?: string | null }) {
  const locked = mode === 'auctioneer' && !!auction && auction.status !== 'draft';
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) ?? '').trim();
    const row = {
      title: g('title'),
      description: g('description') || null,
      location: g('location') || null,
      ...(mode === 'admin' ? { status: g('status') as Auction['status'] } : {}),
      first_close_at: locked ? auction!.first_close_at : eatInputToIso(g('first_close_at')),
      terms_text: g('terms_text') || null,
      inspection_text: g('inspection_text') || null,
      collection_text: g('collection_text') || null,
      premium_pct: locked ? auction!.premium_pct : Number(g('premium_pct') || 10),
    };
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    if (auction) {
      const { error } = await supabase.from('auction_auctions').update(row).eq('id', auction.id);
      setBusy(false);
      if (error) { setMsg({ ok: false, text: error.message }); return; }
      setMsg({ ok: true, text: 'Saved.' });
      router.refresh();
    } else {
      const slug = `${slugify(row.title)}-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await supabase.from('auction_auctions').insert({ ...row, slug, ...(auctioneerId ? { auctioneer_id: auctioneerId } : {}) }).select('id').single();
      setBusy(false);
      if (error) { setMsg({ ok: false, text: error.message }); return; }
      router.push(`${basePath}/auctions/${data.id}`);
    }
  }

  return (
    <form onSubmit={submit} className="stack" style={{ gap: 14 }}>
      <label className="field">Title<input className="input" name="title" required defaultValue={auction?.title} /></label>
      <label className="field">Description<textarea className="input" name="description" rows={3} defaultValue={auction?.description ?? ''} /></label>
      <div className="grid2">
        <label className="field">Location<input className="input" name="location" defaultValue={auction?.location ?? ''} /></label>
        {mode === 'admin' && <label className="field">Status
          <select className="input" name="status" defaultValue={auction?.status ?? 'draft'}>
            <option value="draft">Draft (hidden)</option><option value="live">Live (open for bidding)</option><option value="closed">Closed</option>
          </select>
        </label>}
        <label className="field">First lot closes (Nairobi time)<input className="input" type="datetime-local" name="first_close_at" required disabled={locked} defaultValue={isoToEatInput(auction?.first_close_at)} /></label>
        <label className="field">Buyer&apos;s premium (%)<input className="input" type="number" step="0.5" min="0" max="30" name="premium_pct" disabled={locked} defaultValue={auction?.premium_pct ?? 10} /></label>
      </div>
      <div className="grid2">
        <label className="field">Inspection details<input className="input" name="inspection_text" placeholder="e.g. Tue 1 Dec, 09:00–15:00 at the site" defaultValue={auction?.inspection_text ?? ''} /></label>
        <label className="field">Collection details<input className="input" name="collection_text" placeholder="e.g. 7–10 Dec by appointment" defaultValue={auction?.collection_text ?? ''} /></label>
      </div>
      <label className="field">Terms of sale for this auction (optional — shown on the auction page)<textarea className="input" name="terms_text" rows={3} defaultValue={auction?.terms_text ?? defaultTerms ?? ''} placeholder="Deposit, payment deadline, collection rules, removal of items…" /></label>
      {locked && <span className="small muted">Published: closing time and buyer&apos;s premium are locked.</span>}
      {msg && <div role="status" className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`}>{msg.text}</div>}
      <button className="btn btn-primary" type="submit" disabled={busy} style={{ alignSelf: 'flex-start' }}>{busy ? 'Saving…' : auction ? 'Save auction' : 'Create auction'}</button>
    </form>
  );
}
