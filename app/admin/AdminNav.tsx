'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { areaFor, canArea, type StaffRole } from '@/lib/staff';

type Item = [href: string, label: string];
type Group = { key: string; label: string; items: Item[] };

const TOP: Item[] = [['/admin', 'Dashboard']];

const GROUPS: Group[] = [
  { key: 'sales', label: 'Auctions & sales', items: [
    ['/admin/auctions', 'Auctions & lots'],
    ['/admin/listings', 'Direct sale'],
    ['/admin/import', 'Bulk import'],
    ['/admin/enquiries', 'Enquiries & offers'],
  ] },
  { key: 'people', label: 'Customers & partners', items: [
    ['/admin/bidders', 'Bidders'],
    ['/admin/sellers', 'Sellers'],
    ['/admin/auctioneers', 'Auctioneers'],
    ['/admin/consignments', 'Items sent for auction'],
    ['/admin/valuations', 'Valuation requests'],
  ] },
  { key: 'ops', label: 'Operations', items: [
    ['/admin/help', 'Listing Help jobs'],
    ['/admin/stock', 'Yard stock'],
  ] },
  { key: 'finance', label: 'Finance', items: [
    ['/admin/finance', 'Overview'],
    ['/admin/invoices', 'Payments & collection'],
    ['/admin/payouts', 'Seller payouts'],
    ['/admin/expenses', 'Expenses'],
    ['/admin/reports', 'Reports'],
    ['/admin/ai', 'AI tools & billing'],
  ] },
  { key: 'settings', label: 'Settings', items: [
    ['/admin/staff', 'Staff & roles'],
  ] },
];

const STORE = 'mnada.adminNav.open';

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s', flex: 'none' }}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export default function AdminNav({ role }: { role: StaffRole }) {
  const path = usePathname();
  const isOn = (href: string) => (href === '/admin' ? path === '/admin' : path === href || path.startsWith(`${href}/`));
  const allowed = (items: Item[]) => items.filter(([href]) => canArea(role, areaFor(href)));
  const groups = GROUPS.map((g) => ({ ...g, items: allowed(g.items) })).filter((g) => g.items.length > 0);
  const activeGroup = groups.find((g) => g.items.some(([h]) => isOn(h)))?.key;

  const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? '{}') as Record<string, boolean>;
      setOpen(saved);
    } catch { /* storage unavailable */ }
  }, []);
  useEffect(() => {
    if (activeGroup) setOpen((o) => (o[activeGroup] ? o : { ...o, [activeGroup]: true }));
  }, [activeGroup]);
  function toggle(key: string, current: boolean) {
    setOpen((o) => {
      const next = { ...o, [key]: !current };
      try { localStorage.setItem(STORE, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  return (
    <>
      {allowed(TOP).map(([href, label]) => (
        <Link key={href} href={href} className={isOn(href) ? 'on' : ''} aria-current={isOn(href) ? 'page' : undefined}>{label}</Link>
      ))}
      {groups.map((g) => {
        const shown = open[g.key] ?? g.key === activeGroup;
        return (
          <div key={g.key} className="nav-group">
            <button type="button" className={`nav-folder${g.key === activeGroup ? ' has-active' : ''}`} aria-expanded={shown} aria-controls={`nav-${g.key}`}
              onClick={() => toggle(g.key, shown)}>
              <Chevron open={shown} />
              <span>{g.label}</span>
              <span className="nav-count">{g.items.length}</span>
            </button>
            {shown && (
              <div id={`nav-${g.key}`} className="nav-items">
                {g.items.map(([href, label]) => (
                  <Link key={href} href={href} className={isOn(href) ? 'on' : ''} aria-current={isOn(href) ? 'page' : undefined}>{label}</Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
