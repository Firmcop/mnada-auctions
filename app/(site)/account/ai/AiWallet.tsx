'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { kes } from '@/lib/format';
import type { AiStatus } from './page';

type Plan = { id: string; name: string; kind: 'one_off' | 'monthly'; price_kes: number | null; included_credit_kes: number; description: string | null };
type Payment = { id: string; reference: string; purpose: string; amount_kes: number; status: string; created_at: string; plan_id: string | null };

export default function AiWallet({ status, plans, payments, userId }: { status: AiStatus; plans: Plan[]; payments: Payment[]; userId: string }) {
  const router = useRouter();
  const [topup, setTopup] = useState(500);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = payments.filter((p) => p.status === 'pending');

  async function request(body: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    const { error } = await createClient().from('auction_ai_payments').insert({ user_id: userId, ...body });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.refresh();
  }
  async function cancel(id: string) {
    await createClient().from('auction_ai_payments').update({ status: 'cancelled' }).eq('id', id);
    router.refresh();
  }

  if (status.staff_internal) return null;
  return (
    <>
      {pending.length > 0 && (
        <section className="panel stack" style={{ gap: 10, border: '2px solid #F2C3A8' }}>
          <h3>Waiting for your payment</h3>
          {pending.map((p) => (
            <div key={p.id} className="row" style={{ gap: '8px 18px', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <span className="stack" style={{ gap: 2, flex: '1 1 300px' }}>
                <b>{p.purpose === 'activation' ? 'Activation' : 'Top-up'} · KES {kes(p.amount_kes)}</b>
                <span className="small">M-Pesa: Lipa na M-Pesa › Pay Bill › Business no. <b>[PAYBILL]</b> › Account no. <b>{p.reference}</b></span>
                <span className="small muted">Your AI tools switch on / balance updates as soon as we confirm the payment.</span>
              </span>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => cancel(p.id)}>Cancel</button>
            </div>
          ))}
        </section>
      )}
      {!status.active && (
        <section className="stack" style={{ gap: 12 }}>
          <h2 style={{ fontSize: 22 }}>Activate AI tools</h2>
          {plans.length === 0 && <p className="small muted">Plans will appear here when AI tools launch.</p>}
          <div className="grid2">
            {plans.map((p) => (
              <div key={p.id} className="card stack" style={{ padding: 20, gap: 8 }}>
                <span className="eyebrow">{p.kind === 'monthly' ? 'Monthly' : 'Pay once'}</span>
                <b style={{ fontSize: 18 }}>{p.name}</b>
                <span className="price">KES {kes(p.price_kes)}{p.kind === 'monthly' ? <span className="small muted"> / month</span> : null}</span>
                {p.included_credit_kes > 0 && <span className="small" style={{ color: 'var(--green)', fontWeight: 600 }}>Includes KES {kes(p.included_credit_kes)} of AI usage</span>}
                {p.description && <span className="small" style={{ color: 'var(--body)' }}>{p.description}</span>}
                <button type="button" className="btn btn-primary" disabled={busy || !status.enabled || pending.some((x) => x.purpose === 'activation')}
                  onClick={() => request({ purpose: 'activation', plan_id: p.id, amount_kes: p.price_kes })}>Activate</button>
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="panel stack" style={{ gap: 10 }}>
        <h3>Top up AI balance</h3>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          {[200, 500, 1000, 2500].map((v) => (
            <button key={v} type="button" className={`btn btn-sm ${topup === v ? 'btn-dark' : 'btn-outline'}`} onClick={() => setTopup(v)}>KES {kes(v)}</button>
          ))}
          <label className="field" style={{ width: 160 }}>Other amount
            <input className="input" inputMode="numeric" value={topup ? kes(topup) : ''} onChange={(e) => setTopup(parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0)} />
          </label>
          <button type="button" className="btn btn-primary" disabled={busy || topup < 100 || !status.enabled} onClick={() => request({ purpose: 'topup', amount_kes: topup })}>Top up</button>
        </div>
        <span className="small muted">Minimum KES 100.</span>
      </section>
      {err && <div role="alert" className="alert alert-err">{err}</div>}
    </>
  );
}
