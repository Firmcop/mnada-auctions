'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SellerApplyForm({ profile, userId }: {
  profile: { business_name: string; business_description: string; business_location: string; payout_method: 'mpesa' | 'bank'; payout_details: string };
  userId: string;
}) {
  const router = useRouter();
  const [method, setMethod] = useState(profile.payout_method);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) ?? '').trim();
    if (!f.get('agree')) { setErr('Please accept the seller terms.'); return; }
    setBusy(true);
    setErr(null);
    const { error } = await createClient().from('auction_profiles').update({
      business_name: g('business_name'), business_description: g('business_description') || null, business_location: g('business_location') || null,
      payout_method: method, payout_details: g('payout_details'), seller_status: 'pending', seller_applied_at: new Date().toISOString(),
    }).eq('id', userId);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="panel card stack" style={{ gap: 14 }}>
      <h2 style={{ fontSize: 22 }}>Apply for a seller account</h2>
      <label className="field">Business or trading name<input className="input" name="business_name" required defaultValue={profile.business_name} /></label>
      <label className="field">What do you sell?<textarea className="input" name="business_description" rows={3} placeholder="e.g. Used construction equipment, fleet disposals, fabricated steel structures" defaultValue={profile.business_description} /></label>
      <label className="field">Where are your items located?<input className="input" name="business_location" placeholder="Town / county" defaultValue={profile.business_location} /></label>
      <div className="grid2">
        <label className="field">Payout method
          <select className="input" value={method} onChange={(e) => setMethod(e.target.value as 'mpesa' | 'bank')}>
            <option value="mpesa">M-Pesa</option><option value="bank">Bank transfer</option>
          </select>
        </label>
        <label className="field">{method === 'mpesa' ? 'M-Pesa number' : 'Bank, branch and account number'}
          <input className="input" name="payout_details" required defaultValue={profile.payout_details} />
        </label>
      </div>
      <label className="check"><input type="checkbox" name="agree" /><span>I confirm I own or am authorised to sell the items I list, and I accept the <a href="/terms" target="_blank" rel="noreferrer">terms of sale</a>.</span></label>
      {err && <div role="alert" className="alert alert-err">{err}</div>}
      <button className="btn btn-primary" type="submit" disabled={busy} style={{ alignSelf: 'flex-start' }}>{busy ? 'Sending…' : 'Send application'}</button>
    </form>
  );
}
