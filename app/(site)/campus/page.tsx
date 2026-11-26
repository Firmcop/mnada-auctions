import Link from 'next/link';
import { getSession } from '@/lib/supabase/server';
import { kes } from '@/lib/format';
import { LEVEL_LABEL, type BoardRow, type CampusSettings, type Challenge, type Member } from '@/lib/campus';
import JoinForm from './JoinForm';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Mnada Campus — earn while you study',
  description: 'College and university students earn from Mnada: scout sellers, refer bidders, take paid photo and listing gigs, make videos and write condition reports. Paid by M-Pesa.',
};

export default async function CampusPage() {
  const { supabase, user, profile } = await getSession();
  const [{ data: st }, { data: board }, { data: camps }, { data: challenges }, { data: me }] = await Promise.all([
    supabase.from('auction_campus_settings').select('*').eq('id', 1).single(),
    supabase.rpc('auction_campus_leaderboard'),
    supabase.rpc('auction_campus_campus_table'),
    supabase.from('auction_campus_challenges').select('*').eq('active', true).order('starts_at', { ascending: false }).limit(6),
    user ? supabase.from('auction_campus_members').select('*').eq('id', user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const s = st as CampusSettings;
  const member = me as Member | null;
  const rows = ((board ?? []) as BoardRow[]).slice(0, 10);
  const campusRows = (camps ?? []) as { campus: string; members: number; earned_kes: number; bidders: number }[];
  const ex = { mnada: 200000, scout: 200000 * s.scout_pct / 100, ref: 100000 * s.referral_pct / 100 };

  const ways: [string, string, string][] = [
    ['Scout', 'Spot a business with idle machinery, a closing workshop, a fleet, containers or steel. Get the owner’s OK, then send us the lead. We do the rest.',
      `${s.scout_pct}% of what Mnada earns on their first sale, then ${s.scout_repeat_pct}% on their sales for ${s.scout_months} months`],
    ['Bidder referrer', 'Share your personal link. When friends, fundis and businesses register, get approved and buy, you earn.',
      `${s.referral_pct}% of the buyer’s premium for ${s.referral_months} months${s.first_bid_bonus_kes > 0 ? ` + KES ${kes(s.first_bid_bonus_kes)} when they’re approved and place a first bid` : ''}`],
    ['Crew', 'Take paid field gigs near your campus: photos and video of lots, writing listings, helping on viewing days.',
      s.crew_rates.length ? s.crew_rates.slice(0, 3).map((r) => `${r.task} KES ${kes(r.kes)}`).join(' · ') : 'Paid per task'],
    ['Creator', 'Make TikToks and Reels about odd lots, yard tours and “what sold this week”, with your code in the caption.',
      `KES ${kes(s.creator_fee_kes)} per approved video${s.creator_bonus.length ? ` + up to KES ${kes(Math.max(...s.creator_bonus.map((b) => b.kes)))} views bonus` : ''}, plus referral earnings`],
    ['Inspector', 'Engineering and technical students: check machinery and fill in our standard condition report before it goes live.',
      `Paid per approved report${s.crew_rates.find((r) => /condition/i.test(r.task)) ? ` — KES ${kes(s.crew_rates.find((r) => /condition/i.test(r.task))!.kes)}` : ''}`],
  ];

  return (
    <>
      <section style={{ background: 'var(--navy)', color: '#fff' }}>
        <div className="wrap stack" style={{ padding: '52px 24px', gap: 14 }}>
          <span className="eyebrow" style={{ color: '#F5A27A' }}>{s.programme_name} · for college &amp; university students</span>
          <h1 style={{ color: '#fff', maxWidth: 860, fontSize: 'clamp(30px, 4.6vw, 50px)' }}>Earn real money from real deals — while you study.</h1>
          <p style={{ color: '#C9D5DF', fontSize: 18, maxWidth: 700 }}>Find sellers, bring bidders, shoot lots, make videos. Mnada pays by M-Pesa twice a month, and the best get internships.</p>
          <div className="row" style={{ marginTop: 4 }}>
            <a href="#join" className="btn btn-primary">{member ? 'Go to my dashboard' : 'Join Mnada Campus'}</a>
            <a href="#ways" className="btn" style={{ border: '1.5px solid #fff', color: '#fff' }}>How you earn</a>
          </div>
          <span style={{ color: '#fff', fontWeight: 700 }}>Free to join · 18+ with a valid student ID · Pilot campuses: {s.campuses.join(', ')}</span>
        </div>
      </section>

      <div className="wrap section stack" style={{ gap: 40 }}>
        <section id="ways" className="stack" style={{ gap: 16 }}>
          <h2>Five ways to earn</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
            {ways.map(([t, d, pay], i) => (
              <div key={t} className="card stack" style={{ padding: 18, gap: 8 }}>
                <span className="eyebrow">{i + 1}</span>
                <b style={{ fontSize: 18 }}>{t}</b>
                <span className="small" style={{ color: 'var(--body)' }}>{d}</span>
                <span className="small" style={{ fontWeight: 700, color: 'var(--accent)' }}>{pay}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="row" style={{ gap: 32, alignItems: 'flex-start' }}>
          <div className="panel stack" style={{ flex: '1 1 360px', gap: 10, background: 'var(--surface)' }}>
            <h3>Example: one lathe, KES 1,000,000</h3>
            <p className="small" style={{ color: 'var(--body)' }}>You scouted the seller, and a friend you referred won the auction. Mnada earns about KES {kes(ex.mnada)} (buyer’s premium + seller commission).</p>
            <table className="data">
              <tbody>
                <tr><td>Your scout share ({s.scout_pct}%)</td><td style={{ textAlign: 'right' }}><b>KES {kes(ex.scout)}</b></td></tr>
                <tr><td>Your referral share ({s.referral_pct}% of the KES 100,000 premium)</td><td style={{ textAlign: 'right' }}><b>KES {kes(ex.ref)}</b></td></tr>
                <tr><td>Total to your wallet</td><td style={{ textAlign: 'right' }}><b style={{ color: 'var(--accent)' }}>KES {kes(ex.scout + ex.ref)}</b></td></tr>
              </tbody>
            </table>
            <span className="small muted">Paid once the buyer has paid and collected. {s.wht_pct}% withholding tax is deducted and a certificate issued.</span>
          </div>
          <div className="stack" style={{ flex: '1 1 360px', gap: 10 }}>
            <h3>Level up</h3>
            <ol className="small" style={{ margin: 0, paddingLeft: 20, color: 'var(--body)', lineHeight: 1.9 }}>
              <li><b>{LEVEL_LABEL.recruit}</b> — approved and earning.</li>
              <li><b>{LEVEL_LABEL.scout}</b> — first seller signed or first sale.</li>
              <li><b>{LEVEL_LABEL.ambassador}</b> — consistent results; +{s.level_bonus_pct.ambassador ?? 0}% on first-sale scout earnings.</li>
              <li><b>{LEVEL_LABEL.lead}</b> — runs the campus team; +{s.level_bonus_pct.lead ?? 0}% and a KES {kes(s.lead_stipend_kes)} monthly stipend.</li>
            </ol>
            <h3 style={{ marginTop: 8 }}>Monthly prizes</h3>
            <p className="small" style={{ color: 'var(--body)' }}>{s.monthly_prizes}. Top performers are offered industrial attachment or internship places at Mnada.</p>
          </div>
        </section>

        {challenges && challenges.length > 0 && (
          <section className="stack" style={{ gap: 12 }}>
            <h2>Live challenges</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
              {(challenges as Challenge[]).map((c) => (
                <div key={c.id} className="card stack" style={{ padding: 16, gap: 6 }}>
                  <b>{c.title}</b>
                  {c.description && <span className="small" style={{ color: 'var(--body)' }}>{c.description}</span>}
                  {c.prize && <span className="small" style={{ fontWeight: 700, color: 'var(--accent)' }}>Prize: {c.prize}</span>}
                  {c.ends_at && <span className="small muted">Ends {new Date(c.ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="row" style={{ gap: 32, alignItems: 'flex-start' }}>
          <div className="stack" style={{ flex: '2 1 420px', gap: 10 }}>
            <h2>This month’s leaderboard</h2>
            {rows.length === 0 ? <p className="muted">The board fills as students earn this month — the top spot is open.</p> : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data">
                  <thead><tr><th>#</th><th>Student</th><th>Campus</th><th>Level</th><th style={{ textAlign: 'right' }}>Earned</th><th style={{ textAlign: 'right' }}>Bidders</th></tr></thead>
                  <tbody>{rows.map((r) => (
                    <tr key={r.rank} style={r.is_me ? { background: '#FFF4EE' } : undefined}>
                      <td><b>{r.rank}</b></td><td>{r.name}{r.is_me ? ' (you)' : ''}</td><td>{r.campus}</td><td>{LEVEL_LABEL[r.level]}</td>
                      <td style={{ textAlign: 'right' }}>KES {kes(r.earned_kes)}</td><td style={{ textAlign: 'right' }}>{r.bidders}</td>
                    </tr>))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="stack" style={{ flex: '1 1 260px', gap: 10 }}>
            <h2>Campus league</h2>
            {campusRows.length === 0 ? <p className="muted">No campus has scored yet this month.</p> : (
              <table className="data">
                <thead><tr><th>Campus</th><th style={{ textAlign: 'right' }}>Students</th><th style={{ textAlign: 'right' }}>Earned</th></tr></thead>
                <tbody>{campusRows.map((c) => <tr key={c.campus}><td>{c.campus}</td><td style={{ textAlign: 'right' }}>{c.members}</td><td style={{ textAlign: 'right' }}>KES {kes(c.earned_kes)}</td></tr>)}</tbody>
              </table>
            )}
          </div>
        </section>

        <section className="stack" style={{ gap: 12 }}>
          <h2>The rules</h2>
          <ul className="small" style={{ margin: 0, paddingLeft: 20, color: 'var(--body)', lineHeight: 1.9, maxWidth: 820 }}>
            <li>You introduce sellers and buyers — you don’t run auctions, take items, collect money or call yourself an auctioneer. Mnada handles every sale.</li>
            <li>Only send a lead after the owner has agreed to be contacted by Mnada. No scraped contact lists or cold-call lists.</li>
            <li>You earn only when buyers have paid. If a sale is refunded or cancelled, that earning is cancelled too.</li>
            <li>No earning on your own items, your own bids or people in your household. Accounts are checked against ID and M-Pesa names.</li>
            <li>You need a KRA PIN on your account to be paid. Withholding tax ({s.wht_pct}%) is deducted from payouts.</li>
            <li>Payouts by M-Pesa twice a month once your ready balance is KES {kes(s.min_payout_kes)} or more.</li>
            <li>Gig and video work is checked by Mnada staff before it’s paid or published.</li>
          </ul>
        </section>

        <section id="join" style={{ maxWidth: 760 }}>
          {member ? (
            <div className="panel card stack" style={{ gap: 10 }}>
              <h2>You’re in{member.status === 'pending' ? ' — awaiting approval' : ''}</h2>
              <p className="small" style={{ color: 'var(--body)' }}>Your code is <b>{member.code}</b>.</p>
              <Link href="/campus/dashboard" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Open my dashboard</Link>
            </div>
          ) : !user ? (
            <div className="panel card stack" style={{ gap: 10 }}>
              <h2>Join {s.programme_name}</h2>
              <p className="small" style={{ color: 'var(--body)' }}>First create a Mnada account (it’s also how we verify your ID), then come back here to join.</p>
              <div className="row"><Link href="/register" className="btn btn-primary">Create account</Link><Link href="/login?next=/campus%23join" className="btn btn-outline">Log in</Link></div>
            </div>
          ) : profile?.is_admin ? (
            <div className="alert alert-info">Mnada staff can’t join the campus programme.</div>
          ) : !profile ? (
            <div className="alert alert-info">This login isn’t registered on Mnada. <Link href="/register">Register</Link> first.</div>
          ) : (
            <JoinForm userId={user.id} campuses={s.campuses} defaultPhone={profile.phone} hasKraPin={!!profile.kra_pin} />
          )}
        </section>
      </div>
    </>
  );
}
