import Link from 'next/link';
import { requireMember } from '@/lib/campus-server';
import { kes } from '@/lib/format';
import { EARN_LABEL, EARN_STATUS, LEVEL_LABEL, badgesFor, siteUrl, type BoardRow, type Challenge, type Earning } from '@/lib/campus';
import CampusNav from '../CampusNav';
import ShareBox from './ShareBox';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My Mnada Campus dashboard', robots: { index: false } };

export default async function CampusDashboard() {
  const { supabase, user, profile, member, settings: s } = await requireMember();
  const active = member.status === 'active';
  const [{ data: earn }, { data: board }, { data: leads }, { data: refs }, { data: gigs }, { data: vids }, { data: ch }, { data: pos }] = await Promise.all([
    supabase.from('auction_campus_earnings').select('*').eq('member_id', user.id).order('created_at', { ascending: false }).limit(200),
    supabase.rpc('auction_campus_leaderboard'),
    supabase.from('auction_campus_leads').select('status').eq('member_id', user.id),
    supabase.from('auction_campus_referrals').select('referred_id, blocked').eq('member_id', user.id),
    supabase.from('auction_campus_gigs').select('status').eq('member_id', user.id),
    supabase.from('auction_campus_videos').select('status').eq('member_id', user.id),
    supabase.from('auction_campus_challenges').select('*').eq('active', true).order('starts_at', { ascending: false }).limit(4),
    supabase.from('auction_payouts').select('id, reference, amount_kes, gross_kes, wht_kes, status, payment_ref, created_at, paid_at').eq('campus_member_id', user.id).order('created_at', { ascending: false }).limit(24),
  ]);
  const earnings = (earn ?? []) as Earning[];
  const sum = (st: Earning['status'], free = false) => earnings.filter((e) => e.status === st && (!free || !e.payout_id)).reduce((a, e) => a + Number(e.amount_kes), 0);
  const ready = sum('approved', true);
  const inPayout = earnings.filter((e) => e.status === 'approved' && e.payout_id).reduce((a, e) => a + Number(e.amount_kes), 0);
  const me = ((board ?? []) as BoardRow[]).find((r) => r.is_me);
  const badges = badgesFor({
    leadsWon: (leads ?? []).filter((l) => l.status === 'won').length,
    sales: earnings.filter((e) => (e.kind === 'scout' || e.kind === 'scout_repeat') && e.status !== 'cancelled').length,
    bidders: (refs ?? []).filter((r) => !r.blocked).length,
    gigs: (gigs ?? []).filter((g) => g.status === 'approved').length,
    videos: (vids ?? []).filter((v) => v.status === 'approved').length,
    rank: me?.rank ?? null, level: member.level,
  });
  const link = `${siteUrl()}/r/${member.code}`;

  return (
    <div className="wrap section stack" style={{ gap: 24 }}>
      <div className="row between">
        <div className="stack" style={{ gap: 4 }}>
          <h1>{s.programme_name}</h1>
          <span className="muted">{profile?.full_name} · {member.campus} · {LEVEL_LABEL[member.level]}</span>
        </div>
        <span className={`pill ${active ? 'pill-green' : 'pill-warn'}`} style={{ fontSize: 14, padding: '8px 12px' }}>
          {{ pending: 'Awaiting approval', active: 'Active', suspended: 'Suspended', rejected: 'Not approved' }[member.status]}
        </span>
      </div>
      <CampusNav active={active} />

      {member.status === 'pending' && <div className="alert alert-info">Thanks for applying. We’re checking your student ID and account — usually within a working day. Your code <b>{member.code}</b> starts working once you’re approved.</div>}
      {member.status === 'suspended' && <div className="alert alert-err">Your campus account is suspended{member.admin_note ? `: ${member.admin_note}` : ''}. Contact Mnada if you think this is a mistake.</div>}
      {member.status === 'rejected' && <div className="alert alert-err">Your application wasn’t approved{member.admin_note ? `: ${member.admin_note}` : ''}.</div>}
      {active && !profile?.kra_pin && <div className="alert alert-err">Add your KRA PIN on your <Link href="/account">account</Link> — we can’t pay you without it.</div>}

      <div className="kpis">
        <div className="kpi"><span className="eyebrow">Ready for payout</span><b style={{ color: 'var(--accent)' }}>KES {kes(ready)}</b><span className="small muted">{ready >= s.min_payout_kes ? 'Paid in the next payout run' : `Paid from KES ${kes(s.min_payout_kes)}`}</span></div>
        <div className="kpi"><span className="eyebrow">Pending</span><b>KES {kes(sum('pending'))}</b><span className="small muted">Buyer paid, awaiting collection</span></div>
        {inPayout > 0 && <div className="kpi"><span className="eyebrow">In a payout</span><b>KES {kes(inPayout)}</b><span className="small muted">Being sent to M-Pesa</span></div>}
        <div className="kpi"><span className="eyebrow">Paid to you</span><b>KES {kes(sum('paid'))}</b><span className="small muted">Before {s.wht_pct}% withholding</span></div>
        <div className="kpi"><span className="eyebrow">This month</span><b>{me ? `#${me.rank}` : '—'}</b><span className="small muted">{me ? `KES ${kes(me.earned_kes)} on the leaderboard` : 'Not on the board yet'}</span></div>
      </div>

      {active && <ShareBox link={link} code={member.code} clicks={member.clicks} />}

      <section className="row" style={{ gap: 24, alignItems: 'flex-start' }}>
        <div className="panel stack" style={{ flex: '1 1 300px', gap: 10 }}>
          <h3>Badges</h3>
          {badges.length ? <div className="row" style={{ gap: 8 }}>{badges.map((b) => <span key={b} className="pill pill-green" style={{ fontSize: 13 }}>{b}</span>)}</div>
            : <p className="small muted">Sign your first seller or bring your first bidder to earn a badge.</p>}
          <h3 style={{ marginTop: 6 }}>Your rates</h3>
          <ul className="small" style={{ margin: 0, paddingLeft: 18, color: 'var(--body)', lineHeight: 1.8 }}>
            <li>Scout: {Number(s.scout_pct) + Number(s.level_bonus_pct[member.level] ?? 0)}% first sale, {s.scout_repeat_pct}% repeat sales for {s.scout_months} months</li>
            <li>Referred buyers: {s.referral_pct}% of the premium for {s.referral_months} months{s.first_bid_bonus_kes > 0 ? `, + KES ${kes(s.first_bid_bonus_kes)} first-bid bonus` : ''}</li>
            <li>Videos: KES {kes(s.creator_fee_kes)} each + views bonus</li>
          </ul>
        </div>
        <div className="panel stack" style={{ flex: '1 1 300px', gap: 10 }}>
          <h3>Challenges</h3>
          {(ch ?? []).length === 0 ? <p className="small muted">No live challenges right now.</p> : (ch as Challenge[]).map((c) => (
            <div key={c.id} className="stack" style={{ gap: 2 }}><b>{c.title}</b>{c.description && <span className="small" style={{ color: 'var(--body)' }}>{c.description}</span>}{c.prize && <span className="small" style={{ color: 'var(--accent)', fontWeight: 700 }}>Prize: {c.prize}</span>}</div>
          ))}
        </div>
      </section>

      <section className="stack" style={{ gap: 10 }}>
        <h2>Earnings</h2>
        {earnings.length === 0 ? <p className="muted">Nothing yet. Your first earning appears here the moment it’s recorded.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data" style={{ minWidth: 640 }}>
              <thead><tr><th>Date</th><th>Type</th><th>Details</th><th style={{ textAlign: 'right' }}>Amount</th><th>Status</th></tr></thead>
              <tbody>{earnings.map((e) => (
                <tr key={e.id}>
                  <td className="small">{new Date(e.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                  <td>{EARN_LABEL[e.kind]}</td>
                  <td className="small">{e.note}{e.pct != null && e.base_kes != null ? ` · ${e.pct}% of KES ${kes(e.base_kes)}` : ''}</td>
                  <td style={{ textAlign: 'right' }}><b>KES {kes(e.amount_kes)}</b></td>
                  <td><span className={`pill ${EARN_STATUS[e.status][1]}`}>{e.payout_id && e.status === 'approved' ? 'In a payout' : EARN_STATUS[e.status][0]}</span></td>
                </tr>))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(pos ?? []).length > 0 && (
        <section className="stack" style={{ gap: 10 }}>
          <h2>Payouts</h2>
          <table className="data">
            <thead><tr><th>Ref</th><th>Date</th><th style={{ textAlign: 'right' }}>Earned</th><th style={{ textAlign: 'right' }}>Tax withheld</th><th style={{ textAlign: 'right' }}>Sent to M-Pesa</th><th>Status</th></tr></thead>
            <tbody>{(pos ?? []).map((p) => (
              <tr key={p.id}><td>{p.reference}</td><td className="small">{new Date(p.paid_at ?? p.created_at).toLocaleDateString('en-GB')}</td>
                <td style={{ textAlign: 'right' }}>KES {kes(p.gross_kes)}</td><td style={{ textAlign: 'right' }}>KES {kes(p.wht_kes)}</td><td style={{ textAlign: 'right' }}><b>KES {kes(p.amount_kes)}</b></td>
                <td><span className={`pill ${p.status === 'paid' ? 'pill-green' : p.status === 'pending' ? 'pill-warn' : 'pill-grey'}`}>{p.status === 'paid' ? `Paid${p.payment_ref ? ` · ${p.payment_ref}` : ''}` : p.status === 'pending' ? 'Being sent' : 'Cancelled'}</span></td></tr>))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
