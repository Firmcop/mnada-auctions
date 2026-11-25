'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  ['/admin', 'Dashboard'],
  ['/admin/auctions', 'Auctions & lots'],
  ['/admin/bidders', 'Bidders'],
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
