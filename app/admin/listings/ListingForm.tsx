'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@/lib/eat-input';
import { subsOf } from '@/lib/categories';
import { CATEGORIES, CONDITION_TAGS, kes, photoUrl, SELLER_TYPES, type Listing } from '@/lib/format';

export default function ListingForm({ listing }: { listing?: Listing }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const id = useMemo(() => listing?.id ?? crypto.randomUUID(), [listing]);
  const [category, setCategory] = useState(listing?.category ?? 'Container houses & modular');
  const [priceType, setPriceType] = useState<Listing['price_type']>(listing?.price_type ?? 'on_request');
  const [price, setPrice] = useState<number>(Number(listing?.price ?? 0));
  const [photos, setPhotos] = useState<string[]>(listing?.photos ?? []);
  const [specs, setSpecs] = useState<[string, string][]>(listing?.specs?.length ? listing.specs : [['Size', ''], ['Material', '']]);
  const [tags, setTags] = useState<string[]>(listing?.condition_tags ?? ['new']);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setUploading(true);
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `listings/${id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error } = await supabase.storage.from('auction-photos').upload(path, file, { cacheControl: '31536000' });
      if (error) setMsg({ ok: false, text: `Upload failed: ${error.message}` });
      else setPhotos((p) => [...p, path]);
    }
    setUploading(false);
    e.target.value = '';
  }

  function move(i: number, dir: -1 | 1) {
    setPhotos((p) => { const n = [...p]; const j = i + dir; if (j < 0 || j >= n.length) return p; [n[i], n[j]] = [n[j], n[i]]; return n; });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) ?? '').trim();
    const title = g('title');
    const row = {
      id,
      slug: listing?.slug ?? `${slugify(title)}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      category,
      subcategory: g('subcategory') || null,
      summary: g('summary') || null,
      description: g('description') || null,
      specs: specs.filter(([k, v]) => k.trim() && v.trim()),
      photos,
      location: g('location') || null,
      price_type: priceType,
      price: priceType === 'on_request' ? null : price || null,
      stock: Number(g('stock') || 1),
      lead_time: g('lead_time') || null,
      condition_tags: tags,
      seller_type: g('seller_type') || 'own',
      status: g('status'),
      featured: f.get('featured') === 'on',
      updated_at: new Date().toISOString(),
    };
    if (priceType !== 'on_request' && !price) { setMsg({ ok: false, text: 'Enter a price, or choose "Price on request".' }); return; }
    setBusy(true);
    setMsg(null);
    const { error } = listing
      ? await supabase.from('auction_listings').update(row).eq('id', id)
      : await supabase.from('auction_listings').insert(row);
    setBusy(false);
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    if (!listing) { router.replace(`/admin/listings/${id}?saved=1`); return; }
    setMsg({ ok: true, text: 'Saved.' });
    router.refresh();
  }

  async function remove() {
    if (!listing || !window.confirm('Delete this item and its enquiries? This cannot be undone.')) return;
    const { error } = await supabase.from('auction_listings').delete().eq('id', listing.id);
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    router.replace('/admin/listings');
  }

  return (
    <form onSubmit={submit} className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
      <div className="stack" style={{ flex: '2 1 520px', minWidth: 0, gap: 18 }}>
        <section className="panel stack" style={{ gap: 14 }}>
          <h3>Details</h3>
          <label className="field">Title<input className="input" name="title" required defaultValue={listing?.title} /></label>
          <label className="field">One-line summary (shown on cards)<input className="input" name="summary" maxLength={160} defaultValue={listing?.summary ?? ''} /></label>
          <div className="grid2">
            <label className="field">Category
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            </label>
            <label className="field">Type
              <select className="input" name="subcategory" key={category} defaultValue={listing?.category === category ? listing?.subcategory ?? '' : ''}>
                <option value="">—</option>{subsOf(category).map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="field">Location<input className="input" name="location" defaultValue={listing?.location ?? 'Ruiru'} /></label>
            <label className="field">Seller
              <select className="input" name="seller_type" defaultValue={listing?.seller_type ?? 'own'}>{Object.entries(SELLER_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </label>
          </div>
          <label className="field">Description<textarea className="input" name="description" rows={5} defaultValue={listing?.description ?? ''} /></label>
          <div className="row" style={{ gap: '8px 18px' }}>
            {Object.entries(CONDITION_TAGS).map(([v, l]) => (
              <label key={v} className="check"><input type="checkbox" checked={tags.includes(v)} onChange={(e) => setTags((t) => e.target.checked ? [...t, v] : t.filter((x) => x !== v))} />{l}</label>
            ))}
          </div>
        </section>

        <section className="panel stack" style={{ gap: 12 }}>
          <div className="row between"><h3>Photos</h3><span className="small muted">{photos.length} · first is the cover</span></div>
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
      </div>

      <aside className="stack" style={{ flex: '1 1 300px', minWidth: 0, gap: 14, position: 'sticky', top: 16 }}>
        <section className="panel stack" style={{ gap: 12 }}>
          <h3>Price &amp; availability</h3>
          <label className="field">Pricing
            <select className="input" value={priceType} onChange={(e) => setPriceType(e.target.value as Listing['price_type'])}>
              <option value="on_request">Price on request (quote)</option>
              <option value="offer">Asking price — accept offers</option>
              <option value="fixed">Fixed price</option>
            </select>
          </label>
          {priceType !== 'on_request' && (
            <label className="field">Price (KES, excl. VAT)
              <input className="input" inputMode="numeric" value={price ? kes(price) : ''} onChange={(e) => setPrice(parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0)} />
            </label>
          )}
          <div className="grid2" style={{ gap: 10 }}>
            <label className="field">In stock<input className="input" name="stock" type="number" min="0" defaultValue={listing?.stock ?? 1} /></label>
            <label className="field">Status
              <select className="input" name="status" defaultValue={listing?.status ?? 'draft'}>
                <option value="draft">Draft (hidden)</option><option value="active">Active</option><option value="reserved">Reserved</option><option value="sold">Sold</option>
              </select>
            </label>
          </div>
          <label className="field">Lead time<input className="input" name="lead_time" placeholder="e.g. 3–4 weeks from order" defaultValue={listing?.lead_time ?? ''} /></label>
          <label className="check"><input type="checkbox" name="featured" defaultChecked={listing?.featured ?? false} />Feature on homepage and menu</label>
        </section>
        {msg && <div role="status" className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`}>{msg.text}</div>}
        <button className="btn btn-primary" type="submit" disabled={busy || uploading}>{busy ? 'Saving…' : listing ? 'Save item' : 'Create item'}</button>
        {listing && <button type="button" className="btn btn-outline" style={{ color: 'var(--danger)' }} onClick={remove}>Delete item</button>}
      </aside>
    </form>
  );
}
