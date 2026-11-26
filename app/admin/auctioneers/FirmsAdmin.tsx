'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { kes } from '@/lib/format';
import { FIRM_STATUS, licenceExpired, type Firm, type FirmFee, type FirmPrivate, type FirmSettings } from '@/lib/auctioneer';

type Review = { id: string; title: string; slug: string; auctioneer_id: string | null; publish_state: string | null; listing_fee_kes: number | null; success_fee_pct: number | null; first_close_at: string | null };

export default function FirmsAdmin({ firms, privs, docs, settings, fees, review }: { firms: Firm[]; privs: FirmPrivate[]; docs: Record<string, string>; settings: FirmSettings; fees: FirmFee[]; review: Review[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [refs, setRefs] = useState<Record<string, string>>({});
  const name = (id: string | null) => firms.find((f) => f.id === id)?.name ?? '—';
  const num = (v: FormDataEntryValue | null) => { const s = String(v ?? '').replace(/[^0-9.]/g, ''); return s === '' ? null : Number(s); };
  async function run(p: PromiseLike<{ error: { message: string } | null }>, ok = 'Saved.') {
    const { error } = await p;
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: ok });
    if (!error) router.refresh();
  }

  const pendingFees = fees.filter((f) => f.status === 'pending');
  const order = { pending: 0, approved: 1, suspended: 2, rejected: 3 } as const;
  return (
    <>
      {msg && <div role="status" className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`}>{msg.text}</div>}

      {(review.length > 0 || pendingFees.length > 0) && (
        <section className="panel stack" style={{ gap: 10, border: '2px solid #F2C3A8' }}>
          <h3>Waiting for you</h3>
          {pendingFees.map((f) => (
            <div key={f.id} className="row" style={{ gap: '8px 14px', padding: '6px 0', borderBottom: '1px solid #F0F2F4' }}>
              <b className="small" style={{ flex: '1 1 260px' }}>Listing fee KES {kes(f.amount_kes)} · {name(f.auctioneer_id)} · {review.find((r) => r.id === f.auction_id)?.title ?? ''} · ref {f.reference}</b>
              <input className="input" style={{ width: 170, height: 36 }} placeholder="M-Pesa / bank ref" aria-label="Payment reference" value={refs[f.id] ?? ''} onChange={(e) => setRefs((x) => ({ ...x, [f.id]: e.target.value }))} />
              <button type="button" className="btn btn-green btn-sm" onClick={() => run(supabase.rpc('auction_firm_confirm_fee', { p_fee: f.id, p_ref: refs[f.id] || null }), settings.auto_publish_when_paid ? 'Paid — auction published.' : 'Paid — now approve the auction below.')}>Confirm paid</button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => run(supabase.from('auction_auctioneer_fees').update({ status: 'cancelled' }).eq('id', f.id), 'Cancelled.')}>Cancel</button>
            </div>
          ))}
          {review.filter((r) => r.publish_state === 'awaiting_review').map((r) => (
            <div key={r.id} className="row" style={{ gap: '8px 14px', padding: '6px 0', borderBottom: '1px solid #F0F2F4' }}>
              <b className="small" style={{ flex: '1 1 260px' }}>Publish request: {r.title} · {name(r.auctioneer_id)}{r.success_fee_pct != null ? ` · ${r.success_fee_pct}% success fee` : ''}</b>
              <Link href={`/admin/auctions/${r.id}`} className="btn btn-outline btn-sm">Review lots</Link>
              <button type="button" className="btn btn-green btn-sm" onClick={() => run(supabase.from('auction_auctions').update({ status: 'live', publish_state: null }).eq('id', r.id), 'Published.')}>Approve &amp; publish</button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { const why = window.prompt('What should the auctioneer change?'); if (why) run(supabase.from('auction_auctions').update({ publish_state: 'rejected', publish_note: why }).eq('id', r.id), 'Sent back with your note.'); }}>Ask for changes</button>
            </div>
          ))}
          {review.filter((r) => r.publish_state === 'awaiting_payment').length > 0 && <span className="small muted">{review.filter((r) => r.publish_state === 'awaiting_payment').length} auction(s) waiting for the listing fee.</span>}
        </section>
      )}

      <form className="panel stack" style={{ gap: 10 }} onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(supabase.from('auction_auctioneer_settings').update({ listing_fee_kes: num(f.get('listing')), lot_fee_kes: num(f.get('lot')), success_fee_pct: num(f.get('pct')), auto_publish_when_paid: f.get('auto') === 'on', updated_at: new Date().toISOString() }).eq('id', 1)); }}>
        <h3>Standard fees for auctioneers</h3>
        <div className="row" style={{ alignItems: 'flex-end', gap: 12 }}>
          <label className="field" style={{ width: 200 }}>Listing fee per auction (KES)<input className="input" name="listing" defaultValue={settings.listing_fee_kes ?? ''} placeholder="not set" /></label>
          <label className="field" style={{ width: 180 }}>Fee per lot (KES)<input className="input" name="lot" defaultValue={settings.lot_fee_kes ?? ''} placeholder="not set" /></label>
          <label className="field" style={{ width: 200 }}>Success fee (% of hammer)<input className="input" name="pct" defaultValue={settings.success_fee_pct ?? ''} placeholder="not set" /></label>
          <label className="check"><input type="checkbox" name="auto" defaultChecked={settings.auto_publish_when_paid} />Publish automatically once the listing fee is paid</label>
          <button className="btn btn-primary" type="submit">Save</button>
        </div>
        <span className="small muted">Override any of these per firm below. With no listing fee, every publish request comes to you for approval. The success fee rate is fixed on each auction when it&apos;s sent for publishing.</span>
      </form>

      <section className="stack" style={{ gap: 12 }}>
        {[...firms].sort((a, b) => order[a.status] - order[b.status]).map((f) => {
          const p = privs.find((x) => x.auctioneer_id === f.id);
          return (
            <form key={f.id} className="panel stack" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); run(supabase.from('auction_auctioneer_private').update({ listing_fee_kes: num(d.get('listing')), lot_fee_kes: num(d.get('lot')), success_fee_pct: num(d.get('pct')) }).eq('auctioneer_id', f.id), 'Fee overrides saved.'); }}>
              <div className="row between">
                <b style={{ fontSize: 17 }}>{f.name}</b>
                <span className={`pill ${FIRM_STATUS[f.status][1]}`}>{FIRM_STATUS[f.status][0]}</span>
              </div>
              <span className="small">Licence <b>{f.licence_no}</b> · valid until {f.licence_expiry ? new Date(f.licence_expiry).toLocaleDateString('en-GB') : '—'}{licenceExpired(f) ? <b style={{ color: 'var(--warn)' }}> · EXPIRED</b> : null} · KRA {p?.kra_pin ?? '—'} · {docs[f.id] ? <a href={docs[f.id]} target="_blank" rel="noreferrer">View licence document</a> : 'no document'}</span>
              <span className="small muted">{[f.phone, f.email, f.location].filter(Boolean).join(' · ')} · payouts: {p?.payout_method} {p?.payout_details ?? ''}</span>
              {f.review_note && <span className="small" style={{ color: 'var(--warn)' }}>{f.review_note}</span>}
              <div className="row" style={{ alignItems: 'flex-end', gap: 8 }}>
                <label className="field" style={{ width: 150 }}>Listing fee override<input className="input" name="listing" defaultValue={p?.listing_fee_kes ?? ''} placeholder="standard" /></label>
                <label className="field" style={{ width: 130 }}>Per-lot override<input className="input" name="lot" defaultValue={p?.lot_fee_kes ?? ''} placeholder="standard" /></label>
                <label className="field" style={{ width: 150 }}>Success % override<input className="input" name="pct" defaultValue={p?.success_fee_pct ?? ''} placeholder="standard" /></label>
                <button className="btn btn-outline btn-sm" type="submit">Save fees</button>
                {f.status !== 'approved' && <button type="button" className="btn btn-green btn-sm" onClick={() => run(supabase.from('auction_auctioneers').update({ status: 'approved', review_note: null }).eq('id', f.id), 'Firm approved.')}>Approve</button>}
                {f.status === 'pending' && <button type="button" className="btn btn-outline btn-sm" onClick={() => { const why = window.prompt('Reason shown to the firm:'); if (why !== null) run(supabase.from('auction_auctioneers').update({ status: 'rejected', review_note: why || null }).eq('id', f.id), 'Rejected.'); }}>Reject</button>}
                {f.status === 'approved' && <button type="button" className="btn btn-outline btn-sm" onClick={() => { const why = window.prompt('Reason for suspending (shown to the firm):'); if (why !== null) run(supabase.from('auction_auctioneers').update({ status: 'suspended', review_note: why || null }).eq('id', f.id), 'Suspended.'); }}>Suspend</button>}
                {f.status === 'approved' && <Link href={`/auctioneers/${f.slug}`} className="btn btn-outline btn-sm">Public page</Link>}
              </div>
            </form>
          );
        })}
        {firms.length === 0 && <p className="small muted">No auctioneer firms yet. They apply at /account/auctioneer.</p>}
      </section>
    </>
  );
}
