'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { kes, photoUrl } from '@/lib/format';
import { ALLOC_STATUS, REASON, type Allocation, type Offer } from '@/lib/allocations';

type Bidder = { user_id: string; bidder_no: string; best_bid: number; offered: boolean; excluded: boolean };

function left(deadline: string) {
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return 'time up';
  const h = Math.floor(ms / 3600000);
  return h >= 1 ? `${h} h ${Math.floor((ms % 3600000) / 60000)} min left` : `${Math.max(1, Math.floor(ms / 60000))} min left`;
}

export default function AllocationDesk({ allocations, empty }: { allocations: Allocation[]; empty: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [bidders, setBidders] = useState<Record<string, Bidder[]>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  async function run(p: PromiseLike<{ error: { message: string } | null }>, ok: string) {
    setBusy(true);
    const { error } = await p;
    setBusy(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: ok });
    if (!error) router.refresh();
  }
  async function loadBidders(id: string) {
    const { data, error } = await supabase.rpc('auction_alloc_bidders', { p_alloc: id });
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    setBidders((b) => ({ ...b, [id]: (data ?? []) as Bidder[] }));
  }
  const amt = (k: string) => Number(String(amounts[k] ?? '').replace(/[^0-9]/g, '')) || 0;
  const setAmt = (k: string, v: string) => setAmounts((a) => ({ ...a, [k]: v }));

  if (allocations.length === 0) return <p className="small muted">{empty}</p>;
  return (
    <>
      {msg && <div role="status" className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`}>{msg.text}</div>}
      {allocations.map((a) => {
        const lot = a.auction_lots;
        const [label, cls] = ALLOC_STATUS[a.status];
        const open = a.status === 'open';
        const pendingFromBidder = a.offers.filter((o) => o.status === 'pending' && o.from_side === 'bidder');
        const pendingToBidder = a.offers.filter((o) => o.status === 'pending' && o.from_side === 'seller');
        const gap = a.reserve != null ? Number(a.reserve) - Number(a.top_bid) : null;
        return (
          <section key={a.id} className="panel stack" style={{ gap: 10, border: open ? '2px solid #F2C3A8' : undefined }}>
            <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
              {lot?.photos?.[0] && <img src={photoUrl(lot.photos[0])} alt="" width={96} height={72} style={{ objectFit: 'cover', borderRadius: 8 }} />}
              <div className="stack" style={{ gap: 3, flex: '1 1 300px' }}>
                <Link href={`/lots/${lot?.id}`} style={{ fontWeight: 700 }}>Lot {lot?.lot_no} · {lot?.title}</Link>
                <span className="small muted">{lot?.auction_auctions?.title} · {REASON[a.reason]}</span>
                <span className="small">
                  {a.top_bidder ? <>Highest bid <b>KES {kes(a.top_bid)}</b></> : <>Last sale price KES {kes(a.top_bid)}</>}
                  {a.reserve != null && <> · reserve KES {kes(a.reserve)}{gap && gap > 0 ? <span className="muted"> ({Math.round((Number(a.top_bid) / Number(a.reserve)) * 100)}% of reserve, KES {kes(gap)} short)</span> : null}</>}
                </span>
              </div>
              <div className="stack" style={{ gap: 4, alignItems: 'flex-end' }}>
                <span className={`pill ${cls}`}>{label}</span>
                {open && <span className="small" style={{ fontWeight: 600 }}>{left(a.deadline)}</span>}
                {a.agreed_price != null && <span className="small">Agreed KES {kes(a.agreed_price)}</span>}
              </div>
            </div>

            {open && pendingFromBidder.map((o) => (
              <div key={o.id} className="alert alert-info row" style={{ gap: '8px 12px' }}>
                <span style={{ flex: '1 1 260px' }}><b>Counter-offer from the bidder: KES {kes(o.amount)}</b> · round {o.round} · {left(o.expires_at)}</span>
                <button type="button" className="btn btn-green btn-sm" disabled={busy} onClick={() => run(supabase.rpc('auction_offer_respond', { p_offer: o.id, p_action: 'accept', p_amount: null }), 'Accepted — the buyer has been invoiced.')}>Accept</button>
                <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => run(supabase.rpc('auction_offer_respond', { p_offer: o.id, p_action: 'decline', p_amount: null }), 'Counter-offer declined.')}>Decline</button>
                {o.round < 2 && <>
                  <input className="input" style={{ width: 150, height: 36 }} inputMode="numeric" placeholder="Final price" aria-label="Final counter-offer" value={amounts[o.id] ?? ''} onChange={(e) => setAmt(o.id, e.target.value)} />
                  <button type="button" className="btn btn-outline btn-sm" disabled={busy || amt(o.id) <= o.amount} onClick={() => run(supabase.rpc('auction_offer_respond', { p_offer: o.id, p_action: 'counter', p_amount: amt(o.id) }), 'Final offer sent.')}>Counter (final)</button>
                </>}
              </div>
            ))}
            {open && pendingToBidder.map((o) => (
              <span key={o.id} className="small"><b>Waiting for the bidder</b> to answer your offer of KES {kes(o.amount)} · {left(o.expires_at)}</span>
            ))}

            {open && pendingFromBidder.length === 0 && (
              <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
                {a.top_bidder && <button type="button" className="btn btn-green btn-sm" disabled={busy} onClick={() => { if (window.confirm(`Sell at the highest bid of KES ${kes(a.top_bid)}?`)) run(supabase.rpc('auction_alloc_accept', { p_alloc: a.id }), 'Sold — the buyer has been invoiced.'); }}>Accept KES {kes(a.top_bid)}</button>}
                {a.top_bidder && pendingToBidder.length === 0 && <>
                  <input className="input" style={{ width: 160, height: 36 }} inputMode="numeric" placeholder="Counter-offer KES" aria-label="Counter-offer to the highest bidder" value={amounts[a.id] ?? ''} onChange={(e) => setAmt(a.id, e.target.value)} />
                  <button type="button" className="btn btn-outline btn-sm" disabled={busy || amt(a.id) <= Number(a.top_bid)} onClick={() => run(supabase.rpc('auction_alloc_offer', { p_alloc: a.id, p_bidder: a.top_bidder, p_amount: amt(a.id), p_note: null }), 'Counter-offer sent to the highest bidder (24 hours to answer).')}>Send counter-offer</button>
                </>}
                <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => run(supabase.rpc('auction_alloc_offer_next', { p_alloc: a.id }), 'Offered to the next bidder at their highest bid.')}>Offer to next bidder</button>
                <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => (bidders[a.id] ? setBidders((b) => { const c = { ...b }; delete c[a.id]; return c; }) : loadBidders(a.id))}>{bidders[a.id] ? 'Hide bidders' : 'All bidders'}</button>
                <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => { if (window.confirm('Decline and leave this lot unsold? All bidders are released.')) run(supabase.rpc('auction_alloc_decline', { p_alloc: a.id }), 'Lot left unsold.'); }}>Decline — don&apos;t sell</button>
              </div>
            )}
            {open && bidders[a.id] && (
              <div className="stack" style={{ gap: 4 }}>
                {bidders[a.id].map((b) => (
                  <div key={b.user_id} className="row small" style={{ gap: 10 }}>
                    <span style={{ width: 120 }}>Bidder {b.bidder_no}</span><b style={{ width: 140 }}>KES {kes(b.best_bid)}</b>
                    {b.excluded ? <span className="muted">did not pay — excluded</span> : b.offered ? <span className="muted">already offered</span> : (
                      <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => run(supabase.rpc('auction_alloc_offer', { p_alloc: a.id, p_bidder: b.user_id, p_amount: b.best_bid, p_note: 'Offered at your highest bid' }), `Offered to bidder ${b.bidder_no} at KES ${kes(b.best_bid)}.`)}>Offer at their bid</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {a.offers.length > 0 && (
              <details className="small">
                <summary style={{ cursor: 'pointer' }}>Negotiation history ({a.offers.length})</summary>
                {a.offers.map((o: Offer) => (
                  <div key={o.id} className="muted">{new Date(o.created_at).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {o.from_side === 'seller' ? 'Seller offered' : 'Bidder countered'} KES {kes(o.amount)} · {o.status}</div>
                ))}
              </details>
            )}
          </section>
        );
      })}
    </>
  );
}
