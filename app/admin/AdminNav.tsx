'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { areaFor, canArea, type StaffRole } from '@/lib/staff';

const ITEMS = [
  ['/admin', 'Dashboard'],
  ['/admin/auctions', 'Auctions & lots'],
  ['/admin/listings', 'Direct sale'],
  ['/admin/enquiries', 'Enquiries & offers'],
  ['/admin/import', 'Bulk import'],
  ['/admin/ai', 'AI tools & billing'],
  ['/admin/bidders', 'Bidders'],
  ['/admin/sellers', 'Sellers'],
  ['/admin/auctioneers', 'Auctioneers'],
  ['/admin/consignments', 'Items sent for auction'],
  ['/admin/help', 'Listing Help jobs'],
  ['/admin/invoices', 'Payments & collection'],
  ['/admin/payouts', 'Seller payouts'],
  ['/admin/finance', 'Finance'],
  ['/admin/expenses', 'Expenses'],
  ['/admin/reports', 'Reports'],
  ['/admin/stock', 'Yard stock'],
  ['/admin/staff', 'Staff & roles'],
  ['/admin/valuations', 'Valuation requests'],
];

export default function AdminNav({ role }: { role: StaffRole }) {
  const path = usePathname();
  return (
    <>
      {ITEMS.filter(([href]) => canArea(role, areaFor(href))).map(([href, label]) => {
        const on = href === '/admin' ? path === '/admin' : path.startsWith(href);
        return <Link key={href} href={href} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}>{label}</Link>;
      })}
    </>
  );
}
