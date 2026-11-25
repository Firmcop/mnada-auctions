'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { kes, photoUrl } from '@/lib/format';
import { SearchIcon } from './Icons';

type Hit = { id: string; title: string; category: string | null; location: string | null; photos: string[]; bid_count: number; current_bid: number | null; start_bid: number };

export default function SearchBox() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const term = q.replace(/[%,()]/g, ' ').trim();
    if (term.length < 2) { setHits([]); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('auction_lots')
        .select('id, title, category, location, photos, bid_count, current_bid, start_bid, auction_auctions!inner(status)')
        .eq('status', 'open')
        .eq('auction_auctions.status', 'live')
        .or(`title.ilike.%${term}%,category.ilike.%${term}%,description.ilike.%${term}%,location.ilike.%${term}%`)
        .order('closes_at')
        .limit(6);
      setHits((data ?? []) as unknown as Hit[]);
      setActive(-1);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q, supabase]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  function go(path: string) {
    setOpen(false);
    router.push(path);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || hits.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(hits.length - 1, a + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
    if (e.key === 'Escape') setOpen(false);
    if (e.key === 'Enter' && active >= 0) { e.preventDefault(); go(`/lots/${hits[active].id}`); }
  }

  const showPanel = open && q.trim().length >= 2;

  return (
    <form ref={boxRef} className="search" role="search" action="/search" style={{ position: 'relative' }}
      onSubmit={(e) => { e.preventDefault(); if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`); }}>
      <label htmlFor="q" className="sr">Search lots</label>
      <input id="q" name="q" type="search" autoComplete="off" placeholder="Search excavators, containers, welders, trucks…"
        value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey}
        role="combobox" aria-expanded={showPanel} aria-controls="search-results" aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `hit-${hits[active]?.id}` : undefined} />
      <button type="submit" aria-label="Search"><SearchIcon /></button>
      {showPanel && (
        <div id="search-results" role="listbox" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#fff', border: '1px solid var(--line)', borderRadius: 10, boxShadow: '0 12px 32px rgba(15,42,61,.14)', zIndex: 40, overflow: 'hidden' }}>
          {loading && hits.length === 0 && <div className="small muted" style={{ padding: 14 }}>Searching…</div>}
          {!loading && hits.length === 0 && <div className="small muted" style={{ padding: 14 }}>No open lots match “{q.trim()}”.</div>}
          {hits.map((h, i) => (
            <a key={h.id} id={`hit-${h.id}`} role="option" aria-selected={i === active} href={`/lots/${h.id}`}
              onClick={(e) => { e.preventDefault(); go(`/lots/${h.id}`); }}
              style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 12px', textDecoration: 'none', color: 'inherit', background: i === active ? 'var(--surface)' : '#fff', borderBottom: '1px solid #F0F2F4' }}>
              <span className="thumb" style={{ width: 56, height: 42, borderRadius: 6, flex: 'none', background: '#E6EAEE' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {h.photos?.[0] && <img src={photoUrl(h.photos[0])} alt="" />}
              </span>
              <span className="stack" style={{ gap: 0, flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.title}</span>
                <span className="small muted">{[h.category, h.location].filter(Boolean).join(' · ')}</span>
              </span>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)', whiteSpace: 'nowrap' }}>KES {kes(h.bid_count > 0 ? h.current_bid : h.start_bid)}</span>
            </a>
          ))}
          {hits.length > 0 && (
            <a href={`/search?q=${encodeURIComponent(q.trim())}`} onClick={(e) => { e.preventDefault(); go(`/search?q=${encodeURIComponent(q.trim())}`); }}
              style={{ display: 'block', padding: '10px 12px', fontWeight: 600, fontSize: 14 }}>See all results for “{q.trim()}”</a>
          )}
        </div>
      )}
    </form>
  );
}
