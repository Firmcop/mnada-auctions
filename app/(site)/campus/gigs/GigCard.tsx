'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { kes } from '@/lib/format';
import { GIG_KIND, GIG_STATUS, type Gig } from '@/lib/campus';

export default function GigCard({ gig: g, mine }: { gig: Gig; mine: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function call(fn: string, args: Record<string, unknown>) {
    setBusy(true); setErr(null);
    const { error } = await createClient().rpc(fn, args);
    setBusy(false);
    if (error) setErr(error.message); else router.refresh();
  }
  return (
    <div className="card stack" style={{ padding: 16, gap: 8 }}>
      <div className="row between"><span className="eyebrow">{GIG_KIND[g.kind]}</span><span className={`pill ${GIG_STATUS[g.status][1]}`}>{GIG_STATUS[g.status][0]}</span></div>
      <b style={{ fontSize: 17 }}>{g.title}</b>
      {g.details && <span className="small" style={{ color: 'var(--body)', whiteSpace: 'pre-line' }}>{g.details}</span>}
      <span className="small muted">{[g.location, g.campus && `near ${g.campus}`, g.scheduled_for && new Date(g.scheduled_for).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })].filter(Boolean).join(' · ')}</span>
      <span style={{ fontWeight: 700, color: 'var(--accent)' }}>KES {kes(g.pay_kes)}</span>
      {g.review_note && <span className="small">Mnada: {g.review_note}</span>}
      {!mine && g.status === 'open' && <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => call('auction_campus_gig_claim', { p_gig: g.id })}>Take this gig</button>}
      {mine && (g.status === 'claimed' || g.status === 'submitted') && (
        <form className="stack" style={{ gap: 6 }} onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const links = String(f.get('links') ?? '').split(/\s+/).map((x) => x.trim()).filter((x) => /^https?:\/\//.test(x));
          if (!links.length) { setErr('Add at least one link to your work.'); return; }
          call('auction_campus_gig_submit', { p_gig: g.id, p_note: String(f.get('note') ?? ''), p_links: links });
        }}>
          <textarea className="input" name="links" rows={2} placeholder="Links to your photos / video / report (one per line)" defaultValue={g.submission_links.join('\n')} />
          <textarea className="input" name="note" rows={2} placeholder="Notes for Mnada (optional)" defaultValue={g.submission_note ?? ''} />
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-primary btn-sm" disabled={busy} type="submit">{g.status === 'submitted' ? 'Update submission' : 'Submit work'}</button>
            {g.status === 'claimed' && <button className="btn btn-outline btn-sm" type="button" disabled={busy} onClick={() => call('auction_campus_gig_release', { p_gig: g.id })}>Give it back</button>}
          </div>
        </form>
      )}
      {err && <div role="alert" className="alert alert-err">{err}</div>}
    </div>
  );
}
