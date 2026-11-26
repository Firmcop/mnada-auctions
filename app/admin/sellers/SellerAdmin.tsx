'use client';
import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/supabase/server';

const TABS = [['pending', 'Applications'], ['approved', 'Active sellers'], ['suspended', 'Suspended'], ['rejected', 'Rejected']] as const;

export default function SellerAdmin({ initial }: { initial: Profile[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState(initial);
  const [tab, setTab] = useState<string>('pending');
  const [rates, setRates] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  async function update(p: Profile, patch: Partial<Profile>) {
    setErr(null);
    const { error } = await supabase.from('auction_profiles').update(patch).eq('id', p.id);
    if (error) { setErr(error.message); return; }
    setRows((rs) => rs.map((r) => (r.id === p.id ? { ...r, ...patch } : r)));
  }

  const shown = rows.filter((r) => r.seller_status === tab);
  return (
    <>
      <div className="row" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={`btn btn-sm ${tab === id ? 'btn-dark' : 'btn-outline'}`} onClick={() => setTab(id)}>
            {label} ({rows.filter((r) => r.seller_status === id).length})
          </button>
        ))}
      </div>
      {err && <div className="alert alert-err">{err}</div>}
      <section className="panel stack" style={{ gap: 0 }}>
        {shown.length === 0 && <p className="small muted">Nobody here.</p>}
        {shown.map((p) => (
          <div key={p.id} className="row" style={{ padding: '16px 0', borderBottom: '1px solid var(--line)', alignItems: 'flex-start', gap: '10px 24px' }}>
            <div className="stack" style={{ gap: 3, flex: '2 1 300px' }}>
              <b>{p.business_name}</b>
              <span className="small">{p.full_name} · {p.phone} · {p.email}</span>
              {p.business_description && <span className="small" style={{ color: 'var(--body)' }}>{p.business_description}</span>}
              <span className="small muted">{p.business_location} · payout by {p.payout_method === 'bank' ? 'bank' : 'M-Pesa'}: {p.payout_details}</span>
              <span className="small">Identity check: <span className={`pill ${p.status === 'approved' ? 'pill-green' : 'pill-warn'}`}>{p.status === 'approved' ? 'verified' : 'not verified yet'}</span></span>
            </div>
            <label className="field" style={{ flex: '0 1 140px' }}>Commission %
              <input className="input" inputMode="decimal" value={rates[p.id] ?? String(p.commission_pct)} onChange={(e) => setRates((r) => ({ ...r, [p.id]: e.target.value }))} />
            </label>
            <div className="row" style={{ alignSelf: 'flex-end' }}>
              {p.seller_status !== 'approved' && <button type="button" className="btn btn-green" onClick={() => update(p, { seller_status: 'approved', commission_pct: Number(rates[p.id] ?? p.commission_pct), seller_approved_at: new Date().toISOString() } as Partial<Profile>)}>Approve seller</button>}
              {p.seller_status === 'approved' && <button type="button" className="btn btn-outline" onClick={() => update(p, { commission_pct: Number(rates[p.id] ?? p.commission_pct) })}>Save rate</button>}
              {p.seller_status === 'pending' && <button type="button" className="btn btn-outline" onClick={() => update(p, { seller_status: 'rejected' })}>Reject</button>}
              {p.seller_status === 'approved' && <button type="button" className="btn btn-outline" style={{ color: 'var(--warn)' }} onClick={() => update(p, { seller_status: 'suspended' })}>Suspend</button>}
              {p.seller_status === 'suspended' && <button type="button" className="btn btn-outline" onClick={() => update(p, { seller_status: 'approved' })}>Reinstate</button>}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
