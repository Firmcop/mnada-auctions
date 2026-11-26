'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CATEGORY_TREE, searchHref } from '@/lib/categories';
import { photoUrl } from '@/lib/format';

export type FeaturedItem = { href: string; title: string; price: string; photo?: string; category: string; badge: string };

const TABS: { label: string; cats: string[] }[] = [
  { label: 'Machinery', cats: ['Construction & earthmoving', 'Metalworking', 'Lifting & handling', 'Industrial & processing'] },
  { label: 'Transport & agriculture', cats: ['Trucks & transport', 'Agriculture'] },
  { label: 'Buildings & structures', cats: ['Container houses & modular', 'Steel structures'] },
];

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default function MegaMenu({ featured }: { featured: FeaturedItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  useEffect(() => { setOpen(null); }, [pathname]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, []);

  const hoverOpen = (i: number) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpen(i), 120);
  };
  const hoverClose = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpen(null), 200);
  };

  const tab = open !== null ? TABS[open] : null;
  const picks = tab ? featured.filter((f) => tab.cats.includes(f.category)).slice(0, 3) : [];

  return (
    <div ref={wrapRef} className="mega" onMouseLeave={hoverClose} onMouseEnter={() => hoverTimer.current && open !== null && clearTimeout(hoverTimer.current)}>
      <div className="wrap mega-bar">
        <div className="mega-tabs">
          {TABS.map((t, i) => (
            <button key={t.label} type="button" className={`mega-tab${open === i ? ' on' : ''}`} aria-expanded={open === i} aria-controls="mega-panel"
              onClick={() => setOpen(open === i ? null : i)} onMouseEnter={() => hoverOpen(i)}>
              {t.label} <Chevron open={open === i} />
            </button>
          ))}
          <Link href="/direct-sale" className="mega-tab mega-direct" onMouseEnter={hoverClose}>Buy now · Direct sale</Link>
        </div>
        <div className="mega-right">
          <Link href="/#auctions">Live auctions</Link>
          <Link href="/search">All open lots</Link>
        </div>
      </div>

      {tab && (
        <div id="mega-panel" className="mega-panel" role="region" aria-label={`${tab.label} categories`}>
          <div className="wrap mega-inner">
            <div className="mega-cols">
              {tab.cats.map((name) => {
                const c = CATEGORY_TREE.find((x) => x.name === name)!;
                return (
                  <div key={name} className="mega-col">
                    <Link href={searchHref(name)} className="mega-head">{name}</Link>
                    {c.subs.map((s) => <Link key={s} href={searchHref(name, s)} className="mega-sub">{s}</Link>)}
                  </div>
                );
              })}
            </div>
            <aside className="mega-picks" aria-label="Featured">
              <span className="mega-head" style={{ cursor: 'default' }}>Go directly to</span>
              {picks.length === 0 && <span className="small muted">New items are added every week.</span>}
              {picks.map((p) => (
                <Link key={p.href} href={p.href} className="mega-pick">
                  <span className="thumb" style={{ width: 84, height: 62, borderRadius: 6, flex: 'none', background: '#E6EAEE' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.photo && <img src={photoUrl(p.photo)} alt="" />}
                  </span>
                  <span className="stack" style={{ gap: 2, minWidth: 0 }}>
                    <span className="small" style={{ fontWeight: 600, color: 'var(--navy)', lineHeight: 1.3 }}>{p.title}</span>
                    <span className="small" style={{ fontWeight: 700 }}>{p.price}</span>
                    <span className="eyebrow" style={{ fontSize: 11 }}>{p.badge}</span>
                  </span>
                </Link>
              ))}
            </aside>
          </div>
          <div className="wrap row" style={{ paddingBottom: 22 }}>
            <Link href="/search" className="btn btn-outline btn-sm">All open lots</Link>
            <Link href="/direct-sale" className="btn btn-outline btn-sm">Direct sale catalogue</Link>
          </div>
        </div>
      )}
    </div>
  );
}
