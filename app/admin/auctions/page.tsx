import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { eat } from '@/lib/format';
import AuctionForm from './AuctionForm';

export default async function AdminAuctions() {
  const supabase = await createClient();
  const { data: auctions } = await supabase.from('auction_auctions').select('*').order('created_at', { ascending: false });
  const { data: lots } = await supabase.from('auction_lots').select('auction_id');
  const count = (id: string) => (lots ?? []).filter((l) => l.auction_id === id).length;
  return (
    <>
      <h1 style={{ fontSize: 28 }}>Auctions &amp; lots</h1>
      <section className="panel">
        <div className="scroll-x">
          <table className="data" style={{ minWidth: 640 }}>
            <thead><tr><th>Auction</th><th>Status</th><th>Lots</th><th>First lot closes</th><th></th></tr></thead>
            <tbody>
              {(auctions ?? []).map((a) => (
                <tr key={a.id}>
                  <td><Link href={`/admin/auctions/${a.id}`} style={{ fontWeight: 600 }}>{a.title}</Link><div className="small muted">{a.location}</div></td>
                  <td><span className={`pill ${a.status === 'live' ? 'pill-green' : a.status === 'draft' ? 'pill-grey' : 'pill-warn'}`}>{a.status}</span></td>
                  <td>{count(a.id)}</td>
                  <td className="small">{a.first_close_at ? eat(a.first_close_at) : '—'}</td>
                  <td style={{ textAlign: 'right' }}><Link href={`/admin/auctions/${a.id}`} className="btn btn-outline btn-sm">Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel stack">
        <h3>New auction</h3>
        <AuctionForm />
      </section>
    </>
  );
}
