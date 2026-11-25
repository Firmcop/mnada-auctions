import Link from 'next/link';
import { kes, photoUrl, type Lot } from '@/lib/format';
import Countdown from './Countdown';

export function Photo({ src, label, height }: { src?: string; label: string; height: number | string }) {
  if (src) {
    return (
      <div className="thumb" style={{ height }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl(src)} alt={label} loading="lazy" />
      </div>
    );
  }
  return <div className="ph" style={{ height }}>Photo coming soon</div>;
}

export default function LotCard({ lot, place }: { lot: Lot; place?: string | null }) {
  return (
    <Link href={`/lots/${lot.id}`} className="lot-card">
      <Photo src={lot.photos?.[0]} label={lot.title} height={180} />
      <div className="body">
        <span className="eyebrow">Lot {lot.lot_no}{place || lot.location ? ` · ${place || lot.location}` : ''}</span>
        <span style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.35 }}>{lot.title}</span>
        <div className="row between" style={{ marginTop: 'auto', paddingTop: 8, alignItems: 'flex-end' }}>
          <div className="stack" style={{ gap: 2 }}>
            <span className="small muted">{lot.bid_count > 0 ? `Current bid · ${lot.bid_count} bids` : 'Starting bid'}</span>
            <span className="price">KES {kes(lot.bid_count > 0 ? lot.current_bid : lot.start_bid)}</span>
          </div>
          {lot.status === 'open' ? <Countdown closesAt={lot.closes_at} /> : <span className="pill pill-grey">{lot.status === 'sold' ? 'Sold' : 'Closed'}</span>}
        </div>
      </div>
    </Link>
  );
}
