import { requireArea } from '@/lib/require-area';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { listingPrice, type Listing } from '@/lib/format';
import ReviewButtons from './ReviewButtons';

export default async function AdminListings() {
  await requireArea('catalogue');
  const supabase = await createClient();
  const { data } = await supabase.from('auction_listings').select('*').order('created_at', { ascending: false });
  const { data: enq } = await supabase.from('auction_enquiries').select('listing_id, status');
  const rows = (data ?? []) as Listing[];
  const pending = rows.filter((l) => l.review_status === 'pending');
  const ownerIds = Array.from(new Set(rows.map((l) => l.owner_id).filter(Boolean))) as string[];
  const { data: owners } = ownerIds.length ? await supabase.from('auction_profiles').select('id, business_name').in('id', ownerIds) : { data: [] };
  const ownerName = (id: string | null) => (owners ?? []).find((o) => o.id === id)?.business_name ?? null;
  const newFor = (id: string) => (enq ?? []).filter((e) => e.listing_id === id && e.status === 'new').length;
  return (
    <>
      <div className="row between">
        <h1 style={{ fontSize: 28 }}>Direct sale</h1>
        <div className="row"><Link href="/admin/import" className="btn btn-outline">Bulk import from spreadsheet</Link><Link href="/admin/listings/new" className="btn btn-primary">Add item</Link></div>
      </div>
      {pending.length > 0 && (
        <section className="panel stack" style={{ gap: 0, border: '2px solid #F2C3A8' }}>
          <h3 style={{ marginBottom: 8 }}>Waiting for review ({pending.length})</h3>
          {pending.map((l) => (
            <div key={l.id} className="row" style={{ padding: '12px 0', borderBottom: '1px solid var(--line)', gap: '8px 18px' }}>
              <span className="stack" style={{ gap: 2, flex: '1 1 280px' }}>
                <b>{l.title}</b>
                <span className="small muted">by {ownerName(l.owner_id) ?? 'seller'} · {l.subcategory ?? l.category} · {listingPrice(l)} · {l.photos.length} photos</span>
              </span>
              <Link href={`/admin/listings/${l.id}`} className="btn btn-outline btn-sm">Open</Link>
              <ReviewButtons id={l.id} />
            </div>
          ))}
        </section>
      )}
      <section className="panel">
        <div className="scroll-x">
          <table className="data" style={{ minWidth: 720 }}>
            <thead><tr><th>Item</th><th>Price</th><th>Stock</th><th>Status</th><th>New enquiries</th><th></th></tr></thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id}>
                  <td><b>{l.title}</b><div className="small muted">DS-{l.ref_no} · {l.subcategory ?? l.category}{l.featured ? ' · featured' : ''}{l.owner_id ? ` · seller: ${ownerName(l.owner_id) ?? '—'}` : ''}</div></td>
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
