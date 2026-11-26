import Link from 'next/link';
import { listingPrice, type Listing } from '@/lib/format';
import { Photo } from './LotCard';

export default function ListingCard({ listing: l }: { listing: Listing }) {
  return (
    <Link href={`/direct-sale/${l.slug}`} className="lot-card" style={{ position: 'relative' }}>
      <Photo src={l.photos?.[0]} label={l.title} height={180} />
      <span className="pill" style={{ position: 'absolute', top: 10, left: 10, background: 'var(--navy)', color: '#fff' }}>
        {l.status === 'reserved' ? 'RESERVED' : l.status === 'sold' ? 'SOLD' : 'BUY NOW'}
      </span>
      <div className="body">
        <span className="eyebrow">{l.subcategory ?? l.category}{l.location ? ` · ${l.location}` : ''}</span>
        <span style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.35 }}>{l.title}</span>
        {l.summary && <span className="small" style={{ color: 'var(--body)' }}>{l.summary}</span>}
        <div className="row between" style={{ marginTop: 'auto', paddingTop: 8, alignItems: 'flex-end' }}>
          <span className="price" style={{ fontSize: l.price === null ? 17 : 20 }}>{listingPrice(l)}</span>
          {l.stock > 1 && l.status === 'active' && <span className="small muted">{l.stock} available</span>}
        </div>
      </div>
    </Link>
  );
}
