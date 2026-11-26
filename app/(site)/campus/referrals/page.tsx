import { requireMember } from '@/lib/campus-server';
import { kes } from '@/lib/format';
import { siteUrl } from '@/lib/campus';
import CampusNav from '../CampusNav';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My bidders — Mnada Campus', robots: { index: false } };

type Row = { name: string; joined: string; approved: boolean; has_bid: boolean; purchases: number; flagged: boolean };

export default async function CampusReferrals() {
  const { supabase, user, member, settings: s } = await requireMember();
  const active = member.status === 'active';
  const [{ data }, { data: earn }] = await Promise.all([
    supabase.rpc('auction_campus_my_referrals'),
    supabase.from('auction_campus_earnings').select('amount_kes, kind, status').eq('member_id', user.id).in('kind', ['referral', 'first_bid']).neq('status', 'cancelled'),
  ]);
  const rows = (data ?? []) as Row[];
  const total = (earn ?? []).reduce((a, e) => a + Number(e.amount_kes), 0);
  return (
    <div className="wrap section stack" style={{ gap: 24 }}>
      <h1>My bidders</h1>
      <CampusNav active={active} />
      <div className="kpis">
        <div className="kpi"><span className="eyebrow">Registered with your code</span><b>{rows.length}</b></div>
        <div className="kpi"><span className="eyebrow">Approved to bid</span><b>{rows.filter((r) => r.approved).length}</b></div>
        <div className="kpi"><span className="eyebrow">Have bid</span><b>{rows.filter((r) => r.has_bid).length}</b></div>
        <div className="kpi"><span className="eyebrow">Earned from referrals</span><b>KES {kes(total)}</b></div>
      </div>
      <p className="small" style={{ color: 'var(--body)', maxWidth: 760 }}>
        Share <b>{siteUrl()}/r/{member.code}</b>. You earn {s.referral_pct}% of the buyer’s premium on everything they buy for {s.referral_months} months{s.first_bid_bonus_kes > 0 ? `, plus KES ${kes(s.first_bid_bonus_kes)} once they’re approved and place a first bid` : ''}. Fundis, contractors, farmers and small businesses buy the most.
      </p>
      {rows.length === 0 ? <p className="muted">No one has registered with your code yet.</p> : (
        <table className="data">
          <thead><tr><th>Name</th><th>Joined</th><th>Approved</th><th>Bid</th><th style={{ textAlign: 'right' }}>Purchases</th></tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={i}><td>{r.name}{r.flagged ? <div className="small muted">Not counted (same phone or ID as you)</div> : null}</td>
              <td className="small">{new Date(r.joined).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
              <td>{r.approved ? 'Yes' : 'Not yet'}</td><td>{r.has_bid ? 'Yes' : '—'}</td><td style={{ textAlign: 'right' }}>{r.purchases}</td></tr>))}
          </tbody>
        </table>
      )}
    </div>
  );
}
