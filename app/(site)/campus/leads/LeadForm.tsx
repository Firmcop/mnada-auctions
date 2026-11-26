'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CATEGORY_NAMES } from '@/lib/categories';

export default function LeadForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const get = (k: string) => String(f.get(k) ?? '').trim();
    setMsg(null);
    if (!f.get('consent')) { setMsg({ ok: false, text: 'Only send the lead once the owner has agreed to be contacted.' }); return; }
    const files = (f.getAll('photos') as File[]).filter((x) => x && x.size).slice(0, 6);
    if (files.some((x) => x.size > 10 * 1024 * 1024)) { setMsg({ ok: false, text: 'Each photo must be under 10 MB.' }); return; }
    setBusy(true);
    const supabase = createClient();
    const photos: string[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${userId}/campus-lead-${Date.now()}-${photos.length}.${ext}`;
      const up = await supabase.storage.from('auction-kyc').upload(path, file);
      if (up.error) { setBusy(false); setMsg({ ok: false, text: up.error.message }); return; }
      photos.push(path);
    }
    const value = Number(get('value').replace(/[^0-9]/g, '')) || null;
    const { error } = await supabase.from('auction_campus_leads').insert({
      member_id: userId, business_name: get('business'), contact_name: get('contact'), contact_phone: get('phone'), contact_email: get('email') || null,
      location: get('location'), items: get('items'), category: get('category') || null, est_value_kes: value, photos, owner_consent: true,
    });
    setBusy(false);
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    form.reset();
    setMsg({ ok: true, text: 'Lead sent. Mnada will call the owner — you’ll see progress here.' });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="panel card stack" style={{ gap: 12 }}>
      <h3>Send a lead</h3>
      <div className="grid2">
        <label className="field">Business or owner name<input className="input" name="business" required /></label>
        <label className="field">Contact person<input className="input" name="contact" required /></label>
        <label className="field">Contact phone<input className="input" name="phone" type="tel" required /></label>
        <label className="field">Contact email <span className="small muted">(optional)</span><input className="input" name="email" type="email" /></label>
        <label className="field">Location<input className="input" name="location" placeholder="Town / area" required /></label>
        <label className="field">Main category<select className="input" name="category" defaultValue=""><option value="">Not sure</option>{CATEGORY_NAMES.map((c) => <option key={c}>{c}</option>)}</select></label>
      </div>
      <label className="field">What do they want to sell?<textarea className="input" name="items" rows={3} required placeholder="e.g. 2 forklifts, a 20 ft container office, workshop lathe — closing the Thika branch" /></label>
      <div className="grid2">
        <label className="field">Rough total value (KES) <span className="small muted">(optional)</span><input className="input" name="value" inputMode="numeric" /></label>
        <label className="field">Photos <span className="small muted">(up to 6, optional)</span><input className="input" type="file" name="photos" accept="image/*" multiple /></label>
      </div>
      <label className="check"><input type="checkbox" name="consent" /><span>The owner agreed that Mnada may contact them about selling these items.</span></label>
      {msg && <div role="status" className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`}>{msg.text}</div>}
      <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Send lead'}</button>
    </form>
  );
}
