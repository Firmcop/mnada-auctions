'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS: [string, string][] = [
  ['/campus/dashboard', 'Wallet & progress'],
  ['/campus/leads', 'Scout leads'],
  ['/campus/gigs', 'Gigs'],
  ['/campus/videos', 'Videos'],
  ['/campus/referrals', 'My bidders'],
  ['/campus', 'Programme & leaderboard'],
];

export default function CampusNav({ active }: { active: boolean }) {
  const path = usePathname();
  return (
    <nav className="row small" aria-label="Mnada Campus" style={{ gap: 8 }}>
      {ITEMS.filter(([h]) => active || h === '/campus/dashboard' || h === '/campus').map(([href, label]) => (
        <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}
          className={`btn btn-sm ${path === href ? 'btn-primary' : 'btn-outline'}`}>{label}</Link>
      ))}
    </nav>
  );
}
