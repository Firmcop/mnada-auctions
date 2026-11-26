'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { kes, type Auction } from '@/lib/format';
import type { FirmFee } from '@/lib/auctioneer';

export default function PublishPanel({ auction: a, lotCount, listingFee, lotFee, successPct, fees }: { auction: Auction; lotCount: number; listingFee: number; lotFee: number; successPct: number | null; fees: FirmFee[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fee = listingFee + lotFee * lotCount;
  const pending = fees.find((f) => f.status === 'pending');

  async function call(fn: 'auction_firm_submit' | 'auction_firm_withdraw') {
    setBusy(true); setErr(null);
    const { error } = await createClient().rpc(fn, { p_auction: a.id });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.refresh();
  }

  return (
    <section className="panel stack" style={{ gap: 10, border: '2px solid #F2C3A8' }}>
      <h3>Publish this auction</h3>
      {!a.publish_state || a.publish_state === 'rejected' ? (
        <>
          <span className="small">Fees for this auction: {fee > 0 ? <><b>KES {kes(fee)}</b> listing fee{lotFee > 0 ? ` (${listingFee ? `KES ${kes(listingFee)} + ` : ''}${lotCount} lots × KES ${kes(lotFee)})` : ''}</> : 'no listing fee'}{successPct ? <> · <b>{successPct}%</b> success fee on sold lots</> : null}.</span>
          <span className="small muted">Every lot needs at least one photo, a starting bid and a closing time at least an hour away. After publishing, lots, prices, reserves and closing times are locked.</span>
          <button type="button" className="btn btn-primary" disabled={busy || lotCount === 0} onClick={() => call('auction_firm_submit')} style={{ alignSelf: 'flex-start' }}>{fee > 0 ? `Send for publishing · pay KES ${kes(fee)}` : 'Send for publishing'}</button>
        </>
      ) : a.publish_state === 'awaiting_payment' && pending ? (
        <>
          <span><b>Listing fee KES {kes(pending.amount_kes)} due.</b></span>
          <span className="small">M-Pesa: Lipa na M-Pesa › Pay Bill › Business no. <b>[PAYBILL]</b> › Account no. <b>{pending.reference}</b> — or bank transfer quoting <b>{pending.reference}</b>. The auction goes live as soon as we confirm the payment.</span>
          <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => call('auction_firm_withdraw')} style={{ alignSelf: 'flex-start' }}>Withdraw and keep editing</button>
        </>
      ) : (
        <>
          <span className="small"><b>With Mnada for review.</b> We&apos;ll publish it or tell you what to change.</span>
          <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => call('auction_firm_withdraw')} style={{ alignSelf: 'flex-start' }}>Withdraw and keep editing</button>
        </>
      )}
      {err && <div role="alert" className="alert alert-err">{err}</div>}
    </section>
  );
}
