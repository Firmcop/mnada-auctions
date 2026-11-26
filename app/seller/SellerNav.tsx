'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  ['/seller', 'Dashboard'],
  ['/seller/listings', 'Direct-sale listings'],
  ['/seller/consign', 'Send items for auction'],
  ['/seller/enquiries', 'Enquiries & offers'],
  ['/seller/sales', 'Sales & payouts'],
  ['/account/listing-help', 'Listing Help'],
  ['/account/storage', 'Storage at the yard'],
];

export default function SellerNav() {
  const path = usePathname();
  return (
    <>
      {ITEMS.map(([href, label]) => {
        const on = href === '/seller' ? path === '/seller' : path.startsWith(href);
        return <Link key={href} href={href} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}>{label}</Link>;
      })}
    </>
  );
}
