import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import MarkRead from './MarkRead';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Alerts' };

const ICON: Record<string, [string, string]> = {
  outbid: ['Outbid', 'pill-warn'],
  closing_soon: ['Closing soon', 'pill-warn'],
  won: ['Won', 'pill-green'],
  approved: ['Account', 'pill-green'],
  service: ['Service', 'pill-green'],
  allocation: ['Allocation', 'pill-warn'],
  payment: ['Payment', 'pill-warn'],
};

export default async function AlertsPage() {
  const { supabase, user } = await getSession();
  if (!user) redirect('/login?next=/account/alerts');
  const { data } = await supabase.from('auction_notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100);
  const rows = data ?? [];
  const unread = rows.filter((r) => !r.read_at).length;

  return (
    <div className="wrap section stack" style={{ maxWidth: 820, gap: 18 }}>
      <div className="row between">
        <h1>Alerts</h1>
        {unread > 0 && <MarkRead />}
      </div>
      <p className="muted small">You get an alert when you are outbid, one hour before a watched lot closes, and when you win. SMS alerts to your registered number are coming soon.</p>
      {rows.length === 0 && <p>No alerts yet.</p>}
      <div style={{ borderTop: rows.length ? '1px solid var(--line)' : 0 }}>
        {rows.map((r) => {
          const [label, cls] = ICON[r.kind] ?? ['Alert', 'pill-grey'];
          const href = r.kind === 'won' || r.kind === 'payment' ? '/account' : r.kind === 'allocation' ? '/account/offers' : r.storage_booking_id ? `/account/storage/${r.storage_booking_id}` : r.help_request_id ? `/account/listing-help/${r.help_request_id}` : r.lot_id ? `/lots/${r.lot_id}` : '/account';
          return (
            <Link key={r.id} href={href} className="list-row" style={{ textDecoration: 'none', color: 'inherit', background: r.read_at ? '#fff' : '#FFF8F4', paddingLeft: 10, paddingRight: 10 }}>
              <span className={`pill ${cls}`}>{label}</span>
              <span className="stack" style={{ gap: 2, flex: '1 1 300px' }}>
                <b>{r.title}</b>
                {r.body && <span className="small" style={{ color: 'var(--body)' }}>{r.body}</span>}
              </span>
              <span className="small muted">{new Date(r.created_at).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
