import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { kes } from '@/lib/format';
import { STATUS_LABEL, type HelpRequest, type HelpStatus } from '@/lib/help';

const COLS: [HelpStatus, string][] = [
  ['requested', 'New — needs a quote'], ['quoted', 'Quote sent'], ['accepted', 'Accepted — schedule it'],
  ['scheduled', 'Scheduled'], ['in_progress', 'In progress'], ['done', 'Done (last 30 days)'],
];

export default async function AdminHelpPage() {
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ data }, { data: staff }, { data: pays }] = await Promise.all([
    supabase.from('auction_help_requests').select('*').not('status', 'in', '(cancelled,declined)').order('created_at', { ascending: false }).limit(300),
    supabase.from('auction_profiles').select('id, full_name').eq('is_admin', true),
    supabase.from('auction_help_payments').select('amount_kes, status, confirmed_at').eq('status', 'paid').gte('confirmed_at', since),
  ]);
  const rows = ((data ?? []) as HelpRequest[]).filter((r) => r.status !== 'done' || (r.completed_at ?? '') >= since);
  const name = (id: string | null) => (staff ?? []).find((s) => s.id === id)?.full_name ?? 'Unassigned';
  const pipeline = rows.filter((r) => ['quoted', 'accepted', 'scheduled', 'in_progress'].includes(r.status)).reduce((s, r) => s + Number(r.quote_total_kes ?? 0), 0);
  const collected = (pays ?? []).reduce((s, p) => s + Number(p.amount_kes), 0);

  return (
    <>
      <div className="row between">
        <div className="stack" style={{ gap: 4 }}>
          <h1 style={{ fontSize: 28 }}>Listing Help jobs</h1>
          <span className="small muted">Requests from customers for surveys, sorting, photos, video and listing.</span>
        </div>
        <Link href="/admin/help/services" className="btn btn-outline">Services &amp; prices</Link>
      </div>
      <div className="kpis">
        <div className="kpi"><span className="eyebrow">New requests</span><b>{rows.filter((r) => r.status === 'requested').length}</b></div>
        <div className="kpi"><span className="eyebrow">Open jobs value</span><b>KES {kes(pipeline)}</b></div>
        <div className="kpi"><span className="eyebrow">Collected (30 days)</span><b>KES {kes(collected)}</b></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14, alignItems: 'start' }}>
        {COLS.map(([st, title]) => {
          const list = rows.filter((r) => r.status === st);
          return (
            <section key={st} className="stack" style={{ gap: 8, background: 'var(--surface)', borderRadius: 12, padding: 10 }}>
              <b className="small">{title} · {list.length}</b>
              {list.map((r) => (
                <Link key={r.id} href={`/admin/help/${r.id}`} className="card stack" style={{ padding: 12, gap: 3, textDecoration: 'none', color: 'inherit' }}>
                  <b className="small">{r.reference} · {r.contact_name}</b>
                  <span className="small muted">{r.location} · {r.est_lots} lots</span>
                  {r.scheduled_for && <span className="small">📅 {new Date(r.scheduled_for).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                  <span className="small muted">{name(r.assigned_to)}{r.quote_total_kes != null ? ` · KES ${kes(r.quote_total_kes)}` : r.estimate_kes ? ` · est. KES ${kes(r.estimate_kes)}` : ''}</span>
                  {r.status !== st ? null : <span className={`pill ${STATUS_LABEL[r.status][1]}`} style={{ alignSelf: 'flex-start' }}>{r.pay_method === 'proceeds' ? 'from proceeds' : 'pay upfront'}</span>}
                </Link>
              ))}
            </section>
          );
        })}
      </div>
    </>
  );
}
