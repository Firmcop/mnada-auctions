'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Countdown from '@/components/Countdown';
import { CheckIcon } from '@/components/Icons';
import { eat, increment, kes, mandatoryExtras, minNextBid, TERMS_VERSION, VAT_RATE, type Lot } from '@/lib/format';

type HistoryRow = { bidder_no: number | null; amount: number; is_auto: boolean; created_at: string; is_you: boolean };

export default function BidPanel(props: {
  initialLot: Lot;
  auctionLive: boolean;
  premiumPct: number;
  userId: string | null;
  profileStatus: string | null;
  bidLimit: number | null;
  initialMyMax: number | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [lot, setLot] = useState<Lot>(props.initialLot);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [mode, setMode] = useState<'single' | 'max'>('single');
  const [amount, setAmount] = useState<number>(minNextBid(props.initialLot));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [myMax, setMyMax] = useState<number | null>(props.initialMyMax);
  const [closed, setClosed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const min = minNextBid(lot);
  const leading = !!props.userId && lot.leader_id === props.userId;

  const loadHistory = useCallback(async () => {
    const { data } = await supabase.rpc('auction_bid_history', { p_lot: lot.id });
    if (data) setHistory(data as HistoryRow[]);
  }, [supabase, lot.id]);

  useEffect(() => {
    loadHistory();
    const channel = supabase
      .channel(`lot-${lot.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auction_lots', filter: `id=eq.${lot.id}` }, (payload) => {
        const next = payload.new as Lot;
        setLot((prev) => ({ ...prev, ...next }));
        loadHistory();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, lot.id, loadHistory]);

  // keep the amount at or above the minimum as the price moves
  useEffect(() => {
    setAmount((a) => (a < min ? min : a));
  }, [min]);

  useEffect(() => {
    const check = () => setClosed(new Date(lot.closes_at).getTime() <= Date.now());
    check();
    const t = setInterval(check, 1000);
    return () => clearInterval(t);
  }, [lot.closes_at]);

  const isOpen = props.auctionLive && lot.status === 'open' && !closed;
  const prem = Math.round((amount * props.premiumPct) / 100);
  const extras = mandatoryExtras(lot);
  const vat = Math.round((prem + extras) * VAT_RATE + (lot.vat_on_hammer ? amount * VAT_RATE : 0));
  const total = amount + prem + extras + vat;
  const isMax = mode === 'max' || leading;

  async function place() {
    setBusy(true);
    setMsg(null);
    const { data, error } = await supabase.rpc('auction_place_bid', { p_lot: lot.id, p_amount: amount, p_is_max: isMax, p_terms_version: TERMS_VERSION });
    setConfirming(false);
    setAgreed(false);
    setBusy(false);
    if (error) {
      setMsg({ ok: false, text: error.message });
      return;
    }
    const r = data as { current_bid: number; leading: boolean; closes_at: string; reserve_met: boolean };
    if (mode === 'max' || leading) setMyMax(amount);
    setLot((prev) => ({ ...prev, current_bid: r.current_bid, leader_id: r.leading ? props.userId : prev.leader_id, closes_at: r.closes_at, reserve_met: r.reserve_met }));
    setMsg(r.leading
      ? { ok: true, text: mode === 'max' || leading ? `Auto-bid set up to KES ${kes(amount)}. You are the highest bidder.` : 'Bid placed. You are the highest bidder.' }
      : { ok: false, text: 'Another bidder’s auto-bid was higher, so you have been outbid. Try a higher amount.' });
    loadHistory();
  }

  const step = increment(amount);

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="card stack" style={{ padding: 22, gap: 16, boxShadow: '0 8px 24px rgba(15,42,61,.06)' }}>
        <div className="row between">
          {isOpen ? <Countdown closesAt={lot.closes_at} /> : <span className="pill pill-grey">Bidding closed</span>}
          <span className="small muted">{isOpen ? `Closes ${eat(lot.closes_at)}` : lot.status === 'sold' ? 'Sold' : ''}</span>
        </div>

        <div className="stack" style={{ gap: 2 }}>
          <span className="small muted">{lot.bid_count > 0 ? `Current bid · ${lot.bid_count} bids` : 'Starting bid'}</span>
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 38, color: 'var(--navy)' }}>
            KES {kes(lot.bid_count > 0 ? lot.current_bid : lot.start_bid)}
          </span>
          <span className="small muted">
            {!lot.has_reserve ? 'No reserve' : lot.reserve_met ? 'Reserve met' : 'Reserve not yet met'}
          </span>
        </div>

        {leading && isOpen && (
          <div className="alert alert-ok row" style={{ gap: 8 }}>
            <CheckIcon /> You are the highest bidder{myMax ? ` · your maximum KES ${kes(myMax)}` : ''}
          </div>
        )}
        {!leading && props.userId && history.some((h) => h.is_you) && isOpen && (
          <div className="alert alert-err">You have been outbid.</div>
        )}

        {isOpen && !props.userId && (
          <div className="stack">
            <p>Log in or register to bid on this lot.</p>
            <div className="row">
              <Link href={`/login?next=/lots/${lot.id}`} className="btn btn-dark">Log in</Link>
              <Link href="/register" className="btn btn-outline">Register</Link>
            </div>
          </div>
        )}
        {isOpen && props.userId && props.profileStatus !== 'approved' && (
          <div className="alert alert-info">
            {props.profileStatus === null
              ? 'Your account isn’t registered for bidding yet. '
              : props.profileStatus === 'rejected' ? 'Your registration was not approved. Contact us if you think this is a mistake. '
              : 'Your account is awaiting approval — usually within one working hour. '}
            <Link href="/account">Check your account</Link>
          </div>
        )}

        {isOpen && props.userId && props.profileStatus === 'approved' && (
          <>
            {!leading && (
              <div role="group" aria-label="Bid type" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, background: 'var(--surface)', borderRadius: 10, padding: 4 }}>
                {(['single', 'max'] as const).map((m) => (
                  <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
                    style={{ height: 42, borderRadius: 8, border: 0, font: 'inherit', fontWeight: 600, fontSize: 14, cursor: 'pointer', background: mode === m ? '#fff' : 'transparent', color: mode === m ? 'var(--navy)' : 'var(--body)', boxShadow: mode === m ? '0 1px 3px rgba(15,42,61,.15)' : 'none' }}>
                    {m === 'single' ? 'Single bid' : 'Auto-bid (max)'}
                  </button>
                ))}
              </div>
            )}
            <label className="field" htmlFor="bidamt">{leading ? 'Raise your maximum bid' : mode === 'single' ? 'Your bid' : 'Your maximum bid'}</label>
            <div className="row" style={{ gap: 8, flexWrap: 'nowrap', marginTop: -6 }}>
              <button type="button" className="btn btn-outline" style={{ width: 50, padding: 0, fontSize: 22 }} aria-label="Lower by one step"
                onClick={() => setAmount((a) => Math.max(min, a - increment(a)))}>−</button>
              <div className="row" style={{ flex: 1, minWidth: 0, border: '1.5px solid var(--navy)', borderRadius: 10, padding: '0 12px', gap: 6, flexWrap: 'nowrap' }}>
                <span className="muted" style={{ fontWeight: 600 }}>KES</span>
                <input id="bidamt" inputMode="numeric" value={amount.toLocaleString('en-US')}
                  onChange={(e) => setAmount(parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0)}
                  style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', height: 48, fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 22, color: 'var(--navy)' }} />
              </div>
              <button type="button" className="btn btn-outline" style={{ width: 50, padding: 0, fontSize: 22 }} aria-label="Raise by one step"
                onClick={() => setAmount((a) => a + increment(a))}>+</button>
            </div>
            <span className="small" style={{ color: amount < min ? 'var(--danger)' : 'var(--muted)' }}>
              {amount < min ? `Minimum bid is KES ${kes(min)}`
                : mode === 'max' && !leading ? 'We bid for you, one step at a time, only as high as needed, up to this amount.'
                : `Next minimum bid KES ${kes(min)} · step KES ${kes(step)}`}
              {props.bidLimit ? ` · your limit KES ${kes(props.bidLimit)}` : ''}
            </span>
            <button type="button" className="btn btn-primary" style={{ minHeight: 54, fontSize: 17 }} disabled={busy || amount < min} onClick={() => { setMsg(null); setConfirming(true); }}>
              {isMax ? `Set auto-bid up to KES ${kes(amount)}` : `Place bid · KES ${kes(amount)}`}
            </button>
            {msg && <div role="status" className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`}>{msg.text}</div>}
            <div className="stack small" style={{ gap: 6, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <b style={{ fontSize: 14 }}>If you win at KES {kes(amount)}</b>
              <div className="row between"><span className="muted">Hammer price</span><span>KES {kes(amount)}</span></div>
              <div className="row between"><span className="muted">Buyer&apos;s premium ({props.premiumPct}%)</span><span>KES {kes(prem)}</span></div>
              {(lot.extra_costs ?? []).filter((e) => e.mandatory).map((e) => (
                <div key={e.label} className="row between"><span className="muted">{e.label}</span><span>KES {kes(e.amount)}</span></div>
              ))}
              <div className="row between"><span className="muted">VAT (16%)</span><span>KES {kes(vat)}</span></div>
              <div className="row between" style={{ fontWeight: 700, borderTop: '1px dashed var(--field)', paddingTop: 6 }}><span>Estimated total</span><span>KES {kes(total)}</span></div>
              <span className="muted">Excludes transport. Pay by M-Pesa or bank transfer within 3 working days of close.</span>
            </div>
          </>
        )}
      </div>

      <div className="card stack" style={{ padding: 18, gap: 4 }}>
        <b style={{ marginBottom: 6 }}>Bid history</b>
        {history.length === 0 && <span className="small muted">No bids yet.</span>}
        {history.map((h, i) => (
          <div key={i} className="row between small" style={{ padding: '6px 0', borderBottom: '1px solid #F0F2F4', flexWrap: 'nowrap' }}>
            <span style={{ fontWeight: h.is_you ? 700 : 400, color: h.is_you ? 'var(--green)' : 'inherit' }}>
              {h.is_you ? 'You' : `Bidder ${h.bidder_no ?? '—'}`}{h.is_auto ? ' (auto)' : ''}
            </span>
            <span className="muted">{new Date(h.created_at).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            <span style={{ fontWeight: 600 }}>KES {kes(h.amount)}</span>
          </div>
        ))}
      </div>
      {confirming && (
        <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" style={{ position: 'fixed', inset: 0, background: 'rgba(10,30,44,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}
          onClick={(e) => { if (e.target === e.currentTarget && !busy) setConfirming(false); }}>
          <div className="panel stack" style={{ width: 'min(460px, 100%)', gap: 14, boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <h2 id="confirm-title" style={{ fontSize: 22 }}>{isMax ? 'Confirm your auto-bid' : 'Confirm your bid'}</h2>
            <p className="small" style={{ color: 'var(--body)' }}>
              {isMax
                ? `We will bid for you, one step at a time, up to KES ${kes(amount)}. You may win for less.`
                : `You are bidding KES ${kes(amount)} on Lot ${lot.lot_no}: ${lot.title}.`}
            </p>
            <div className="stack small" style={{ gap: 6, background: 'var(--surface)', borderRadius: 10, padding: 14 }}>
              <div className="row between"><span className="muted">{isMax ? 'Maximum hammer price' : 'Hammer price'}</span><span>KES {kes(amount)}</span></div>
              <div className="row between"><span className="muted">Buyer&apos;s premium ({props.premiumPct}%)</span><span>KES {kes(prem)}</span></div>
              {(lot.extra_costs ?? []).filter((e) => e.mandatory).map((e) => (
                <div key={e.label} className="row between"><span className="muted">{e.label}</span><span>KES {kes(e.amount)}</span></div>
              ))}
              <div className="row between"><span className="muted">VAT (16%)</span><span>KES {kes(vat)}</span></div>
              <div className="row between" style={{ fontWeight: 700, borderTop: '1px dashed var(--field)', paddingTop: 6 }}><span>{isMax ? 'Total if you win at your maximum' : 'Total if you win'}</span><span>KES {kes(total)}</span></div>
            </div>
            <p className="small" style={{ color: 'var(--body)' }}>Your bid is binding once confirmed and cannot be withdrawn. Pay within 3 working days of winning and collect on the dates given.</p>
            <label className="check"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              <span>I accept the <a href="/terms" target="_blank" rel="noreferrer">terms of sale</a> and have checked the lot description, condition and collection details.</span>
            </label>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={() => setConfirming(false)} disabled={busy}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={place} disabled={!agreed || busy}>{busy ? 'Placing…' : 'Confirm bid'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
