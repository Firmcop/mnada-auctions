'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { uploadPhoto } from '@/lib/image';
import { subsOf } from '@/lib/categories';
import { CATEGORIES, CONDITION_TAGS, kes, photoUrl } from '@/lib/format';

export default function ConsignForm({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [specs, setSpecs] = useState<[string, string][]>([['Make / model', ''], ['Year', '']]);
  const [tags, setTags] = useState<string[]>([]);
  const [start, setStart] = useState(0);
  const [reserve, setReserve] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const folder = useMemo(() => `sellers/${userId}/consign/${crypto.randomUUID()}`, [userId]);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setUploading(true);
    for (const f of files) {
      const r = await uploadPhoto(supabase, folder, f);
      if (r.path) setPhotos((p) => [...p, r.path as string]);
      else setMsg({ ok: false, text: `Upload failed: ${r.error}` });
    }
    setUploading(false);
    e.target.value = '';
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const g = (k: string) => String(f.get(k) ?? '').trim();
    if (photos.length < 3) { setMsg({ ok: false, text: 'Please add at least 3 photos.' }); return; }
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.from('auction_consignments').insert({
      seller_id: userId, title: g('title'), category, subcategory: g('subcategory') || null, description: g('description') || null,
      specs: specs.filter(([k, v]) => k.trim() && v.trim()), photos, location: g('location') || null, quantity: Number(g('quantity') || 1),
      suggested_start: start || null, desired_reserve: reserve || null, condition_tags: tags,
    });
    setBusy(false);
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    form.reset(); setPhotos([]); setTags([]); setStart(0); setReserve(0);
    setMsg({ ok: true, text: 'Sent. We’ll be in touch about the reserve and auction date.' });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="panel stack" style={{ gap: 14 }}>
      <h3>New item</h3>
      <label className="field">What is it?<input className="input" name="title" required placeholder="e.g. Caterpillar 320D excavator, 2013" /></label>
      <div className="grid2">
        <label className="field">Category<select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="field">Type<select className="input" name="subcategory" key={category}><option value="">—</option>{subsOf(category).map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="field">Location<input className="input" name="location" required placeholder="Town / county" /></label>
        <label className="field">Quantity<input className="input" name="quantity" type="number" min="1" defaultValue={1} /></label>
      </div>
      <label className="field">Condition and history<textarea className="input" name="description" rows={4} placeholder="Working? Hours / mileage, service history, known faults, documents available…" required /></label>
      <div className="row" style={{ gap: '8px 18px' }}>
        {Object.entries(CONDITION_TAGS).map(([v, l]) => (
          <label key={v} className="check"><input type="checkbox" checked={tags.includes(v)} onChange={(e) => setTags((t) => e.target.checked ? [...t, v] : t.filter((x) => x !== v))} />{l}</label>
        ))}
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Key specifications</span>
        {specs.map(([k, v], i) => (
          <div key={i} className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
            <input className="input" aria-label="Spec name" value={k} onChange={(e) => setSpecs((s) => s.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} style={{ background: '#F7F8FA' }} />
            <input className="input" aria-label="Spec value" value={v} onChange={(e) => setSpecs((s) => s.map((x, j) => (j === i ? [x[0], e.target.value] : x)))} />
          </div>
        ))}
        <button type="button" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setSpecs((s) => [...s, ['', '']])}>+ Add</button>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Photos (at least 3: front, side, plate/serial, any damage)</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
          {photos.map((p) => (
            <div key={p} className="thumb" style={{ height: 80, borderRadius: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(p)} alt="" />
            </div>
          ))}
          <label className="btn btn-outline" style={{ height: 80, borderStyle: 'dashed' }}>{uploading ? 'Uploading…' : '+ Add photos'}<input type="file" accept="image/*" multiple className="sr" onChange={upload} disabled={uploading} /></label>
        </div>
      </div>
      <div className="grid2">
        <label className="field">Suggested starting bid (KES, optional)<input className="input" inputMode="numeric" value={start ? kes(start) : ''} onChange={(e) => setStart(parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0)} /></label>
        <label className="field">Lowest price you&apos;d accept (reserve, KES, optional)<input className="input" inputMode="numeric" value={reserve ? kes(reserve) : ''} onChange={(e) => setReserve(parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0)} /></label>
      </div>
      {msg && <div role="status" className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`}>{msg.text}</div>}
      <button className="btn btn-primary" type="submit" disabled={busy || uploading} style={{ alignSelf: 'flex-start' }}>{busy ? 'Sending…' : 'Send for auction'}</button>
    </form>
  );
}
