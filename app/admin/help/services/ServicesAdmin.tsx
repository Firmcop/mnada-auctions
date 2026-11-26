'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UNIT_LABEL, type HelpService, type HelpSettings, type HelpUnit } from '@/lib/help';

export default function ServicesAdmin({ services, settings }: { services: HelpService[]; settings: HelpSettings }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const done = (error: { message: string } | null, ok = 'Saved.') => { setMsg(error ? { ok: false, text: error.message } : { ok: true, text: ok }); if (!error) router.refresh(); };
  const num = (v: FormDataEntryValue | null) => { const s = String(v ?? '').replace(/[^0-9.]/g, ''); return s === '' ? null : Number(s); };

  async function saveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await createClient().from('auction_help_settings').update({ vat_pct: num(f.get('vat_pct')) ?? 16, deposit_pct: num(f.get('deposit_pct')) ?? 50, free_km: num(f.get('free_km')) ?? 0, updated_at: new Date().toISOString() }).eq('id', 1);
    done(error);
  }
  async function save(e: React.FormEvent<HTMLFormElement>, code: string | null) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const row = {
      name: String(f.get('name')).trim(), description: String(f.get('description') ?? '').trim() || null, unit: String(f.get('unit')) as HelpUnit,
      price_kes: num(f.get('price_kes')), min_charge_kes: num(f.get('min_charge_kes')) ?? 0, vat: f.get('vat') === 'on',
      allow_from_proceeds: f.get('allow_from_proceeds') === 'on', offered: f.get('offered') === 'on', sort: num(f.get('sort')) ?? 0,
      includes: String(f.get('includes') ?? '').split(',').map((s) => s.trim()).filter(Boolean), updated_at: new Date().toISOString(),
    };
    const supabase = createClient();
    const { error } = code
      ? await supabase.from('auction_help_services').update(row).eq('code', code)
      : await supabase.from('auction_help_services').insert({ ...row, code: String(f.get('code')).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') });
    done(error);
    if (!error && !code) e.currentTarget.reset();
  }

  const form = (s: HelpService | null) => (
    <form key={s?.code ?? 'new'} onSubmit={(e) => save(e, s?.code ?? null)} className="card stack" style={{ padding: 16, gap: 10 }}>
      <div className="row between"><b>{s ? s.name : 'Add a service'}</b>{s && <span className="small muted">code: {s.code}</span>}</div>
      {!s && <label className="field">Code (short id)<input className="input" name="code" required placeholder="e.g. loading" /></label>}
      <div className="grid2" style={{ gap: 8 }}>
        <label className="field">Name<input className="input" name="name" required defaultValue={s?.name} /></label>
        <label className="field">Charged
          <select className="input" name="unit" defaultValue={s?.unit ?? 'per_lot'}>
            {(Object.keys(UNIT_LABEL) as HelpUnit[]).map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}
          </select>
        </label>
        <label className="field">Price (KES, excl. VAT)<input className="input" name="price_kes" inputMode="decimal" defaultValue={s?.price_kes ?? ''} placeholder="blank = quote on review" /></label>
        <label className="field">Minimum charge (KES)<input className="input" name="min_charge_kes" inputMode="decimal" defaultValue={s?.min_charge_kes ?? 0} /></label>
      </div>
      <label className="field">Description shown to customers<textarea className="input" name="description" rows={2} defaultValue={s?.description ?? ''} /></label>
      <div className="grid2" style={{ gap: 8 }}>
        <label className="field">Bundle of (codes, comma separated)<input className="input" name="includes" defaultValue={s?.includes.join(', ') ?? ''} placeholder="leave blank if not a bundle" /></label>
        <label className="field">Display order<input className="input" name="sort" type="number" defaultValue={s?.sort ?? 100} /></label>
      </div>
      <div className="row" style={{ gap: 16 }}>
        <label className="check"><input type="checkbox" name="vat" defaultChecked={s?.vat ?? true} />VAT applies</label>
        <label className="check"><input type="checkbox" name="allow_from_proceeds" defaultChecked={s?.allow_from_proceeds ?? true} />Can be deducted from sale proceeds</label>
        <label className="check"><input type="checkbox" name="offered" defaultChecked={s?.offered ?? true} />Offered to customers</label>
      </div>
      <button className="btn btn-outline btn-sm" type="submit" style={{ alignSelf: 'flex-start' }}>{s ? 'Save' : 'Add service'}</button>
    </form>
  );

  return (
    <>
      {msg && <div role="status" className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`}>{msg.text}</div>}
      <form onSubmit={saveSettings} className="panel row" style={{ gap: 12, alignItems: 'flex-end' }}>
        <label className="field" style={{ width: 140 }}>VAT %<input className="input" name="vat_pct" defaultValue={settings.vat_pct} /></label>
        <label className="field" style={{ width: 180 }}>Deposit % (pay upfront)<input className="input" name="deposit_pct" defaultValue={settings.deposit_pct} /></label>
        <label className="field" style={{ width: 200 }}>Free travel radius (km)<input className="input" name="free_km" defaultValue={settings.free_km} /></label>
        <button className="btn btn-primary" type="submit">Save</button>
      </form>
      <span className="small muted">“Pay upfront” customers pay the deposit % when accepting, the rest on completion. “From proceeds” customers pay only the services that can&apos;t be deducted (e.g. survey, travel) upfront.</span>
      <div className="grid2">{services.map((s) => form(s))}{form(null)}</div>
    </>
  );
}
