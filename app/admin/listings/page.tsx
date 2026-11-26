import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { listingPrice, type Listing } from '@/lib/format';

export default async function AdminListings() {
  const supabase = await createClient();
  const { data } = await supabase.from('auction_listings').select('*').order('created_at', { ascending: false });
  const { data: enq } = await supabase.from('auction_enquiries').select('listing_id, status');
  const rows = (data ?? []) as Listing[];
  const newFor = (id: string) => (enq ?? []).filter((e) => e.listing_id === id && e.status === 'new').length;
  return (
    <>
      <div className="row between">
        <h1 style={{ fontSize: 28 }}>Direct sale</h1>
        <div className="row"><Link href="/admin/import" className="btn btn-outline">Bulk import from spreadsheet</Link><Link href="/admin/listings/new" className="btn btn-primary">Add item</Link></div>
      </div>
      <section className="panel">
        <div className="scroll-x">
          <table className="data" style={{ minWidth: 720 }}>
            <thead><tr><th>Item</th><th>Price</th><th>Stock</th><th>Status</th><th>New enquiries</th><th></th></tr></thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id}>
                  <td><b>{l.title}</b><div className="small muted">DS-{l.ref_no} · {l.subcategory ?? l.category}{l.featured ? ' · featured' : ''}</div></td>
                  <td className="small">{listingPrice(l)}</td>
                  <td>{l.stock}</td>
                  <td><span className={`pill ${l.status === 'active' ? 'pill-green' : l.status === 'draft' ? 'pill-grey' : 'pill-warn'}`}>{l.status}</span></td>
                  <td>{newFor(l.id) > 0 ? <Link href="/admin/enquiries" className="pill pill-warn">{newFor(l.id)} new</Link> : '—'}</td>
                  <td style={{ textAlign: 'right' }}><Link href={`/admin/listings/${l.id}`} className="btn btn-outline btn-sm">Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="small muted">No items yet.</p>}
      </section>
    </>
  );
}
