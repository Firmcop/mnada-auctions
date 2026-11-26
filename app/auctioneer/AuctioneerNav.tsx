'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  ['/auctioneer', 'Dashboard'],
  ['/auctioneer/auctions/new', 'New auction'],
  ['/auctioneer/import', 'Bulk import lots'],
  ['/auctioneer/allocations', 'Allocation'],
  ['/auctioneer/payouts', 'Sales & payouts'],
  ['/studio', 'Marketing Studio'],
  ['/auctioneer/profile', 'Firm profile & team'],
];

export default function AuctioneerNav() {
  const path = usePathname();
  return (
    <>
      {ITEMS.map(([href, label]) => {
        const on = href === '/auctioneer' ? path === '/auctioneer' || (path.startsWith('/auctioneer/auctions/') && !path.endsWith('/new')) || path.startsWith('/auctioneer/lots') : path.startsWith(href);
        return <Link key={href} href={href} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}>{label}</Link>;
      })}
    </>
  );
}
