'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Countdown from '@/components/Countdown';
import { Photo } from '@/components/LotCard';
import WatchButton from '@/components/WatchButton';
import { CONDITION_TAGS, kes, type Lot } from '@/lib/format';

type Sort = 'lot' | 'closing' | 'bids' | 'price_low' | 'price_high';
const SORTS: [Sort, string][] = [['closing', 'Closing time'], ['lot', 'Lot number'], ['bids', 'Most bids'], ['price_low', 'Price: low to high'], ['price_high', 'Price: high to low']];

const price = (l: Lot) => Number(l.bid_count > 0 ? l.current_bid : l.start_bid);
const hasDelivery = (l: Lot) => (l.extra_costs ?? []).some((e) => /deliver|transport/i.test(e.label));

export default function AuctionLots({ lots, watched, signedIn }: { lots: Lot[]; watched: string[]; signedIn: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [cats, setCats] = useState<string[]>(() => (params.get('cat') ?? '').split(',').filter(Boolean));
  const [q, setQ] = useState(params.get('q') ?? '');
  const [min, setMin] = useState(params.get('min') ?? '');
  const [max, setMax] = useState(params.get('max') ?? '');
  const [noBids, setNoBids] = useState(params.get('nobids') === '1');
  const [mine, setMine] = useState(params.get('watch') === '1');
  const [delivery, setDelivery] = useState(params.get('delivery') === '1');
  const [sort, setSort] = useState<Sort>((params.get('sort') as Sort) || 'closing');
  const [showFilters, setShowFilters] = useState(false);
  const watchSet = useMemo(() => new Set(watched), [watched]);

  // keep the URL shareable
  useEffect(() => {
    const p = new URLSearchParams();
    if (cats.length) p.set('cat', cats.join(','));
    if (q.trim()) p.set('q', q.trim());
    if (min) p.set('min', min);
    if (max) p.set('max', max);
    if (noBids) p.set('nobids', '1');
    if (mine) p.set('watch', '1');
    if (delivery) p.set('delivery', '1');
    if (sort !== 'closing') p.set('sort', sort);
    const s = p.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }, [cats, q, min, max, noBids, mine, delivery, sort, pathname, router]);

  const num = (s: string) => Number(s.replace(/[^0-9]/g, '')) || 0;
  // everything except the category filter — used for the category counts
  const base = useMemo(() => lots.filter((l) => {
    if (q.trim()) {
      const hay = `${l.lot_no} ${l.title} ${l.description ?? ''} ${l.category ?? ''} ${l.subcategory ?? ''}`.toLowerCase();
      if (!q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w))) return false;
    }
    if (min && price(l) < num(min)) return false;
    if (max && price(l) > num(max)) return false;
    if (noBids && l.bid_count > 0) return false;
    if (mine && !watchSet.has(l.id)) return false;
    if (delivery && !hasDelivery(l)) return false;
    return true;
  }), [lots, q, min, max, noBids, mine, delivery, watchSet]);

  const allCats = useMemo(() => Array.from(new Set(lots.map((l) => l.category).filter(Boolean))) as string[], [lots]);
  const shown = useMemo(() => {
    const list = cats.length ? base.filter((l) => l.category && cats.includes(l.category)) : base;
    const sorted = [...list];
    if (sort === 'lot') sorted.sort((a, b) => a.lot_no - b.lot_no);
    if (sort === 'closing') sorted.sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) || a.closes_at.localeCompare(b.closes_at) || a.lot_no - b.lot_no);
    if (sort === 'bids') sorted.sort((a, b) => b.bid_count - a.bid_count);
    if (sort === 'price_low') sorted.sort((a, b) => price(a) - price(b));
    if (sort === 'price_high') sorted.sort((a, b) => price(b) - price(a));
    return sorted;
  }, [base, cats, sort]);

  const active = cats.length + (min ? 1 : 0) + (max ? 1 : 0) + (noBids ? 1 : 0) + (mine ? 1 : 0) + (delivery ? 1 : 0);
  function clear() { setCats([]); setMin(''); setMax(''); setNoBids(false); setMine(false); setDelivery(false); setQ(''); }
  const toggleCat = (c: string) => setCats((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));

  return (
    <section className="auction-lots">
      <div className="auction-search">
        <input className="input" type="search" placeholder="Search in this auction…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search in this auction" />
        <button type="button" className="btn btn-outline filters-toggle" aria-expanded={showFilters} onClick={() => setShowFilters((v) => !v)}>Filters{active ? ` (${active})` : ''}</button>
      </div>
      <div className="auction-body">
        <aside aria-label="Filters" className={`lot-filters${showFilters ? ' open' : ''}`}>
          <fieldset>
            <legend>Category</legend>
            {allCats.map((c) => {
              const n = base.filter((l) => l.category === c).length;
              return (
                <label key={c} className="filter-check">
                  <input type="checkbox" checked={cats.includes(c)} onChange={() => toggleCat(c)} />
                  <span>{c}</span><span className="count">{n}</span>
                </label>
              );
            })}
          </fieldset>
          <fieldset>
            <legend>Current bid (KES)</legend>
            <div className="row" style={{ gap: 8, flexWrap: 'nowrap', alignItems: 'center' }}>
              <input className="input" inputMode="numeric" placeholder="Min" aria-label="Minimum current bid" value={min} onChange={(e) => setMin(e.target.value.replace(/[^0-9]/g, ''))} />
              <span className="muted">–</span>
              <input className="input" inputMode="numeric" placeholder="Max" aria-label="Maximum current bid" value={max} onChange={(e) => setMax(e.target.value.replace(/[^0-9]/g, ''))} />
            </div>
          </fieldset>
          <fieldset>
            <legend>Show</legend>
            <label className="filter-check"><input type="checkbox" checked={noBids} onChange={(e) => setNoBids(e.target.checked)} /><span>Lots without bids</span><span className="count">{lots.filter((l) => l.bid_count === 0).length}</span></label>
            <label className="filter-check"><input type="checkbox" checked={mine} onChange={(e) => { if (!signedIn) { router.push(`/login?next=${pathname}`); return; } setMine(e.target.checked); }} /><span>My watchlist only</span><span className="count">{lots.filter((l) => watchSet.has(l.id)).length}</span></label>
            <label className="filter-check"><input type="checkbox" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} /><span>Delivery available</span><span className="count">{lots.filter(hasDelivery).length}</span></label>
          </fieldset>
          {active > 0 && <button type="button" className="btn btn-outline btn-sm" onClick={clear}>Clear all filters</button>}
        </aside>

        <div className="lot-results">
          <div className="lot-results-head">
            <span><b>{shown.length} lot{shown.length === 1 ? '' : 's'}</b>{cats.length === 1 ? <span className="muted"> in {cats[0]}</span> : cats.length > 1 ? <span className="muted"> in {cats.length} categories</span> : null}</span>
            <label className="row small" style={{ gap: 10, alignItems: 'center', flexWrap: 'nowrap' }}>
              <span className="muted">Sort</span>
              <select className="input" style={{ width: 200 }} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                {SORTS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </label>
          </div>
          {shown.map((l) => {
            const open = l.status === 'open';
            const tags = (l.condition_tags ?? []).map((t) => CONDITION_TAGS[t]).filter(Boolean).slice(0, 2);
            return (
              <article key={l.id} className="lot-row">
                <Link href={`/lots/${l.id}`} className="lot-row-photo" tabIndex={-1} aria-hidden="true"><Photo src={l.photos?.[0]} label={l.title} height={104} /></Link>
                <div className="lot-row-main">
                  <span className="eyebrow">Lot {l.lot_no}</span>
                  <Link href={`/lots/${l.id}`} className="lot-row-title">{l.title}</Link>
                  <span className="small muted">{[l.subcategory || l.category, ...tags].filter(Boolean).join(' · ')}</span>
                </div>
                <div className="lot-row-price">
                  <span className="small muted">{l.bid_count > 0 ? `${l.bid_count} bid${l.bid_count === 1 ? '' : 's'}` : 'Starting bid'}</span>
                  <span className="price">KES {kes(price(l))}</span>
                  {open ? <Countdown closesAt={l.closes_at} /> : <span className="small" style={{ fontWeight: 600 }}>{l.status === 'sold' ? 'Sold' : l.status === 'allocation' ? 'Awaiting seller decision' : 'Closed'}</span>}
                </div>
                <div className="lot-row-actions">
                  {open && <WatchButton lotId={l.id} initialWatched={watchSet.has(l.id)} initialCount={l.watch_count ?? 0} signedIn={signedIn} />}
                  <Link href={`/lots/${l.id}`} className={`btn ${open ? 'btn-primary' : 'btn-outline'}`}>{open ? 'Bid' : 'View'}</Link>
                </div>
              </article>
            );
          })}
          {shown.length === 0 && (
            <div className="stack" style={{ padding: '32px 0', gap: 10 }}>
              <span className="muted">No lots match these filters.</span>
              <button type="button" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={clear}>Clear all filters</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
