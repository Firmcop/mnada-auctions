'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function SiteVisitForm({ userId, defaultName, defaultPhone, defaultEmail }: { userId: string | null; defaultName: string; defaultPhone: string; defaultEmail: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const today = new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) ?? '').trim();
    setBusy(true); setErr(null);
    const { error } = await createClient().from('auction_storage_visits').insert({
      user_id: userId, name: g('name'), phone: g('phone'), email: g('email') || null, visit_date: g('date'),
      time_slot: g('slot'), purpose: g('purpose') === 'viewing' ? 'viewing' : 'storage', notes: g('notes') || null,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setDone(true);
  }

  if (done) return <div className="alert alert-ok">Thanks — we&apos;ll call you to confirm your visit.</div>;
  return (
    <form onSubmit={submit} className="card panel stack" style={{ gap: 12 }}>
      <h2 style={{ fontSize: 22 }}>Book a site visit</h2>
      <p className="small" style={{ color: 'var(--body)', margin: 0 }}>See the yard before you book storage, or come to view items on sale.</p>
      <div className="grid2">
        <label className="field">Name<input className="input" name="name" required defaultValue={defaultName} /></label>
        <label className="field">Mobile<input className="input" name="phone" type="tel" required defaultValue={defaultPhone} placeholder="+254" /></label>
        <label className="field">Email (optional)<input className="input" name="email" type="email" defaultValue={defaultEmail} /></label>
        <label className="field">Reason
          <select className="input" name="purpose" defaultValue="storage"><option value="storage">Thinking of storing items</option><option value="viewing">Viewing items on sale</option></select>
        </label>
        <label className="field">Date<input className="input" name="date" type="date" required min={today} defaultValue={today} /></label>
        <label className="field">Time
          <select className="input" name="slot" defaultValue="morning"><option value="morning">Morning (9–11am)</option><option value="midday">Midday (11am–1pm)</option><option value="afternoon">Afternoon (2–4pm)</option></select>
        </label>
      </div>
      <label className="field">Notes (optional)<input className="input" name="notes" placeholder="e.g. lot numbers you want to see" /></label>
      {err && <div role="alert" className="alert alert-err">{err}</div>}
      <button className="btn btn-outline" type="submit" disabled={busy} style={{ alignSelf: 'flex-start' }}>{busy ? 'Sending…' : 'Request visit'}</button>
    </form>
  );
}
