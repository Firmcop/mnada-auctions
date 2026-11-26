'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { kes } from '@/lib/format';
import { SETTLE_LABEL, type Payout, type Settlement } from '@/lib/settlements';

type Settings = { release_rule: 'collection' | 'days' | 'instant'; release_days: number; vat_on_fees: boolean; provider: string } | null;
type Row = Settlement & { auction_lots: { lot_no: number; title: string } | null };

export default function PayoutsAdmin({ settings, settlements, payouts, names }: { settings: Settings; settlements: Row[]; payouts: Payout[]; names: Record<string, string> }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [filter, setFilter] = useState<Settlement['status'] | 'all'>('released');
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [rule, setRule] = useState(settings?.release_rule ?? 'collection');
  const payee = (s: { seller_id: string | null; auctioneer_id: string | null; payee_kind: string }) => names[(s.payee_kind === 'seller' ? s.seller_id : s.auctioneer_id) ?? ''] ?? '—';
  async function run(p: PromiseLike<{ error: { message: string } | null; data?: unknown }>, ok: string) {
    const { error, data } = await p;
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: typeof data === 'number' ? ok.replace('{n}', String(data)) : ok });
    if (!error) router.refresh();
  }
  const rows = settlements.filter((s) => filter === 'all' || s.status === filter);
  const releasedUnbatched = settlements.filter((s) => s.status === 'released' && !s.payout_id);
  const pending = payouts.filter((p) => p.status === 'pending');

  return (
    <>
      {msg && <div role="status" className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`}>{msg.text}</div>}

      <form className="panel row" style={{ gap: 12, alignItems: 'flex-end' }} onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(supabase.from('auction_payout_settings').update({ release_rule: rule, release_days: Number(f.get('days') || 7), vat_on_fees: f.get('vat') === 'on', updated_at: new Date().toISOString() }).eq('id', 1), 'Settings saved — applies to new payments.'); }}>
        <label className="field" style={{ width: 280 }}>Release sellers&apos; money
          <select className="input" value={rule} onChange={(e) => setRule(e.target.value as typeof rule)}>
            <option value="collection">When the buyer collects (recommended)</option>
            <option value="days">A set number of days after payment</option>
            <option value="instant">Immediately when the buyer pays</option>
          </select>
        </label>
        {rule === 'days' && <label className="field" style={{ width: 120 }}>Days<input className="input" name="days" type="number" min={0} max={90} defaultValue={settings?.release_days ?? 7} /></label>}
        <label className="check"><input type="checkbox" name="vat" defaultChecked={settings?.vat_on_fees ?? true} />Charge 16% VAT on commission and success fees</label>
        <button className="btn btn-primary" type="submit">Save</button>
        <span className="small muted" style={{ flexBasis: '100%' }}>Payment provider: <b>{settings?.provider === 'manual' ? 'manual (you pay by M-Pesa / bank and record the reference)' : settings?.provider}</b>. Automatic split payouts switch on when the provider account is connected.</span>
      </form>

      <section className="panel stack" style={{ gap: 10, border: pending.length || releasedUnbatched.length ? '2px solid #F2C3A8' : undefined }}>
        <div className="row between">
          <h3>Payouts to make</h3>
          <button type="button" className="btn btn-primary btn-sm" disabled={releasedUnbatched.length === 0} onClick={() => run(supabase.rpc('auction_create_payouts'), '{n} payout(s) prepared.')}>
            Prepare payouts ({releasedUnbatched.length} released lot{releasedUnbatched.length === 1 ? '' : 's'})
          </button>
        </div>
        {pending.length === 0 && <span className="small muted">Nothing to pay right now.</span>}
        {pending.map((p) => (
          <div key={p.id} className="row" style={{ gap: '8px 14px', padding: '8px 0', borderBottom: '1px solid #F0F2F4' }}>
            <span className="stack" style={{ gap: 2, flex: '1 1 300px' }}>
              <b>KES {kes(p.amount_kes)} → {payee(p)} <span className="small muted">({p.payee_kind})</span></b>
              <span className="small">{p.method === 'mpesa' ? 'M-Pesa' : 'Bank'}: <b>{p.details ?? 'no payout details — ask the payee'}</b> · ref {p.reference} · {settlements.filter((s) => s.payout_id === p.id).length} lot(s)</span>
            </span>
            <input className="input" style={{ width: 180, height: 36 }} placeholder="M-Pesa / bank ref" aria-label="Payment reference" value={refs[p.id] ?? ''} onChange={(e) => setRefs((x) => ({ ...x, [p.id]: e.target.value }))} />
            <button type="button" className="btn btn-green btn-sm" onClick={() => { if (window.confirm(`Mark KES ${kes(p.amount_kes)} to ${payee(p)} as paid?`)) run(supabase.rpc('auction_payout_mark_paid', { p_payout: p.id, p_ref: refs[p.id] || null }), 'Marked paid.'); }}>Mark paid</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => run(supabase.rpc('auction_payout_cancel', { p_payout: p.id }), 'Payout cancelled — lots back to released.')}>Cancel</button>
          </div>
        ))}
      </section>

      <section className="panel stack" style={{ gap: 10 }}>
        <div className="row between">
          <h3>Sales split by lot</h3>
          <select className="input" style={{ width: 240 }} value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filter">
            <option value="all">All</option>
            {(Object.keys(SETTLE_LABEL) as Settlement['status'][]).filter((k) => k !== 'cancelled').map((k) => <option key={k} value={k}>{SETTLE_LABEL[k][0]}</option>)}
          </select>
        </div>
        <div className="scroll-x">
          <table className="data" style={{ minWidth: 900 }}>
            <thead><tr><th>Lot</th><th>Payee</th><th style={{ textAlign: 'right' }}>Due to payee (gross)</th><th style={{ textAlign: 'right' }}>Mnada fee</th><th style={{ textAlign: 'right' }}>VAT on fee</th><th style={{ textAlign: 'right' }}>Listing Help</th><th style={{ textAlign: 'right' }}>Net payout</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td><Link href={`/lots/${s.lot_id}`}>Lot {s.auction_lots?.lot_no} · {s.auction_lots?.title}</Link></td>
                  <td className="small">{payee(s)}<div className="muted">{s.payee_kind}</div></td>
                  <td style={{ textAlign: 'right' }}>{kes(s.gross_kes)}</td>
                  <td style={{ textAlign: 'right' }}>{kes(s.fee_kes)}<div className="small muted">{Number(s.fee_pct)}%</div></td>
                  <td style={{ textAlign: 'right' }}>{kes(s.fee_vat_kes)}</td>
                  <td style={{ textAlign: 'right' }}>{Number(s.help_deduction_kes) ? kes(s.help_deduction_kes) : '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{kes(s.net_kes)}</td>
                  <td><span className={`pill ${SETTLE_LABEL[s.status][1]}`}>{SETTLE_LABEL[s.status][0]}</span>{s.release_at && s.status === 'held' && <div className="small muted">releases {new Date(s.release_at).toLocaleDateString('en-GB')}</div>}</td>
                  <td>{!s.payout_id && s.status !== 'paid' && <button type="button" className="btn btn-outline btn-sm" title="Recalculate after changing rates" onClick={() => run(supabase.rpc('auction_settlement_rebuild', { p_settlement: s.id }), 'Recalculated.')}>Recalc</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <span className="small muted">Nothing here.</span>}
      </section>

      <section className="panel stack" style={{ gap: 0 }}>
        <h3 style={{ marginBottom: 8 }}>Payout history</h3>
        {payouts.filter((p) => p.status !== 'pending').length === 0 && <span className="small muted">None yet.</span>}
        {payouts.filter((p) => p.status !== 'pending').map((p) => (
          <div key={p.id} className="row between small" style={{ padding: '6px 0', borderBottom: '1px solid #F0F2F4' }}>
            <span>{p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-GB') : new Date(p.created_at).toLocaleDateString('en-GB')} · {payee(p)}</span>
            <span>{p.reference}{p.payment_ref ? ` · ${p.payment_ref}` : ''}</span>
            <b>KES {kes(p.amount_kes)}</b>
            <span className={`pill ${p.status === 'paid' ? 'pill-green' : 'pill-grey'}`}>{p.status}</span>
          </div>
        ))}
      </section>
    </>
  );
}
