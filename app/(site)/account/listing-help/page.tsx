import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import { kes } from '@/lib/format';
import { STATUS_LABEL, type HelpRequest } from '@/lib/help';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Listing Help requests' };

export default async function MyHelpPage() {
  const { supabase, user } = await getSession();
  if (!user) redirect('/login?next=/account/listing-help');
  const { data } = await supabase.from('auction_help_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  const rows = (data ?? []) as HelpRequest[];
  return (
    <div className="wrap section stack" style={{ maxWidth: 900, gap: 18 }}>
      <div className="row between">
        <h1>Listing Help</h1>
        <Link href="/listing-help#request" className="btn btn-primary">New request</Link>
      </div>
      {rows.length === 0 && <p>No requests yet. <Link href="/listing-help">See what we can do for you</Link>.</p>}
      <div style={{ borderTop: rows.length ? '1px solid var(--line)' : 0 }}>
        {rows.map((r) => {
          const [label, cls] = STATUS_LABEL[r.status];
          return (
            <Link key={r.id} href={`/account/listing-help/${r.id}`} className="list-row" style={{ textDecoration: 'none', color: 'inherit' }}>
              <span className={`pill ${cls}`}>{label}</span>
              <span className="stack" style={{ gap: 2, flex: '1 1 300px' }}>
                <b>{r.reference} · {r.location}</b>
                <span className="small muted">{r.est_lots} lot{r.est_lots === 1 ? '' : 's'} · requested {new Date(r.created_at).toLocaleDateString('en-GB')}</span>
              </span>
              <b>{r.quote_total_kes != null ? `KES ${kes(r.quote_total_kes)}` : r.estimate_kes ? `≈ KES ${kes(r.estimate_kes)}` : ''}</b>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
