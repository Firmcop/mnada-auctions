import { requireArea } from '@/lib/require-area';
import { createClient } from '@/lib/supabase/server';
import { kes } from '@/lib/format';
import AiAdmin from './AiAdmin';

export default async function AdminAiPage() {
  await requireArea('finance');
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ data: settings }, { data: prices }, { data: plans }, { data: payments }, { data: usage }, { data: accounts }] = await Promise.all([
    supabase.from('auction_ai_settings').select('*').eq('id', 1).single(),
    supabase.from('auction_ai_model_prices').select('*').order('model'),
    supabase.from('auction_ai_plans').select('*').order('sort'),
    supabase.from('auction_ai_payments').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('auction_ai_ledger').select('kind, amount_kes, cost_kes, internal, payment_id, created_at').gte('created_at', since),
    supabase.from('auction_ai_accounts').select('user_id, status, balance_kes, expires_at'),
  ]);
  const ids = Array.from(new Set([...(payments ?? []).map((p) => p.user_id), ...(accounts ?? []).map((a) => a.user_id)]));
  const { data: people } = ids.length ? await supabase.from('auction_profiles').select('id, full_name, business_name, phone').in('id', ids) : { data: [] };
  const u = usage ?? [];
  const use = u.filter((l) => l.kind === 'usage');
  const revenueUsage = use.reduce((s, l) => s + -Number(l.amount_kes), 0);
  const costAll = use.reduce((s, l) => s + Number(l.cost_kes ?? 0), 0);
  const costCharged = use.filter((l) => !l.internal).reduce((s, l) => s + Number(l.cost_kes ?? 0), 0);
  const paid = (payments ?? []).filter((p) => p.status === 'paid' && p.confirmed_at && p.confirmed_at >= since);
  const activationRevenue = paid.filter((p) => p.purpose === 'activation').reduce((s, p) => s + Number(p.amount_kes), 0);
  const topups = paid.filter((p) => p.purpose === 'topup').reduce((s, p) => s + Number(p.amount_kes), 0);
  const prepaidLiability = (accounts ?? []).reduce((s, a) => s + Number(a.balance_kes), 0);

  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 style={{ fontSize: 28 }}>AI tools &amp; billing</h1>
        <span className="small muted">Users pay to activate (once or monthly) and are charged per AI action at actual model cost plus your markup.</span>
      </div>
      {!settings?.enabled && <div className="alert alert-info">AI tools are <b>off</b>. Before switching on: add the AI API key to the server, set the exchange rate and model prices below, and set plan prices.</div>}
      <div className="kpis">
        <div className="kpi"><span className="eyebrow">Usage revenue (30 days)</span><b>KES {kes(revenueUsage)}</b><span className="small muted">{use.length} AI actions</span></div>
        <div className="kpi"><span className="eyebrow">AI cost (30 days)</span><b>KES {kes(costAll)}</b><span className="small muted">KES {kes(costAll - costCharged)} internal staff use</span></div>
        <div className="kpi"><span className="eyebrow">Usage margin</span><b style={{ color: 'var(--green)' }}>KES {kes(revenueUsage - costCharged)}</b><span className="small muted">{costCharged ? `${Math.round(((revenueUsage - costCharged) / costCharged) * 100)}% over cost` : '—'}</span></div>
        <div className="kpi"><span className="eyebrow">Activations (30 days)</span><b>KES {kes(activationRevenue)}</b></div>
        <div className="kpi"><span className="eyebrow">Top-ups (30 days)</span><b>KES {kes(topups)}</b><span className="small muted">KES {kes(prepaidLiability)} unused balance held</span></div>
      </div>
      <AiAdmin settings={settings} prices={prices ?? []} plans={plans ?? []} payments={payments ?? []} people={people ?? []} accounts={accounts ?? []} />
    </>
  );
}
