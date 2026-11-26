'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@/lib/eat-input';

export default function FirmApplyForm({ userId, defaultPhone, defaultEmail }: { userId: string; defaultPhone: string; defaultEmail: string }) {
  const router = useRouter();
  const [method, setMethod] = useState<'bank' | 'mpesa'>('bank');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) ?? '').trim();
    if (!f.get('agree')) { setErr('Please confirm the declaration.'); return; }
    const doc = f.get('licence_doc') as File | null;
    if (!doc || !doc.size) { setErr('Please attach your auctioneer licence.'); return; }
    if (doc.size > 10 * 1024 * 1024) { setErr('The licence file must be under 10 MB.'); return; }
    setBusy(true); setErr(null);
    const supabase = createClient();
    const id = crypto.randomUUID();
    const ext = (doc.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${userId}/auctioneer-licence-${id}.${ext}`;
    const up = await supabase.storage.from('auction-kyc').upload(path, doc, { upsert: false, contentType: doc.type || undefined });
    if (up.error) { setBusy(false); setErr(`Upload failed: ${up.error.message}`); return; }
    const slug = `${slugify(g('name')) || 'firm'}-${id.slice(0, 4)}`;
    const { error } = await supabase.from('auction_auctioneers').insert({
      id, slug, name: g('name'), licence_no: g('licence_no'), licence_expiry: g('licence_expiry') || null, phone: g('phone') || null,
      email: g('email') || null, location: g('location') || null, about: g('about') || null, created_by: userId, status: 'pending',
    });
    if (error) { setBusy(false); setErr(error.message); return; }
    const { error: e2 } = await supabase.from('auction_auctioneer_private').update({
      kra_pin: g('kra_pin') || null, licence_doc: path, payout_method: method, payout_details: g('payout_details') || null,
    }).eq('auctioneer_id', id);
    setBusy(false);
    if (e2) { setErr(e2.message); return; }
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="panel card stack" style={{ gap: 14 }}>
      <h2 style={{ fontSize: 22 }}>Apply as an auctioneer firm</h2>
      <div className="grid2">
        <label className="field">Firm name<input className="input" name="name" required /></label>
        <label className="field">Auctioneer licence number<input className="input" name="licence_no" required /></label>
        <label className="field">Licence valid until<input className="input" name="licence_expiry" type="date" required /></label>
        <label className="field">KRA PIN<input className="input" name="kra_pin" required /></label>
        <label className="field">Business phone<input className="input" name="phone" type="tel" defaultValue={defaultPhone} required /></label>
        <label className="field">Business email<input className="input" name="email" type="email" defaultValue={defaultEmail} required /></label>
      </div>
      <label className="field">Office location<input className="input" name="location" placeholder="Town / street" /></label>
      <label className="field">About the firm (shown on your public page)<textarea className="input" name="about" rows={3} /></label>
      <label className="field">Licence certificate (PDF or photo)<input className="input" name="licence_doc" type="file" accept="application/pdf,image/*" required /></label>
      <div className="grid2">
        <label className="field">Payouts to
          <select className="input" value={method} onChange={(e) => setMethod(e.target.value as 'bank' | 'mpesa')}><option value="bank">Bank account</option><option value="mpesa">M-Pesa</option></select>
        </label>
        <label className="field">{method === 'bank' ? 'Bank, branch and account number' : 'M-Pesa number'}<input className="input" name="payout_details" required /></label>
      </div>
      <label className="check"><input type="checkbox" name="agree" /><span>I confirm the firm holds a valid auctioneer&apos;s licence, that I am authorised to apply on its behalf, and that we will conduct auctions on Mnada under the <a href="/terms" target="_blank" rel="noreferrer">platform terms</a>.</span></label>
      {err && <div role="alert" className="alert alert-err">{err}</div>}
      <button className="btn btn-primary" type="submit" disabled={busy} style={{ alignSelf: 'flex-start' }}>{busy ? 'Sending…' : 'Send application'}</button>
    </form>
  );
}
