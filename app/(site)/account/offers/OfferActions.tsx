'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { kes } from '@/lib/format';
import type { Offer } from '@/lib/allocations';

export default function OfferActions({ offer: o }: { offer: Offer }) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const val = Number(amount.replace(/[^0-9]/g, '')) || 0;
  async function respond(action: 'accept' | 'decline' | 'counter') {
    if (action === 'accept' && !window.confirm(`Buy this lot for KES ${kes(o.amount)} plus buyer's premium and VAT? This is binding.`)) return;
    setBusy(true); setErr(null);
    const { error } = await createClient().rpc('auction_offer_respond', { p_offer: o.id, p_action: action, p_amount: action === 'counter' ? val : null });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.refresh();
  }
  return (
    <div className="stack" style={{ gap: 8 }}>
      <span><b>The seller offers this lot to you for KES {kes(o.amount)}</b>{o.round >= 2 ? ' — final offer' : ''}.{o.note ? ` “${o.note}”` : ''}</span>
      <span className="small muted">Answer by {new Date(o.expires_at).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.</span>
      <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => respond('accept')}>Accept KES {kes(o.amount)}</button>
        <button type="button" className="btn btn-outline" disabled={busy} onClick={() => respond('decline')}>Decline</button>
        {o.round < 2 && <>
          <input className="input" style={{ width: 160 }} inputMode="numeric" placeholder="Your price (KES)" aria-label="Counter-offer" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <button type="button" className="btn btn-outline" disabled={busy || !val || val >= o.amount} onClick={() => respond('counter')}>Counter-offer</button>
        </>}
      </div>
      {err && <div role="alert" className="alert alert-err">{err}</div>}
    </div>
  );
}
