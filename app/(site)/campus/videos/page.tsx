import { requireMember } from '@/lib/campus-server';
import { kes } from '@/lib/format';
import type { Video } from '@/lib/campus';
import CampusNav from '../CampusNav';
import VideoForm from './VideoForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Videos — Mnada Campus', robots: { index: false } };

const ST: Record<Video['status'], [string, string]> = { submitted: ['In review', 'pill-warn'], approved: ['Approved', 'pill-green'], rejected: ['Not approved', 'pill-grey'] };

export default async function CampusVideos() {
  const { supabase, user, member, settings: s } = await requireMember();
  const active = member.status === 'active';
  const { data } = await supabase.from('auction_campus_videos').select('*').eq('member_id', user.id).order('created_at', { ascending: false });
  const vids = (data ?? []) as Video[];
  return (
    <div className="wrap section stack" style={{ gap: 24 }}>
      <h1>Videos</h1>
      <CampusNav active={active} />
      <div className="row" style={{ gap: 28, alignItems: 'flex-start' }}>
        <div className="stack" style={{ flex: '1 1 300px', gap: 10 }}>
          <h3>Ideas that work</h3>
          <ul className="small" style={{ margin: 0, paddingLeft: 18, color: 'var(--body)', lineHeight: 1.8 }}>
            <li>“Guess the price” on an odd lot, then reveal what it sold for.</li>
            <li>Yard tour: the biggest machine on sale this week.</li>
            <li>“How to bid on Mnada in 30 seconds”.</li>
            <li>Before and after: a container house delivered and set up.</li>
          </ul>
          <p className="small" style={{ color: 'var(--body)' }}>Put your code <b>{member.code}</b> in the caption. KES {kes(s.creator_fee_kes)} for each approved video{s.creator_bonus.length ? `, plus ${s.creator_bonus.map((b) => `KES ${kes(b.kes)} at ${kes(b.views)} views`).join(' or ')}` : ''}. Send the link once it has been up for 7 days so we can count the views.</p>
          <p className="small muted">Keep it honest: no made-up prices or claims about items, no other people’s music without the platform’s licence, and don’t film people who haven’t agreed.</p>
        </div>
        <div style={{ flex: '2 1 440px' }}>{active ? <VideoForm userId={user.id} /> : <div className="alert alert-info">You can submit videos once your campus account is approved.</div>}</div>
      </div>
      <section className="stack" style={{ gap: 10 }}>
        <h2>My videos</h2>
        {vids.length === 0 ? <p className="muted">No videos yet.</p> : (
          <table className="data">
            <thead><tr><th>Sent</th><th>Link</th><th style={{ textAlign: 'right' }}>Views</th><th style={{ textAlign: 'right' }}>Paid</th><th>Status</th></tr></thead>
            <tbody>{vids.map((v) => (
              <tr key={v.id}><td className="small">{new Date(v.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                <td className="small"><a href={v.url} target="_blank" rel="noreferrer">{v.platform}</a>{v.about ? ` · ${v.about}` : ''}</td>
                <td style={{ textAlign: 'right' }}>{kes(v.views)}</td><td style={{ textAlign: 'right' }}>KES {kes(Number(v.fee_kes) + Number(v.bonus_kes))}</td>
                <td><span className={`pill ${ST[v.status][1]}`}>{ST[v.status][0]}</span>{v.review_note ? <div className="small muted">{v.review_note}</div> : null}</td></tr>))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
