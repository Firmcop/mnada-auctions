import Link from 'next/link';
import { photoUrl } from '@/lib/format';

export type FirmBadgeData = { slug: string; name: string; licence_no: string; logo: string | null };

export default function FirmBadge({ firm, compact = false }: { firm: FirmBadgeData; compact?: boolean }) {
  return (
    <Link href={`/auctioneers/${firm.slug}`} className="row" style={{ gap: 10, textDecoration: 'none', color: 'inherit', alignItems: 'center' }}>
      {firm.logo && <img src={photoUrl(firm.logo)} alt="" width={compact ? 28 : 40} height={compact ? 28 : 40} style={{ borderRadius: 8, objectFit: 'cover', background: '#fff', border: '1px solid var(--line)' }} />}
      <span className="stack" style={{ gap: 0 }}>
        <span className="small muted">Auction run by</span>
        <b className="small">{firm.name} · licensed auctioneer {firm.licence_no}</b>
      </span>
    </Link>
  );
}
