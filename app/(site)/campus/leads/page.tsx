import { requireMember } from '@/lib/campus-server';
import { kes } from '@/lib/format';
import { LEAD_STATUS, type Earning, type Lead } from '@/lib/campus';
import CampusNav from '../CampusNav';
import LeadForm from './LeadForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Scout leads — Mnada Campus', robots: { index: false } };

export default async function CampusLeads() {
  const { supabase, user, member, settings: s } = await requireMember();
  const active = member.status === 'active';
  const [{ data: leads }, { data: earn }] = await Promise.all([
    supabase.from('auction_campus_leads').select('*').eq('member_id', user.id).order('created_at', { ascending: false }),
    supabase.from('auction_campus_earnings').select('lead_id, amount_kes, status').eq('member_id', user.id).not('lead_id', 'is', null),
  ]);
  const earnedFor = (id: string) => ((earn ?? []) as Pick<Earning, 'lead_id' | 'amount_kes' | 'status'>[]).filter((e) => e.lead_id === id && e.status !== 'cancelled').reduce((a, e) => a + Number(e.amount_kes), 0);
  return (
    <div className="wrap section stack" style={{ gap: 24 }}>
      <h1>Scout leads</h1>
      <CampusNav active={active} />
      <div className="row" style={{ gap: 28, alignItems: 'flex-start' }}>
        <div className="stack" style={{ flex: '1 1 300px', gap: 10 }}>
          <h3>What makes a good lead</h3>
          <ul className="small" style={{ margin: 0, paddingLeft: 18, color: 'var(--body)', lineHeight: 1.8 }}>
            <li>A business closing, moving or upgrading — workshops, factories, farms, contractors, fleets.</li>
            <li>Idle machinery, vehicles, forklifts, generators, containers, steel structures.</li>
            <li>Estates, liquidations or companies clearing a yard.</li>
          </ul>
          <h3>How you earn</h3>
          <p className="small" style={{ color: 'var(--body)' }}>When the business signs up and their items sell, you get {s.scout_pct}% of what Mnada earns on the first sale and {s.scout_repeat_pct}% on their sales for {s.scout_months} months — paid once buyers have paid. If two students send the same business, the first lead keeps it.</p>
          <div className="alert alert-info">Ask the owner first: “Can Mnada call you about selling this?” Only send the lead if they say yes.</div>
        </div>
        <div style={{ flex: '2 1 480px' }}>
          {active ? <LeadForm userId={user.id} /> : <div className="alert alert-info">You can send leads once your campus account is approved.</div>}
        </div>
      </div>
      <section className="stack" style={{ gap: 10 }}>
        <h2>My leads</h2>
        {(leads ?? []).length === 0 ? <p className="muted">No leads yet.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data" style={{ minWidth: 640 }}>
              <thead><tr><th>Sent</th><th>Business</th><th>Items</th><th>Status</th><th style={{ textAlign: 'right' }}>Earned so far</th></tr></thead>
              <tbody>{((leads ?? []) as Lead[]).map((l) => (
                <tr key={l.id}>
                  <td className="small">{new Date(l.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                  <td><b>{l.business_name}</b><div className="small muted">{l.location}</div></td>
                  <td className="small">{l.items.slice(0, 90)}{l.items.length > 90 ? '…' : ''}</td>
                  <td><span className={`pill ${LEAD_STATUS[l.status][1]}`}>{LEAD_STATUS[l.status][0]}</span></td>
                  <td style={{ textAlign: 'right' }}>KES {kes(earnedFor(l.id))}</td>
                </tr>))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
