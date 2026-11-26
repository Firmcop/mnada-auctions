import { requireMember } from '@/lib/campus-server';
import { kes } from '@/lib/format';
import type { Gig } from '@/lib/campus';
import CampusNav from '../CampusNav';
import GigCard from './GigCard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Gigs — Mnada Campus', robots: { index: false } };

export default async function CampusGigs() {
  const { supabase, user, member, settings: s } = await requireMember();
  const active = member.status === 'active';
  const { data } = active
    ? await supabase.from('auction_campus_gigs').select('*').or(`status.eq.open,member_id.eq.${user.id}`).order('scheduled_for', { ascending: true, nullsFirst: false }).limit(200)
    : { data: [] };
  const gigs = (data ?? []) as Gig[];
  const mine = gigs.filter((g) => g.member_id === user.id);
  const open = gigs.filter((g) => g.status === 'open').sort((a, b) => Number(b.campus === member.campus) - Number(a.campus === member.campus));
  return (
    <div className="wrap section stack" style={{ gap: 24 }}>
      <h1>Gigs</h1>
      <CampusNav active={active} />
      {!active && <div className="alert alert-info">Gigs open up once your campus account is approved.</div>}
      {active && (
        <>
          <p className="small" style={{ color: 'var(--body)', maxWidth: 760 }}>Take a gig, do the work, then submit your photos, video or report link (Google Drive, WeTransfer or similar). Mnada checks it and adds the pay to your wallet. You can hold up to 3 gigs at a time.</p>
          {s.crew_rates.length > 0 && <p className="small muted">Standard rates: {s.crew_rates.map((r) => `${r.task} KES ${kes(r.kes)}`).join(' · ')}</p>}
          <section className="stack" style={{ gap: 12 }}>
            <h2>My gigs</h2>
            {mine.length === 0 ? <p className="muted">You haven’t taken a gig yet.</p> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {mine.map((g) => <GigCard key={g.id} gig={g} mine />)}
              </div>
            )}
          </section>
          <section className="stack" style={{ gap: 12 }}>
            <h2>Open gigs</h2>
            {open.length === 0 ? <p className="muted">No open gigs right now — check back soon.</p> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {open.map((g) => <GigCard key={g.id} gig={g} mine={false} />)}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
