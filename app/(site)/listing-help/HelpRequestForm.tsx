'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { kes } from '@/lib/format';
import type { HelpService, HelpSettings } from '@/lib/help';

type Draft = { description: string; qty: number; unit_price_kes: number; vat: boolean; priced: boolean; unit: string };

export default function HelpRequestForm({ services, settings, userId, defaultName, defaultPhone }: { services: HelpService[]; settings: HelpSettings; userId: string; defaultName: string; defaultPhone: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const pickable = services.filter((s) => s.code !== 'travel');
  const [picked, setPicked] = useState<string[]>(['full']);
  const [lots, setLots] = useState(5);
  const [km, setKm] = useState<string>('');
  const [draft, setDraft] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const bundle = pickable.find((s) => s.includes.length > 0);
  function toggle(code: string) {
    setPicked((p) => {
      if (p.includes(code)) return p.filter((c) => c !== code);
      if (bundle && code === bundle.code) return [code];
      return [...p.filter((c) => c !== bundle?.code), code];
    });
  }

  useEffect(() => {
    let live = true;
    if (!picked.length) { setDraft([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc('auction_help_draft', { p_services: picked, p_lots: lots || 1, p_km: km === '' ? null : Number(km) });
      if (live) setDraft((data ?? []) as Draft[]);
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [picked, lots, km, supabase]);

  const sub = draft.reduce((s, d) => s + d.qty * d.unit_price_kes, 0);
  const vat = draft.reduce((s, d) => s + (d.vat ? d.qty * d.unit_price_kes : 0), 0) * settings.vat_pct / 100;
  const unpriced = draft.filter((d) => !d.priced || d.unit === 'per_hour');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!picked.length) { setErr('Choose at least one service.'); return; }
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) ?? '').trim();
    setBusy(true);
    setErr(null);
    const { data, error } = await supabase.from('auction_help_requests').insert({
      user_id: userId, services: picked, contact_name: g('contact_name'), contact_phone: g('contact_phone'), location: g('location'),
      distance_km: km === '' ? null : Number(km), est_lots: lots || 1, items_description: g('items_description'),
      preferred_date: g('preferred_date') || null, pay_method: g('pay_method') === 'proceeds' ? 'proceeds' : 'upfront',
    }).select('id').single();
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.push(`/account/listing-help/${data.id}?new=1`);
  }

  return (
    <form onSubmit={submit} className="card panel stack" style={{ gap: 16 }}>
      <fieldset className="stack" style={{ gap: 8, border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 600, marginBottom: 6 }}>What do you need help with?</legend>
        {pickable.map((s) => (
          <label key={s.code} className="check" style={{ alignItems: 'flex-start' }}>
            <input type="checkbox" checked={picked.includes(s.code)} onChange={() => toggle(s.code)} />
            <span><b>{s.name}</b>{s.includes.length ? ' — everything below, done for you' : ''}<br /><span className="small muted">{s.description}</span></span>
          </label>
        ))}
      </fieldset>
      <div className="grid2">
        <label className="field">Roughly how many lots / items?<input className="input" type="number" min={1} max={5000} value={lots || ''} onChange={(e) => setLots(parseInt(e.target.value, 10) || 0)} required /></label>
        <label className="field">Distance from Nairobi (km, approx.)<input className="input" type="number" min={0} value={km} onChange={(e) => setKm(e.target.value)} placeholder="e.g. 0 for Nairobi" /></label>
      </div>
      <label className="field">Where are the items?<input className="input" name="location" required placeholder="Town, area or site name" /></label>
      <label className="field">Describe the items<textarea className="input" name="items_description" rows={4} required placeholder="What they are, rough condition, whether they're in one place, any access or loading issues…" /></label>
      <div className="grid2">
        <label className="field">Your name<input className="input" name="contact_name" required defaultValue={defaultName} /></label>
        <label className="field">Mobile<input className="input" name="contact_phone" type="tel" required defaultValue={defaultPhone} placeholder="+254" /></label>
        <label className="field">Preferred date<input className="input" name="preferred_date" type="date" min={new Date().toISOString().slice(0, 10)} /></label>
        <label className="field">How would you like to pay?
          <select className="input" name="pay_method" defaultValue="upfront">
            <option value="upfront">{settings.deposit_pct}% deposit, balance on completion</option>
            <option value="proceeds">Deduct from my sale proceeds (survey & travel paid upfront)</option>
          </select>
        </label>
      </div>
      <div className="stack" style={{ gap: 6, background: 'var(--surface)', borderRadius: 10, padding: 14 }}>
        <b>Instant estimate</b>
        {draft.map((d, i) => (
          <div key={i} className="row between small">
            <span>{d.description}{d.unit === 'per_lot' ? ` × ${d.qty}` : ''}</span>
            <span>{d.priced && d.unit !== 'per_hour' ? `KES ${kes(d.qty * d.unit_price_kes)}` : 'quoted'}</span>
          </div>
        ))}
        <div className="row between small" style={{ borderTop: '1px solid var(--line)', paddingTop: 6 }}><span>VAT {settings.vat_pct}%</span><span>KES {kes(vat)}</span></div>
        <div className="row between"><b>Estimated total</b><b>KES {kes(sub + vat)}{unpriced.length ? ' +' : ''}</b></div>
        {unpriced.length > 0 && <span className="small muted">Some items are priced after we review your request.</span>}
        <span className="small muted">This is an estimate. You&apos;ll receive a firm quote to accept before any work or payment.</span>
      </div>
      {err && <div role="alert" className="alert alert-err">{err}</div>}
      <button className="btn btn-primary" type="submit" disabled={busy || !picked.length} style={{ minHeight: 52 }}>{busy ? 'Sending…' : 'Request a quote'}</button>
    </form>
  );
}
