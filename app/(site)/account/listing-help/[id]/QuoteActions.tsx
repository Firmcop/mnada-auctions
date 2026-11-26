'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { kes } from '@/lib/format';
import type { HelpRequest } from '@/lib/help';

export default function QuoteActions({ request: r, depositPct, upfrontOnly }: { request: HelpRequest; depositPct: number; upfrontOnly: number }) {
  const router = useRouter();
  const [method, setMethod] = useState<'upfront' | 'proceeds'>(r.pay_method);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const total = Number(r.quote_total_kes ?? 0);
  const deposit = method === 'upfront' ? Math.round(total * depositPct / 100) : upfrontOnly;

  async function accept() {
    setBusy(true); setErr(null);
    const { error } = await createClient().rpc('auction_help_accept', { p_request: r.id, p_pay_method: method });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.refresh();
  }
  async function cancel() {
    if (!window.confirm('Cancel this Listing Help request?')) return;
    setBusy(true);
    const { error } = await createClient().from('auction_help_requests').update({ status: 'cancelled' }).eq('id', r.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.refresh();
  }

  if (!['requested', 'quoted'].includes(r.status)) return null;
  return (
    <section className={r.status === 'quoted' ? 'panel stack' : 'stack'} style={{ gap: 12, border: r.status === 'quoted' ? '2px solid #F2C3A8' : undefined }}>
      {r.status === 'quoted' && (
        <>
          <h3>Accept the quote</h3>
          <label className="check"><input type="radio" name="pm" checked={method === 'upfront'} onChange={() => setMethod('upfront')} />Pay {depositPct}% now (KES {kes(Math.round(total * depositPct / 100))}), balance when the work is done</label>
          <label className="check"><input type="radio" name="pm" checked={method === 'proceeds'} onChange={() => setMethod('proceeds')} />Pay KES {kes(upfrontOnly)} now (survey &amp; travel), the rest deducted from my sale proceeds</label>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={accept} style={{ alignSelf: 'flex-start' }}>Accept quote{deposit > 0 ? ` · pay KES ${kes(deposit)}` : ''}</button>
          <span className="small muted">By accepting you agree to the quoted work and fees.</span>
        </>
      )}
      {err && <div role="alert" className="alert alert-err">{err}</div>}
      <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={cancel} style={{ alignSelf: 'flex-start' }}>Cancel request</button>
    </section>
  );
}
