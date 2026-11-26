'use client';
import { useMemo, useState } from 'react';
import { subsOf } from '@/lib/categories';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { uploadPhoto } from '@/lib/image';
import SeoFields from '@/components/SeoFields';
import { lotSeoDescription, lotSeoTitle } from '@/lib/seo';
import { eatInputToIso, isoToEatInput } from '@/lib/eat-input';
import { CATEGORIES, CONDITION_TAGS, kes, photoUrl, SELLER_TYPES, type ExtraCost, type Lot } from '@/lib/format';

type Props = {
  auctionId: string;
  auctionTitle: string;
  lot?: Lot;
  reserve?: number | null;
  defaultLotNo: number;
  defaultClose: string | null;
  basePath?: string;
  photoFolder?: string;
  mode?: 'admin' | 'auctioneer';
  locked?: boolean;
};

export default function LotForm({ auctionId, auctionTitle, lot, reserve, defaultLotNo, defaultClose, basePath = '/admin', photoFolder = 'lots', mode = 'admin', locked = false }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const lotId = useMemo(() => lot?.id ?? crypto.randomUUID(), [lot]);
  const [title, setTitle] = useState(lot?.title ?? '');
  const [startBid, setStartBid] = useState<number>(Number(lot?.start_bid ?? 0));
  const [photos, setPhotos] = useState<string[]>(lot?.photos ?? []);
  const [specs, setSpecs] = useState<[string, string][]>(lot?.specs?.length ? lot.specs : [['Make / model', ''], ['Year', '']]);
  const [category, setCategory] = useState<string>(lot?.category ?? CATEGORIES[0]);
  const [tags, setTags] = useState<string[]>(lot?.condition_tags ?? []);
  const [extras, setExtras] = useState<ExtraCost[]>(lot?.extra_costs ?? []);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const hasBids = (lot?.bid_count ?? 0) > 0;

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    const added: string[] = [];
    for (const file of files) {
      const r = await uploadPhoto(supabase, `${photoFolder}/${lotId}`, file);
      if (r.error || !r.path) setMsg({ ok: false, text: `Upload failed: ${r.error}` });
      else setPhotos((p) => [...p, r.path as string]);
    }
    setPhotos((p) => [...p, ...added]);
    setUploading(false);
    e.target.value = '';
  }

  function move(i: number, dir: -1 | 1) {
    setPhotos((p) => {
      const n = [...p];
      const j = i + dir;
      if (j < 0 || j >= n.length) return p;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) ?? '').trim();
    const row = {
      id: lotId,
      auction_id: auctionId,
      lot_no: locked && lot ? lot.lot_no : Number(g('lot_no')),
      title,
      category: g('category') || null,
      subcategory: g('subcategory') || null,
      description: g('description') || null,
      location: g('location') || null,
      specs: specs.filter(([k, v]) => k.trim() && v.trim()),
      photos,
      start_bid: startBid,
      closes_at: locked && lot ? lot.closes_at : eatInputToIso(g('closes_at')),
      vat_on_hammer: locked && lot ? lot.vat_on_hammer : f.get('vat_on_hammer') === 'on',
      sale_type: locked && lot ? (lot.sale_type ?? 'standard') : (g('sale_type') === 'allocation' ? 'allocation' : 'standard'),
      condition_tags: tags,
      seo_title: g('seo_title') || null,
      seo_description: g('seo_description') || null,
      seller_type: mode === 'auctioneer' ? (lot?.seller_type ?? 'commercial') : g('seller_type') || 'own',
      extra_costs: extras.filter((x) => x.label.trim() && Number(x.amount) > 0).map((x) => ({ label: x.label.trim(), amount: Number(x.amount), mandatory: x.mandatory })),
    };
    const reserveVal = g('reserve').replace(/[^0-9]/g, '');
    setBusy(true);
    setMsg(null);
    const { error } = lot
      ? await supabase.from('auction_lots').update(row).eq('id', lotId)
      : await supabase.from('auction_lots').insert(row);
    if (error) { setBusy(false); setMsg({ ok: false, text: error.message.includes('duplicate') ? 'That lot number is already used in this auction.' : error.message }); return; }
    const { error: e2 } = locked ? { error: null } : await supabase.from('auction_lot_private').upsert({ lot_id: lotId, reserve: reserveVal ? Number(reserveVal) : null });
    setBusy(false);
    if (e2) { setMsg({ ok: false, text: e2.message }); return; }
    if (!lot) { router.replace(`${basePath}/lots/${lotId}?saved=1`); return; }
    setMsg({ ok: true, text: 'Saved.' });
    router.refresh();
  }

  async function duplicate() {
    if (!lot) return;
    const { data: last } = await supabase.from('auction_lots').select('lot_no, closes_at').eq('auction_id', auctionId).order('lot_no', { ascending: false }).limit(1).single();
    const newId = crypto.randomUUID();
    const { error } = await supabase.from('auction_lots').insert({
      id: newId, auction_id: auctionId, lot_no: (last?.lot_no ?? lot.lot_no) + 1, title: `${lot.title} (copy)`,
      category: lot.category, subcategory: lot.subcategory, description: lot.description, specs: lot.specs, photos: lot.photos,
      location: lot.location, start_bid: lot.start_bid, vat_on_hammer: lot.vat_on_hammer, condition_tags: lot.condition_tags,
      seller_type: lot.seller_type, extra_costs: lot.extra_costs,
      closes_at: new Date(new Date(last?.closes_at ?? lot.closes_at).getTime() + 60000).toISOString(),
    });
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    router.push(`${basePath}/lots/${newId}?saved=1`);
  }

  async function remove() {
    if (!lot || hasBids) return;
    if (!window.confirm('Delete this lot? This cannot be undone.')) return;
    const { error } = await supabase.from('auction_lots').delete().eq('id', lot.id);
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    router.replace(`${basePath}/auctions/${auctionId}`);
  }

  const checks: [boolean, string][] = [
    [title.trim().length > 10, 'Clear title'],
    [photos.length >= 6, photos.length >= 6 ? 'At least 6 photos' : `Add ${6 - photos.length} more photo(s) (6 recommended)`],
    [specs.filter(([k, v]) => k && v).length >= 2, 'Key specifications'],
    [startBid > 0, 'Starting bid set'],
  ];

  return (
    <form onSubmit={submit} className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
      <div className="stack" style={{ flex: '2 1 520px', minWidth: 0, gap: 18 }}>
        <section className="panel stack" style={{ gap: 14 }}>
          <h3>Details</h3>
          <span className="small muted">Auction: {auctionTitle}</span>
          <label className="field">Lot title<input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
          <div className="grid2">
            <label className="field">Lot number<input className="input" name="lot_no" type="number" min="1" required disabled={locked} defaultValue={lot?.lot_no ?? defaultLotNo} /></label>
            <label className="field">Category
              <select className="input" name="category" value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            </label>
            <label className="field">Type
              <select className="input" name="subcategory" key={category} defaultValue={lot?.category === category ? lot?.subcategory ?? '' : ''}>
                <option value="">—</option>
                {subsOf(category).map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="field">Location<input className="input" name="location" defaultValue={lot?.location ?? ''} /></label>
          </div>
          <label className="field">Condition notes<textarea className="input" name="description" rows={4} defaultValue={lot?.description ?? ''} /></label>
          {mode === 'admin' && <div className="grid2">
            <label className="field">Seller
              <select className="input" name="seller_type" defaultValue={lot?.seller_type ?? 'own'}>
                {Object.entries(SELLER_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>}
          <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="stack">
            <legend style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, padding: 0 }}>Condition tags</legend>
            <div className="row" style={{ gap: '8px 18px' }}>
              {Object.entries(CONDITION_TAGS).map(([v, l]) => (
                <label key={v} className="check"><input type="checkbox" checked={tags.includes(v)} onChange={(e) => setTags((t) => e.target.checked ? [...t, v] : t.filter((x) => x !== v))} />{l}</label>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="panel stack" style={{ gap: 12 }}>
          <div className="row between"><h3>Photos</h3><span className="small muted">{photos.length} photos · first is the cover</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
            {photos.map((p, i) => (
              <div key={p} className="stack" style={{ gap: 4 }}>
                <div className="thumb" style={{ height: 90, borderRadius: 8, border: i === 0 ? '2px solid var(--navy)' : '2px solid transparent' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl(p)} alt={`Photo ${i + 1}`} />
                </div>
                <div className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                  <button type="button" className="btn btn-outline btn-sm" style={{ flex: 1, padding: 0 }} aria-label="Move left" onClick={() => move(i, -1)}>←</button>
                  <button type="button" className="btn btn-outline btn-sm" style={{ flex: 1, padding: 0 }} aria-label="Move right" onClick={() => move(i, 1)}>→</button>
                  <button type="button" className="btn btn-outline btn-sm" style={{ flex: 1, padding: 0, color: 'var(--danger)' }} aria-label="Remove photo" onClick={() => setPhotos((ps) => ps.filter((x) => x !== p))}>✕</button>
                </div>
              </div>
            ))}
            <label className="btn btn-outline" style={{ height: 90, borderStyle: 'dashed' }}>
              {uploading ? 'Uploading…' : '+ Add photos'}
              <input type="file" accept="image/*" multiple className="sr" onChange={upload} disabled={uploading} />
            </label>
          </div>
        </section>

        <section className="panel stack" style={{ gap: 10 }}>
          <h3>Specifications</h3>
          {specs.map(([k, v], i) => (
            <div key={i} className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
              <input className="input" aria-label="Spec name" value={k} onChange={(e) => setSpecs((s) => s.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} style={{ background: '#F7F8FA' }} />
              <input className="input" aria-label="Spec value" value={v} onChange={(e) => setSpecs((s) => s.map((x, j) => (j === i ? [x[0], e.target.value] : x)))} />
              <button type="button" className="btn btn-outline" aria-label="Remove spec" onClick={() => setSpecs((s) => s.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button type="button" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setSpecs((s) => [...s, ['', '']])}>+ Add specification</button>
        </section>

        <section className="panel stack" style={{ gap: 10 }}>
          <h3>Additional costs</h3>
          {locked && <p className="small muted">The auction is published, so costs, pricing and closing times are locked.</p>}
          <p className="small muted">E.g. loading fee, crane offloading, delivery, assembly. Mandatory costs are added to the winner&apos;s invoice (plus 16% VAT); optional ones are shown as available on request.</p>
          {extras.map((x, i) => (
            <div key={i} className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
              <input className="input" aria-label="Cost description" placeholder="e.g. Loading onto buyer's truck" value={x.label} onChange={(e) => setExtras((xs) => xs.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))} />
              <input className="input" aria-label="Amount in KES" inputMode="numeric" placeholder="KES" style={{ maxWidth: 150 }} value={x.amount ? kes(x.amount) : ''} onChange={(e) => setExtras((xs) => xs.map((y, j) => (j === i ? { ...y, amount: parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0 } : y)))} />
              <label className="check" style={{ whiteSpace: 'nowrap' }}><input type="checkbox" checked={x.mandatory} onChange={(e) => setExtras((xs) => xs.map((y, j) => (j === i ? { ...y, mandatory: e.target.checked } : y)))} />Mandatory</label>
              <button type="button" className="btn btn-outline" aria-label="Remove cost" onClick={() => setExtras((xs) => xs.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          {!locked && <button type="button" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setExtras((xs) => [...xs, { label: '', amount: 0, mandatory: true }])}>+ Add cost</button>}
        </section>

        <section className="panel stack" style={{ gap: 14 }}>
          <h3>Pricing &amp; closing</h3>
          <div className="grid2">
            <label className="field">Starting bid (KES)
              <input className="input" inputMode="numeric" value={startBid ? startBid.toLocaleString('en-US') : ''} disabled={hasBids || locked}
                onChange={(e) => setStartBid(parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0)} required />
            </label>
            <label className="field">Reserve, hidden (KES, optional)<input className="input" name="reserve" inputMode="numeric" disabled={locked} defaultValue={reserve ? kes(reserve) : ''} placeholder="No reserve" /></label>
            <label className="field">Closes (Nairobi time)<input className="input" type="datetime-local" name="closes_at" required disabled={locked} defaultValue={isoToEatInput(lot?.closes_at ?? defaultClose)} /></label>
          </div>
          <label className="field">How this lot sells
            <select className="input" name="sale_type" disabled={locked} defaultValue={lot?.sale_type ?? 'standard'}>
              <option value="standard">Automatically to the highest bid at or above the reserve (or any bid if no reserve)</option>
              <option value="allocation">Seller approval — the seller decides on the highest bid after closing (allocation)</option>
            </select>
          </label>
          <p className="small muted" style={{ margin: 0 }}>If a reserve is set and not reached, the lot goes to allocation: the seller has 48 hours to accept the highest bid, counter-offer or decline.</p>
          <label className="check"><input type="checkbox" name="vat_on_hammer" disabled={locked} defaultChecked={lot?.vat_on_hammer ?? true} />VAT applies to the hammer price (seller is VAT-registered)</label>
          {hasBids && <p className="small muted">This lot has bids, so the starting bid can no longer change.</p>}
        </section>
        <SeoFields
          path={`/lots/${lotId}`}
          autoTitle={lotSeoTitle({ title: title || 'Lot title', lot_no: lot?.lot_no ?? defaultLotNo })}
          autoDescription={lotSeoDescription({ title: title || 'Lot title', description: lot?.description, location: lot?.location, closes_at: lot?.closes_at ?? defaultClose ?? new Date().toISOString() })}
          title={lot?.seo_title} description={lot?.seo_description} />
      </div>

      <aside className="stack" style={{ flex: '1 1 280px', minWidth: 0, gap: 14, position: 'sticky', top: 16 }}>
        <div className="panel stack" style={{ gap: 10 }}>
          <span className="eyebrow">Ready to publish</span>
          {checks.map(([ok, t]) => (
            <div key={t} className="row small" style={{ gap: 8, flexWrap: 'nowrap' }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: ok ? 'var(--green)' : '#B45309', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flex: 'none' }}>{ok ? '✓' : '!'}</span>
              <span>{t}</span>
            </div>
          ))}
          <p className="small muted">{mode === 'auctioneer' ? 'Lots appear on the site once the auction is published.' : <>Lots appear on the site when the auction&apos;s status is Live.</>}</p>
        </div>
        {msg && <div role="status" className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`}>{msg.text}</div>}
        <button className="btn btn-primary" type="submit" disabled={busy || uploading}>{busy ? 'Saving…' : lot ? 'Save lot' : 'Create lot'}</button>
        {lot && !locked && <button type="button" className="btn btn-outline" onClick={duplicate}>Duplicate as next lot</button>}
        {lot && !hasBids && !locked && <button type="button" className="btn btn-outline" style={{ color: 'var(--danger)' }} onClick={remove}>Delete lot</button>}
      </aside>
    </form>
  );
}
