import Link from 'next/link';
import { getSession } from '@/lib/supabase/server';
import { listingPrice, type Listing } from '@/lib/format';

export default async function SellerListings() {
  const { supabase, user } = await getSession();
  const { data } = await supabase.from('auction_listings').select('*').eq('owner_id', user!.id).order('created_at', { ascending: false });
  const rows = (data ?? []) as Listing[];
  const state = (l: Listing) => l.review_status === 'pending' ? ['Waiting for review', 'pill-warn'] : l.review_status === 'rejected' ? ['Changes needed', 'pill-warn'] : l.status === 'active' ? ['Live', 'pill-green'] : [l.status, 'pill-grey'];
  return (
    <>
      <div className="row between">
        <h1 style={{ fontSize: 28 }}>Direct-sale listings</h1>
        <Link href="/seller/listings/new" className="btn btn-primary">List an item</Link>
      </div>
      <section className="panel">
        {rows.length === 0 ? <p className="small muted">No listings yet. <Link href="/seller/listings/new">List your first item</Link>.</p> : (
          <div className="scroll-x">
            <table className="data" style={{ minWidth: 640 }}>
              <thead><tr><th>Item</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {rows.map((l) => {
                  const [t, c] = state(l);
                  return (
                    <tr key={l.id}>
                      <td><b>{l.title}</b><div className="small muted">DS-{l.ref_no} · {l.subcategory ?? l.category}</div></td>
                      <td className="small">{listingPrice(l)}</td>
                      <td>{l.stock}</td>
                      <td><span className={`pill ${c}`}>{t}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        {l.status !== 'draft' && <Link href={`/direct-sale/${l.slug}`} className="btn btn-outline btn-sm" style={{ marginRight: 6 }}>View</Link>}
                        <Link href={`/seller/listings/${l.id}`} className="btn btn-outline btn-sm">Edit</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
