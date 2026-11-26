'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { kes } from '@/lib/format';
import { STORAGE_STATUS, discountFor, itemVolume, minVolume, monthlyFor, usd, type DiscountTier, type StorageBooking, type StorageCharge, type StorageSettings, type StorageSize } from '@/lib/storage';

type Person = { id: string; full_name: string; business_name: string | null; phone: string };
type Stock = { id: string; ref: string; title: string; status: string; storage_booking_id: string | null };

export default function StorageAdmin({ settings, sizes, bookings, charges, people, stock, canFinance, canOps }: {
  settings: StorageSettings; sizes: StorageSize[]; bookings: StorageBooking[]; charges: StorageCharge[]; people: Person[]; stock: Stock[]; canFinance: boolean; canOps: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<'open' | 'all' | StorageBooking['status']>('open');
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [tiers, setTiers] = useState<DiscountTier[]>(settings.discount_tiers ?? []);
  const who = (id: string) => { const p = people.find((x) => x.id === id); return p ? `${p.business_name || p.full_name} · ${p.phone}` : '—'; };
  const num = (v: FormDataEntryValue | null) => { const s = String(v ?? '').replace(/[^0-9.]/g, ''); return s === '' ? null : Number(s); };
  async function run(p: PromiseLike<{ error: { message: string } | null; data?: unknown }>, ok: string) {
    const { error, data } = await p;
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: typeof data === 'number' ? ok.replace('{n}', String(data)) : ok });
    if (!error) router.refresh();
  }
  const shown = bookings.filter((b) => filter === 'all' ? true : filter === 'open' ? ['requested', 'quoted', 'accepted', 'active'].includes(b.status) : b.status === filter);
  const pending = charges.filter((c) => c.status === 'pending');

  return (
    <>
      {msg && <div role="status" className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`}>{msg.text}</div>}

      <details className="panel">
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Pricing &amp; sizes</summary>
        <form className="row" style={{ gap: 12, alignItems: 'flex-end', marginTop: 12 }} onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(supabase.from('auction_storage_settings').update({ rate_per_m3_usd: num(f.get('rate')), min_monthly_usd: num(f.get('min')) ?? 60, handling_fee_usd: num(f.get('handling')), usd_to_kes: num(f.get('fx')), vat: f.get('vat') === 'on', enabled: f.get('enabled') === 'on', updated_at: new Date().toISOString() }).eq('id', 1), 'Pricing saved.'); }}>
          <fieldset disabled={!canFinance} className="row" style={{ gap: 12, alignItems: 'flex-end', border: 0, padding: 0, margin: 0 }}>
            <label className="field" style={{ width: 170 }}>Price per m³ / month (USD)<input className="input" name="rate" defaultValue={settings.rate_per_m3_usd ?? ''} placeholder="not set" /></label>
            <label className="field" style={{ width: 160 }}>Minimum per month (USD)<input className="input" name="min" defaultValue={settings.min_monthly_usd} /></label>
            <label className="field" style={{ width: 170 }}>Handling in &amp; out (USD, once)<input className="input" name="handling" defaultValue={settings.handling_fee_usd ?? ''} placeholder="none" /></label>
            <label className="field" style={{ width: 150 }}>USD → KES rate<input className="input" name="fx" defaultValue={settings.usd_to_kes ?? ''} placeholder="needed for billing" /></label>
            <label className="check"><input type="checkbox" name="vat" defaultChecked={settings.vat} />Add 16% VAT</label>
            <label className="check"><input type="checkbox" name="enabled" defaultChecked={settings.enabled} />Taking requests</label>
            <button className="btn btn-primary" type="submit">Save pricing</button>
          </fieldset>
        </form>
        {!canFinance && <p className="small muted">Pricing is set by Finance or an owner.</p>}
        <p className="small muted">Monthly price = space in m³ × price per m³, less any volume discount, never less than the minimum{minVolume(settings) ? ` (= ${minVolume(settings)} m³)` : ''}. Update the exchange rate before each month&apos;s billing.</p>
        <h4 style={{ marginTop: 14 }}>Volume discounts</h4>
        <p className="small muted">The highest tier a booking&apos;s total space reaches applies to the whole booking.</p>
        <fieldset disabled={!canFinance} className="stack" style={{ gap: 6, border: 0, padding: 0, margin: 0 }}>
          {tiers.map((t, i) => (
            <div key={i} className="row" style={{ gap: 8, alignItems: 'center' }}>
              <span className="small">From</span>
              <input className="input" style={{ width: 90 }} inputMode="decimal" aria-label="From m³" value={t.from_m3 || ''} onChange={(e) => setTiers((x) => x.map((y, j) => (j === i ? { ...y, from_m3: parseFloat(e.target.value) || 0 } : y)))} />
              <span className="small">m³ →</span>
              <input className="input" style={{ width: 80 }} inputMode="decimal" aria-label="Discount %" value={t.pct || ''} onChange={(e) => setTiers((x) => x.map((y, j) => (j === i ? { ...y, pct: parseFloat(e.target.value) || 0 } : y)))} />
              <span className="small">% off</span>
              {settings.rate_per_m3_usd != null && t.from_m3 > 0 && <span className="small muted">= USD {usd(Number(settings.rate_per_m3_usd) * (1 - t.pct / 100))}/m³</span>}
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setTiers((x) => x.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <div className="row">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setTiers((x) => [...x, { from_m3: 0, pct: 0 }])}>+ Add tier</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => run(supabase.from('auction_storage_settings').update({ discount_tiers: tiers.filter((t) => t.from_m3 > 0 && t.pct > 0 && t.pct < 100).sort((a, b) => a.from_m3 - b.from_m3), updated_at: new Date().toISOString() }).eq('id', 1), 'Discounts saved.')}>Save discounts</button>
          </div>
        </fieldset>
        <h4 style={{ marginTop: 14 }}>Size presets in the calculator</h4>
        {sizes.map((s) => (
          <form key={s.id} className="row" style={{ gap: 8, alignItems: 'flex-end', padding: '6px 0' }} onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(supabase.from('auction_storage_sizes').update({ name: String(f.get('name')), length_m: num(f.get('l')), width_m: num(f.get('w')), height_m: num(f.get('h')), active: f.get('active') === 'on' }).eq('id', s.id), 'Size saved.'); }}>
            <fieldset disabled={!canOps} className="row" style={{ gap: 8, alignItems: 'flex-end', border: 0, padding: 0, margin: 0 }}>
              <input className="input" name="name" defaultValue={s.name} style={{ width: 260 }} aria-label="Name" />
              <input className="input" name="l" defaultValue={s.length_m} style={{ width: 70 }} aria-label="Length m" />×
              <input className="input" name="w" defaultValue={s.width_m} style={{ width: 70 }} aria-label="Width m" />×
              <input className="input" name="h" defaultValue={s.height_m} style={{ width: 70 }} aria-label="Height m" />
              <span className="small" style={{ width: 80 }}>{Number(s.volume_m3)} m³{settings.rate_per_m3_usd != null ? <><br />USD {usd(monthlyFor(Number(s.volume_m3), settings))}</> : null}</span>
              <label className="check small"><input type="checkbox" name="active" defaultChecked={s.active} />Shown</label>
              <button className="btn btn-outline btn-sm" type="submit">Save</button>
            </fieldset>
          </form>
        ))}
        {canOps && (
          <form className="row" style={{ gap: 8, alignItems: 'flex-end', paddingTop: 8 }} onSubmit={(e) => { e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); run(supabase.from('auction_storage_sizes').insert({ name: String(f.get('name')), length_m: num(f.get('l')), width_m: num(f.get('w')), height_m: num(f.get('h')), sort: 100 }), 'Size added.').then(() => form.reset()); }}>
            <input className="input" name="name" placeholder="New size name" required style={{ width: 260 }} />
            <input className="input" name="l" placeholder="L m" required style={{ width: 70 }} />×<input className="input" name="w" placeholder="W m" required style={{ width: 70 }} />×<input className="input" name="h" placeholder="H m" required style={{ width: 70 }} />
            <button className="btn btn-outline btn-sm" type="submit">Add size</button>
          </form>
        )}
      </details>

      {canFinance && (
        <section className="panel stack" style={{ gap: 8, border: pending.length ? '2px solid #F2C3A8' : undefined }}>
          <div className="row between">
            <h3>Storage bills to confirm ({pending.length})</h3>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => run(supabase.rpc('auction_storage_bill_due'), '{n} monthly bill(s) created.')}>Run this month&apos;s billing now</button>
          </div>
          {pending.length === 0 && <span className="small muted">No unpaid storage bills.</span>}
          {pending.map((c) => (
            <div key={c.id} className="row" style={{ gap: '8px 14px', padding: '6px 0', borderBottom: '1px solid #F0F2F4' }}>
              <span className="stack" style={{ gap: 2, flex: '1 1 300px' }}><b className="small">KES {kes(c.total_kes)} · {c.description}</b><span className="small muted">{who(c.user_id)} · ref {c.reference}</span></span>
              <input className="input" style={{ width: 170, height: 36 }} placeholder="M-Pesa / bank ref" aria-label="Payment reference" value={refs[c.id] ?? ''} onChange={(e) => setRefs((x) => ({ ...x, [c.id]: e.target.value }))} />
              <button type="button" className="btn btn-green btn-sm" onClick={() => run(supabase.rpc('auction_storage_confirm_charge', { p_charge: c.id, p_ref: refs[c.id] || null }), 'Payment confirmed.')}>Confirm paid</button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => run(supabase.from('auction_storage_charges').update({ status: 'cancelled' }).eq('id', c.id), 'Bill cancelled.')}>Cancel</button>
            </div>
          ))}
        </section>
      )}

      <section className="panel stack" style={{ gap: 8 }}>
        <div className="row between">
          <h3>Bookings</h3>
          <select className="input" style={{ width: 220 }} value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filter">
            <option value="open">Open</option><option value="all">All</option>
            {Object.entries(STORAGE_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        {shown.length === 0 && <span className="small muted">Nothing here.</span>}
        {shown.map((b) => {
          const [label, cls] = STORAGE_STATUS[b.status];
          const bc = charges.filter((c) => c.booking_id === b.id);
          const items = stock.filter((s) => s.storage_booking_id === b.id);
          const suggested = b.monthly_usd ?? monthlyFor(Number(b.volume_m3), settings) ?? b.est_monthly_usd ?? settings.min_monthly_usd;
          const disc = discountFor(Number(b.volume_m3), settings);
          return (
            <div key={b.id} className="card stack" style={{ padding: 14, gap: 8 }}>
              <div className="row between" style={{ cursor: 'pointer' }} onClick={() => setOpen(open === b.id ? null : b.id)}>
                <span className="stack" style={{ gap: 2 }}><b>{b.reference} · {who(b.user_id)}</b><span className="small muted">{b.items.length} item(s) · {Number(b.volume_m3)} m³{b.bay ? ` · bay ${b.bay}` : ''}{b.start_date ? ` · since ${new Date(b.start_date).toLocaleDateString('en-GB')}` : ''}</span></span>
                <span className="row" style={{ gap: 10 }}><b className="small">{b.monthly_usd != null ? `USD ${usd(b.monthly_usd)}/mo` : b.est_monthly_usd != null ? `est. USD ${usd(b.est_monthly_usd)}/mo` : ''}</b><span className={`pill ${cls}`}>{label}</span></span>
              </div>
              {open === b.id && (
                <div className="stack" style={{ gap: 10, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                  {b.items.map((it, i) => <span key={i} className="small">{it.qty} × {it.label} — {it.l} × {it.w} × {it.h} m = {Math.round(itemVolume(it) * 100) / 100} m³</span>)}
                  <span className="small muted">{[b.contact_phone, b.months_planned ? `~${b.months_planned} months` : null, b.wanted_from ? `from ${new Date(b.wanted_from).toLocaleDateString('en-GB')}` : null, b.viewing_allowed ? 'viewing allowed' : 'no viewing'].filter(Boolean).join(' · ')}</span>
                  {b.notes && <span className="small">{b.notes}</span>}
                  {canOps && ['requested', 'quoted'].includes(b.status) && (
                    <form className="row" style={{ gap: 8, alignItems: 'flex-end' }} onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(supabase.rpc('auction_storage_send_quote', { p_booking: b.id, p_monthly_usd: num(f.get('monthly')), p_handling_usd: num(f.get('handling')) ?? 0, p_note: String(f.get('note') ?? '') }), 'Quote sent — the customer gets an alert.'); }}>
                      <label className="field" style={{ width: 160 }}>Monthly (USD){disc > 0 ? ` · ${disc}% off incl.` : ''}<input className="input" name="monthly" defaultValue={suggested ?? ''} required /></label>
                      <label className="field" style={{ width: 160 }}>Handling (USD, once)<input className="input" name="handling" defaultValue={b.handling_usd || settings.handling_fee_usd || ''} /></label>
                      <label className="field" style={{ flex: '1 1 220px' }}>Note to customer<input className="input" name="note" defaultValue={b.admin_note ?? ''} placeholder="e.g. covered bay, delivery Tue 9am" /></label>
                      <button className="btn btn-primary btn-sm" type="submit">{b.status === 'quoted' ? 'Re-send quote' : 'Send quote'}</button>
                      <button className="btn btn-outline btn-sm" type="button" onClick={() => { const why = window.prompt('Reason shown to the customer:'); if (why !== null) run(supabase.from('auction_storage_bookings').update({ status: 'declined', admin_note: why || null }).eq('id', b.id), 'Declined.'); }}>Decline</button>
                    </form>
                  )}
                  {canOps && ['accepted', 'quoted'].includes(b.status) && (
                    <form className="row" style={{ gap: 8, alignItems: 'flex-end' }} onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(supabase.rpc('auction_storage_activate', { p_booking: b.id, p_start: String(f.get('start') || '') || null, p_bay: String(f.get('bay') ?? '') }), 'Storage started — first bills created.'); }}>
                      <label className="field" style={{ width: 170 }}>Items arrived on<input className="input" type="date" name="start" defaultValue={new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10)} /></label>
                      <label className="field" style={{ width: 140 }}>Bay<input className="input" name="bay" defaultValue={b.bay ?? ''} /></label>
                      <button className="btn btn-green btn-sm" type="submit">{b.status === 'quoted' ? 'Start storage (customer agreed by phone)' : 'Start storage'}</button>
                    </form>
                  )}
                  {canOps && b.status === 'active' && (
                    <form className="row" style={{ gap: 8, alignItems: 'flex-end' }} onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); if (window.confirm('End this storage? Bills for later months are cancelled.')) run(supabase.rpc('auction_storage_end', { p_booking: b.id, p_end: String(f.get('end') || '') || null }), 'Storage ended.'); }}>
                      <label className="field" style={{ width: 140 }}>Bay<input className="input" defaultValue={b.bay ?? ''} onBlur={(e) => e.target.value !== (b.bay ?? '') && run(supabase.from('auction_storage_bookings').update({ bay: e.target.value || null }).eq('id', b.id), 'Bay saved.')} /></label>
                      <label className="field" style={{ width: 170 }}>Items left on<input className="input" type="date" name="end" defaultValue={new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10)} /></label>
                      <button className="btn btn-outline btn-sm" type="submit">End storage</button>
                    </form>
                  )}
                  {items.length > 0 && <span className="small">Yard stock: {items.map((s) => `${s.ref} ${s.title} (${s.status})`).join(', ')}</span>}
                  {bc.length > 0 && (
                    <div className="stack" style={{ gap: 2 }}>
                      <b className="small">Bills</b>
                      {bc.map((c) => <span key={c.id} className="small">{c.description} · KES {kes(c.total_kes)} · <span className={c.status === 'paid' ? '' : 'muted'}>{c.status}</span></span>)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </>
  );
}
