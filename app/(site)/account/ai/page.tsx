import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import { kes } from '@/lib/format';
import AiWallet from './AiWallet';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'AI tools' };

export type AiStatus = { enabled: boolean; staff_internal: boolean; active: boolean; balance_kes: number; expires_at: string | null; plan_id: string | null };

export default async function AiPage() {
  const { supabase, user } = await getSession();
  if (!user) redirect('/login?next=/account/ai');
  const [{ data: status }, { data: plans }, { data: payments }, { data: ledger }] = await Promise.all([
    supabase.rpc('auction_ai_status'),
    supabase.from('auction_ai_plans').select('*').eq('active', true).order('sort'),
    supabase.from('auction_ai_payments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('auction_ai_ledger').select('id, kind, amount_kes, balance_after, action, note, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
  ]);
  const st = (status ?? { enabled: false, staff_internal: false, active: false, balance_kes: 0, expires_at: null, plan_id: null }) as AiStatus;

  return (
    <div className="wrap section stack" style={{ maxWidth: 900, gap: 20 }}>
      <div className="stack" style={{ gap: 6 }}>
        <h1>AI tools</h1>
        <p style={{ color: 'var(--body)' }}>Let AI write listing titles, descriptions, specifications and search text from your photos and notes, translate listings to Swahili, and draft replies to buyers. You review everything before it&apos;s published.</p>
      </div>
      {!st.enabled && <div className="alert alert-info">AI tools are launching soon. You can see the plans below; activation opens when the tools go live.</div>}
      {st.staff_internal && <div className="alert alert-ok">As Mnada staff, your AI use is covered by the company — no activation or balance needed.</div>}
      <div className="kpis">
        <div className="kpi"><span className="eyebrow">Status</span><b style={{ fontSize: 22 }}>{st.active ? 'Active' : 'Not active'}</b>{st.expires_at && <span className="small muted">renews / expires {new Date(st.expires_at).toLocaleDateString('en-GB')}</span>}</div>
        <div className="kpi"><span className="eyebrow">AI balance</span><b>KES {kes(st.balance_kes)}</b><span className="small muted">used as you go</span></div>
      </div>
      <AiWallet status={st} plans={plans ?? []} payments={payments ?? []} userId={user.id} />
      <section className="panel stack" style={{ gap: 6 }}>
        <h3>How AI billing works</h3>
        <ul className="small" style={{ margin: 0, paddingLeft: 20, color: 'var(--body)', lineHeight: 1.8 }}>
          <li>Activate once (lifetime) or monthly — whichever suits you.</li>
          <li>Each AI action is charged from your prepaid balance according to how much AI processing it uses. Short tasks cost a few shillings; you see every charge below.</li>
          <li>Top up any time by M-Pesa or bank transfer. Unused balance stays on your account.</li>
        </ul>
      </section>
      <section className="panel stack" style={{ gap: 0 }}>
        <h3 style={{ marginBottom: 8 }}>History</h3>
        {(ledger ?? []).length === 0 && <p className="small muted">No AI activity yet.</p>}
        {(ledger ?? []).map((l) => (
          <div key={l.id} className="row between small" style={{ padding: '8px 0', borderBottom: '1px solid #F0F2F4' }}>
            <span>{l.kind === 'usage' ? `AI: ${String(l.action ?? '').replace(/_/g, ' ')}` : l.note ?? l.kind}</span>
            <span className="muted">{new Date(l.created_at).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            <span style={{ fontWeight: 600, color: Number(l.amount_kes) < 0 ? 'var(--ink)' : 'var(--green)' }}>{Number(l.amount_kes) < 0 ? '−' : '+'}KES {kes(Math.abs(Number(l.amount_kes)))}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
