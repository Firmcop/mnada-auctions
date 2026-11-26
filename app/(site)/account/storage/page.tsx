import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import { kes } from '@/lib/format';
import { STORAGE_STATUS, usd, type StorageBooking, type StorageCharge } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My storage' };

export default async function MyStorage() {
  const { supabase, user } = await getSession();
  if (!user) redirect('/login?next=/account/storage');
  const [{ data }, { data: ch }] = await Promise.all([
    supabase.from('auction_storage_bookings').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('auction_storage_charges').select('*').eq('user_id', user.id).eq('status', 'pending'),
  ]);
  const rows = (data ?? []) as StorageBooking[];
  const due = ((ch ?? []) as StorageCharge[]).reduce((s, c) => s + Number(c.total_kes), 0);
  return (
    <div className="wrap section stack" style={{ maxWidth: 900, gap: 18 }}>
      <div className="row between"><h1>Storage</h1><Link href="/storage" className="btn btn-primary">New storage request</Link></div>
      {due > 0 && <div className="alert alert-info">You have storage bills of <b>KES {kes(due)}</b> to pay — open the booking for payment details.</div>}
      {rows.length === 0 && <p>No storage bookings yet. <Link href="/storage">Calculate your price</Link>.</p>}
      <div style={{ borderTop: rows.length ? '1px solid var(--line)' : 0 }}>
        {rows.map((r) => (
          <Link key={r.id} href={`/account/storage/${r.id}`} className="list-row" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span className={`pill ${STORAGE_STATUS[r.status][1]}`}>{STORAGE_STATUS[r.status][0]}</span>
            <span className="stack" style={{ gap: 2, flex: '1 1 300px' }}>
              <b>{r.reference} · {r.items.length} item{r.items.length === 1 ? '' : 's'} · {Number(r.volume_m3)} m³</b>
              <span className="small muted">{r.start_date ? `Since ${new Date(r.start_date).toLocaleDateString('en-GB')}` : `Requested ${new Date(r.created_at).toLocaleDateString('en-GB')}`}{r.bay ? ` · bay ${r.bay}` : ''}</span>
            </span>
            <b>{r.monthly_usd != null ? `USD ${usd(r.monthly_usd)}/mo` : r.est_monthly_usd != null ? `≈ USD ${usd(r.est_monthly_usd)}/mo` : ''}</b>
          </Link>
        ))}
      </div>
    </div>
  );
}
