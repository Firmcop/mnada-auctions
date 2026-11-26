'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { kes } from '@/lib/format';

type Settings = { enabled: boolean; markup_pct: number; usd_to_kes: number | null; min_charge_kes: number; staff_billing: 'internal' | 'charged'; low_balance_kes: number } | null;
type Price = { model: string; input_usd_per_mtok: number; output_usd_per_mtok: number };
type Plan = { id: string; name: string; kind: 'one_off' | 'monthly'; price_kes: number | null; included_credit_kes: number; description: string | null; active: boolean; sort: number };
type Payment = { id: string; reference: string; user_id: string; purpose: string; amount_kes: number; status: string; payment_ref: string | null; created_at: string };
type Person = { id: string; full_name: string; business_name: string | null; phone: string };
type Account = { user_id: string; status: string; balance_kes: number; expires_at: string | null };

export default function AiAdmin({ settings, prices, plans, payments, people, accounts }: { settings: Settings; prices: Price[]; plans: Plan[]; payments: Payment[]; people: Person[]; accounts: Account[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [refs, setRefs] = useState<Record<string, string>>({});
  const who = (id: string) => { const p = people.find((x) => x.id === id); return p ? `${p.business_name || p.full_name} · ${p.phone}` : id.slice(0, 8); };
  const done = (error: { message: string } | null, ok = 'Saved.') => { setMsg(error ? { ok: false, text: error.message } : { ok: true, text: ok }); if (!error) router.refresh(); };

  async function saveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const n = (k: string) => (String(f.get(k) ?? '').trim() === '' ? null : Number(f.get(k)));
    const enabled = f.get('enabled') === 'on';
    if (enabled && !window.confirm('Switch AI tools on for users? Make sure the AI API key, exchange rate and model prices are in place.')) return;
    const { error } = await supabase.from('auction_ai_settings').update({
      enabled, markup_pct: n('markup_pct') ?? 25, usd_to_kes: n('usd_to_kes'), min_charge_kes: n('min_charge_kes') ?? 1,
      staff_billing: String(f.get('staff_billing')), low_balance_kes: n('low_balance_kes') ?? 100, updated_at: new Date().toISOString(),
    }).eq('id', 1);
    done(error);
  }
  async function savePrice(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from('auction_ai_model_prices').upsert({ model: String(f.get('model')).trim(), input_usd_per_mtok: Number(f.get('in')), output_usd_per_mtok: Number(f.get('out')), updated_at: new Date().toISOString() });
    done(error);
    if (!error) e.currentTarget.reset();
  }
  async function delPrice(model: string) { const { error } = await supabase.from('auction_ai_model_prices').delete().eq('model', model); done(error, 'Removed.'); }
  async function savePlan(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const price = String(f.get('price')).replace(/[^0-9.]/g, '');
    const { error } = await supabase.from('auction_ai_plans').update({
      name: String(f.get('name')), price_kes: price ? Number(price) : null, included_credit_kes: Number(String(f.get('credit')).replace(/[^0-9.]/g, '') || 0),
      description: String(f.get('description') || '') || null, active: f.get('active') === 'on',
    }).eq('id', id);
    done(error);
  }
  async function confirm(p: Payment) {
    if (!window.confirm(`Confirm KES ${kes(p.amount_kes)} received from ${who(p.user_id)} (ref ${p.reference})?`)) return;
    const { error } = await supabase.rpc('auction_ai_confirm_payment', { p_payment: p.id, p_payment_ref: refs[p.id] || null });
    done(error, 'Payment confirmed.');
  }
  async function cancel(p: Payment) { const { error } = await supabase.from('auction_ai_payments').update({ status: 'cancelled' }).eq('id', p.id); done(error, 'Cancelled.'); }

  const pending = payments.filter((p) => p.status === 'pending');
  return (
    <>
      {msg && <div role="status" className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`}>{msg.text}</div>}

      <section className="panel stack" style={{ gap: 10, border: pending.length ? '2px solid #F2C3A8' : undefined }}>
        <h3>Payments to confirm ({pending.length})</h3>
        <span className="small muted">Users pay by Paybill using the reference as the account number. Confirm once the money shows in M-Pesa / the bank. (Automatic once M-Pesa is connected.)</span>
        {pending.length === 0 && <span className="small muted">None waiting.</span>}
        {pending.map((p) => (
          <div key={p.id} className="row" style={{ gap: '8px 16px', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
            <span className="stack" style={{ gap: 2, flex: '1 1 280px' }}>
              <b>{p.purpose === 'activation' ? 'Activation' : 'Top-up'} · KES {kes(p.amount_kes)} · ref {p.reference}</b>
              <span className="small muted">{who(p.user_id)} · {new Date(p.created_at).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi' })}</span>
            </span>
            <input className="input" style={{ width: 180, height: 38 }} placeholder="M-Pesa code (optional)" aria-label="M-Pesa transaction code" value={refs[p.id] ?? ''} onChange={(e) => setRefs((r) => ({ ...r, [p.id]: e.target.value }))} />
            <button type="button" className="btn btn-green btn-sm" onClick={() => confirm(p)}>Confirm paid</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => cancel(p)}>Cancel</button>
          </div>
        ))}
      </section>

      <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
        <form onSubmit={saveSettings} className="panel stack" style={{ gap: 12, flex: '1 1 360px' }}>
          <h3>Pricing settings</h3>
          <label className="check"><input type="checkbox" name="enabled" defaultChecked={settings?.enabled} />AI tools switched on for users</label>
          <div className="grid2" style={{ gap: 10 }}>
            <label className="field">Markup on AI cost (%)<input className="input" name="markup_pct" type="number" step="0.5" min="0" max="200" defaultValue={settings?.markup_pct ?? 25} /></label>
            <label className="field">USD → KES rate<input className="input" name="usd_to_kes" type="number" step="0.01" placeholder="set today's rate" defaultValue={settings?.usd_to_kes ?? ''} /></label>
            <label className="field">Minimum charge per action (KES)<input className="input" name="min_charge_kes" type="number" step="0.5" min="0" defaultValue={settings?.min_charge_kes ?? 1} /></label>
            <label className="field">Low-balance warning (KES)<input className="input" name="low_balance_kes" type="number" min="0" defaultValue={settings?.low_balance_kes ?? 100} /></label>
          </div>
          <label className="field">Staff (admin) AI use
            <select className="input" name="staff_billing" defaultValue={settings?.staff_billing ?? 'internal'}>
              <option value="internal">Free for staff — cost logged as internal</option>
              <option value="charged">Charged like any user</option>
            </select>
          </label>
          <span className="small muted">Charge per action = (input tokens × input price + output tokens × output price) × USD→KES × (1 + markup). Your plan: 25–30%.</span>
          <button className="btn btn-primary" type="submit" style={{ alignSelf: 'flex-start' }}>Save settings</button>
        </form>

        <section className="panel stack" style={{ gap: 10, flex: '1 1 360px' }}>
          <h3>Model prices (USD per million tokens)</h3>
          <span className="small muted">Copy these from the AI provider&apos;s current price list when the API is connected.</span>
          {prices.length === 0 && <span className="small muted">None yet.</span>}
          {prices.map((p) => (
            <div key={p.model} className="row between small" style={{ padding: '6px 0', borderBottom: '1px solid #F0F2F4' }}>
              <b>{p.model}</b><span>in ${p.input_usd_per_mtok} · out ${p.output_usd_per_mtok}</span>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => delPrice(p.model)}>Remove</button>
            </div>
          ))}
          <form onSubmit={savePrice} className="row" style={{ alignItems: 'flex-end', gap: 8 }}>
            <label className="field" style={{ flex: '2 1 160px' }}>Model id<input className="input" name="model" required /></label>
            <label className="field" style={{ flex: '1 1 90px' }}>Input $<input className="input" name="in" type="number" step="0.001" required /></label>
            <label className="field" style={{ flex: '1 1 90px' }}>Output $<input className="input" name="out" type="number" step="0.001" required /></label>
            <button className="btn btn-outline" type="submit">Save</button>
          </form>
        </section>
      </div>

      <section className="panel stack" style={{ gap: 14 }}>
        <h3>Activation plans</h3>
        <div className="grid2">
          {plans.map((p) => (
            <form key={p.id} onSubmit={(e) => savePlan(e, p.id)} className="card stack" style={{ padding: 16, gap: 10 }}>
              <span className="eyebrow">{p.kind === 'monthly' ? 'Monthly' : 'One-off (lifetime)'}</span>
              <label className="field">Name<input className="input" name="name" defaultValue={p.name} /></label>
              <div className="grid2" style={{ gap: 8 }}>
                <label className="field">Price (KES)<input className="input" name="price" inputMode="numeric" defaultValue={p.price_kes ?? ''} placeholder="set price" /></label>
                <label className="field">Included AI credit (KES)<input className="input" name="credit" inputMode="numeric" defaultValue={p.included_credit_kes} /></label>
              </div>
              <label className="field">Description<textarea className="input" name="description" rows={2} defaultValue={p.description ?? ''} /></label>
              <label className="check"><input type="checkbox" name="active" defaultChecked={p.active} />Offered to users</label>
              <button className="btn btn-outline btn-sm" type="submit" style={{ alignSelf: 'flex-start' }}>Save plan</button>
            </form>
          ))}
        </div>
      </section>

      <section className="panel stack" style={{ gap: 0 }}>
        <h3 style={{ marginBottom: 8 }}>AI accounts</h3>
        {accounts.length === 0 && <span className="small muted">No activations yet.</span>}
        {accounts.map((a) => (
          <div key={a.user_id} className="row between small" style={{ padding: '8px 0', borderBottom: '1px solid #F0F2F4' }}>
            <span>{who(a.user_id)}</span>
            <span className={`pill ${a.status === 'active' ? 'pill-green' : 'pill-grey'}`}>{a.status}{a.expires_at ? ` · to ${new Date(a.expires_at).toLocaleDateString('en-GB')}` : ''}</span>
            <b>KES {kes(a.balance_kes)}</b>
          </div>
        ))}
      </section>
    </>
  );
}
