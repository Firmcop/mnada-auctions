'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { kes } from '@/lib/format';
import { itemVolume, monthlyFor, usd, type StorageItem, type StorageSettings, type StorageSize } from '@/lib/storage';

type Row = StorageItem & { key: number };
let k = 1;

export default function StorageCalculator({ settings, sizes, userId, defaultPhone }: { settings: StorageSettings; sizes: StorageSize[]; userId: string | null; defaultPhone: string }) {
  const router = useRouter();
  const first = sizes[0];
  const [rows, setRows] = useState<Row[]>([first ? { key: k++, label: first.name, qty: 1, l: Number(first.length_m), w: Number(first.width_m), h: Number(first.height_m), size_id: first.id } : { key: k++, label: '', qty: 1, l: 1, w: 1, h: 1, size_id: null }]);
  const [months, setMonths] = useState(3);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const volume = Math.round(rows.reduce((s, r) => s + itemVolume(r), 0) * 100) / 100;
  const monthly = monthlyFor(volume, settings);
  const fx = settings.usd_to_kes ? Number(settings.usd_to_kes) : null;
  const vatF = settings.vat ? 1.16 : 1;

  function set(i: number, patch: Partial<Row>) { setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r))); }
  function pick(i: number, id: string) {
    const s = sizes.find((x) => x.id === id);
    if (!s) { set(i, { size_id: null }); return; }
    set(i, { size_id: s.id, label: s.name, l: Number(s.length_m), w: Number(s.width_m), h: Number(s.height_m) });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) return;
    const f = new FormData(e.currentTarget);
    const g = (x: string) => String(f.get(x) ?? '').trim();
    setBusy(true); setErr(null);
    const { data, error } = await createClient().from('auction_storage_bookings').insert({
      user_id: userId, items: rows.map(({ key: _k, ...r }) => ({ ...r, label: r.label.trim() || 'Item' })), months_planned: months || null,
      wanted_from: g('wanted_from') || null, viewing_allowed: f.get('viewing') === 'on', contact_phone: g('phone') || null, notes: g('notes') || null,
    }).select('id').single();
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.push(`/account/storage/${data.id}?new=1`);
  }

  return (
    <form onSubmit={submit} className="card panel stack" style={{ gap: 16 }}>
      <h2 style={{ fontSize: 22 }}>Storage calculator</h2>
      {rows.map((r, i) => (
        <div key={r.key} className="stack" style={{ gap: 8, paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
          <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
            <label className="field" style={{ flex: '2 1 220px' }}>Item size
              <select className="input" value={r.size_id ?? ''} onChange={(e) => pick(i, e.target.value)}>
                {sizes.map((s) => <option key={s.id} value={s.id}>{s.name} (~{Number(s.volume_m3)} m³)</option>)}
                <option value="">Custom size…</option>
              </select>
            </label>
            <label className="field" style={{ width: 80 }}>Qty<input className="input" type="number" min={1} value={r.qty || ''} onChange={(e) => set(i, { qty: parseInt(e.target.value, 10) || 0 })} /></label>
            {rows.length > 1 && <button type="button" className="btn btn-outline" aria-label="Remove item" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>✕</button>}
          </div>
          <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
            <label className="field" style={{ flex: '2 1 200px' }}>Description<input className="input" value={r.label} onChange={(e) => set(i, { label: e.target.value })} placeholder="e.g. CNC lathe" /></label>
            {(['l', 'w', 'h'] as const).map((d) => (
              <label key={d} className="field" style={{ width: 92 }}>{d === 'l' ? 'Length' : d === 'w' ? 'Width' : 'Height'} (m)
                <input className="input" inputMode="decimal" value={r[d] || ''} onChange={(e) => set(i, { [d]: parseFloat(e.target.value) || 0, size_id: null } as Partial<Row>)} />
              </label>
            ))}
            <span className="small" style={{ paddingBottom: 12, minWidth: 80 }}><b>{(Math.round(itemVolume(r) * 100) / 100).toLocaleString('en-US')} m³</b></span>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setRows((rs) => [...rs, { key: k++, label: '', qty: 1, l: 1, w: 1, h: 1, size_id: null }])}>+ Add another item</button>

      <div className="stack" style={{ gap: 6, background: 'var(--surface)', borderRadius: 10, padding: 16 }}>
        <div className="row between"><span>Space needed</span><b>{volume.toLocaleString('en-US')} m³</b></div>
        {monthly != null ? (
          <>
            <div className="row between"><span>Monthly storage{monthly === Number(settings.min_monthly_usd) && volume * Number(settings.rate_per_m3_usd) < monthly ? ' (minimum)' : ''}</span><b style={{ fontSize: 20 }}>USD {usd(monthly)}</b></div>
            {fx && <div className="row between small muted"><span>≈ in KES{settings.vat ? ' incl. VAT' : ''}</span><span>KES {kes(monthly * fx * vatF)} / month</span></div>}
            <div className="row between small" style={{ alignItems: 'center' }}>
              <label className="row" style={{ gap: 8, alignItems: 'center' }}>For <input className="input" type="number" min={1} max={60} value={months || ''} onChange={(e) => setMonths(parseInt(e.target.value, 10) || 0)} style={{ width: 70, height: 36 }} aria-label="Months" /> month(s)</label>
              <b>USD {usd(monthly * (months || 0))}{settings.handling_fee_usd ? ` + USD ${usd(settings.handling_fee_usd)} handling` : ''}</b>
            </div>
          </>
        ) : (
          <span className="small">From USD {usd(settings.min_monthly_usd)} per month — we confirm the exact price for {volume.toLocaleString('en-US')} m³ with your quote.</span>
        )}
      </div>

      {userId ? (
        <>
          <div className="grid2">
            <label className="field">Bring items in from<input className="input" type="date" name="wanted_from" min={new Date().toISOString().slice(0, 10)} /></label>
            <label className="field">Mobile<input className="input" name="phone" type="tel" defaultValue={defaultPhone} required /></label>
          </div>
          <label className="field">Anything we should know? (access, loading, keys)<textarea className="input" name="notes" rows={2} /></label>
          <label className="check"><input type="checkbox" name="viewing" defaultChecked />Buyers may view these items at the yard by appointment</label>
          {err && <div role="alert" className="alert alert-err">{err}</div>}
          <button className="btn btn-primary" type="submit" disabled={busy || volume <= 0 || !settings.enabled} style={{ minHeight: 52 }}>{busy ? 'Sending…' : 'Request storage'}</button>
        </>
      ) : (
        <div className="row"><a className="btn btn-primary" href="/login?next=/storage">Log in to request storage</a><a className="btn btn-outline" href="/register?next=/storage">Register</a></div>
      )}
    </form>
  );
}
