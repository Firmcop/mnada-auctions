'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  ['/admin', 'Dashboard'],
  ['/admin/auctions', 'Auctions & lots'],
  ['/admin/listings', 'Direct sale'],
  ['/admin/enquiries', 'Enquiries & offers'],
  ['/admin/import', 'Bulk import'],
  ['/admin/ai', 'AI tools & billing'],
  ['/admin/bidders', 'Bidders'],
  ['/admin/sellers', 'Sellers'],
  ['/admin/consignments', 'Items sent for auction'],
  ['/admin/invoices', 'Payments & collection'],
  ['/admin/valuations', 'Valuation requests'],
];

export default function AdminNav() {
  const path = usePathname();
  return (
    <>
      {ITEMS.map(([href, label]) => {
        const on = href === '/admin' ? path === '/admin' : path.startsWith(href);
        return <Link key={href} href={href} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}>{label}</Link>;
      })}
    </>
  );
}
