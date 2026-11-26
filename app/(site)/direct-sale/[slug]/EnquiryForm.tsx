'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { kes } from '@/lib/format';

type Kind = 'quote' | 'offer' | 'question';

export default function EnquiryForm({ listingId, priceType, askingPrice, defaults, userId }: {
  listingId: string;
  priceType: 'fixed' | 'offer' | 'on_request';
  askingPrice: number | null;
  defaults: { name: string; phone: string; email: string };
  userId: string | null;
}) {
  const kinds: [Kind, string][] = priceType === 'offer'
    ? [['offer', 'Make an offer'], ['quote', 'Request a quote'], ['question', 'Ask a question']]
    : priceType === 'fixed'
      ? [['quote', 'Buy / reserve'], ['question', 'Ask a question']]
      : [['quote', 'Request a quote'], ['question', 'Ask a question']];
  const [kind, setKind] = useState<Kind>(kinds[0][0]);
  const [offer, setOffer] = useState<number>(askingPrice ? Math.round(askingPrice * 0.95) : 0);
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) ?? '').trim();
    if (kind === 'offer' && !offer) { setErr('Enter your offer.'); return; }
    setState('busy');
    setErr(null);
    const { error } = await createClient().from('auction_enquiries').insert({
      listing_id: listingId,
      user_id: userId,
      kind,
      name: g('name'),
      phone: g('phone'),
      email: g('email') || null,
      offer_amount: kind === 'offer' ? offer : null,
      quantity: Number(g('quantity')) || null,
      delivery_location: g('delivery') || null,
      message: g('message') || null,
    });
    if (error) { setErr('Could not send — please try again or call us.'); setState('idle'); return; }
    setState('done');
  }

  if (state === 'done') {
    return (
      <div role="status" className="alert alert-ok">
        {kind === 'offer' ? `Offer of KES ${kes(offer)} sent.` : 'Request sent.'} We&apos;ll call or WhatsApp you within one working day.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="stack" style={{ gap: 12 }}>
      <div role="tablist" aria-label="What would you like to do?" style={{ display: 'grid', gridTemplateColumns: `repeat(${kinds.length}, 1fr)`, gap: 4, background: 'var(--surface)', borderRadius: 10, padding: 4 }}>
        {kinds.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => setKind(k)}
            style={{ minHeight: 42, borderRadius: 8, border: 0, font: 'inherit', fontWeight: 600, fontSize: 13, cursor: 'pointer', background: kind === k ? '#fff' : 'transparent', color: kind === k ? 'var(--navy)' : 'var(--body)', boxShadow: kind === k ? '0 1px 3px rgba(15,42,61,.15)' : 'none' }}>
            {label}
          </button>
        ))}
      </div>
      {kind === 'offer' && (
        <label className="field">Your offer (KES, excl. VAT)
          <input className="input" inputMode="numeric" value={offer ? offer.toLocaleString('en-US') : ''} onChange={(e) => setOffer(parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0)} required />
        </label>
      )}
      {kind !== 'question' && (
        <div className="grid2" style={{ gap: 10 }}>
          <label className="field">Quantity<input className="input" name="quantity" type="number" min="1" defaultValue={1} /></label>
          <label className="field">Deliver to<input className="input" name="delivery" placeholder="Town / county" /></label>
        </div>
      )}
      <label className="field">Name<input className="input" name="name" defaultValue={defaults.name} required autoComplete="name" /></label>
      <div className="grid2" style={{ gap: 10 }}>
        <label className="field">Mobile<input className="input" name="phone" type="tel" defaultValue={defaults.phone} placeholder="+254" required autoComplete="tel" /></label>
        <label className="field">Email<input className="input" name="email" type="email" defaultValue={defaults.email} autoComplete="email" /></label>
      </div>
      <label className="field">{kind === 'question' ? 'Your question' : 'Anything else? (finishes, layout, timing)'}
        <textarea className="input" name="message" rows={3} required={kind === 'question'} />
      </label>
      {err && <div role="alert" className="alert alert-err">{err}</div>}
      <button className="btn btn-primary" type="submit" disabled={state === 'busy'} style={{ minHeight: 52 }}>
        {state === 'busy' ? 'Sending…' : kind === 'offer' ? 'Send offer' : kind === 'quote' ? (priceType === 'fixed' ? 'Reserve / buy' : 'Request quote') : 'Send question'}
      </button>
      <span className="small muted">No obligation. Offers are private — other buyers don&apos;t see them.</span>
    </form>
  );
}
