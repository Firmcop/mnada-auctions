'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { uploadPhoto } from '@/lib/image';
import { CATEGORIES, photoUrl } from '@/lib/format';
import { STOCK_STATUS, type StockItem } from '@/lib/erp';

type Opt = { id: string; label: string };
type Seller = { id: string; full_name: string; business_name: string | null };
type Job = { id: string; reference: string; contact_name: string };

export default function StockAdmin({ items, sellers, jobs, lots, listings, storage }: { items: StockItem[]; sellers: Seller[]; jobs: Job[]; lots: Opt[]; listings: Opt[]; storage: { id: string; reference: string; user_id: string }[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [filter, setFilter] = useState<'yard' | 'all' | string>('yard');
  const [q, setQ] = useState('');
  const [ownerKind, setOwnerKind] = useState<'mnada' | 'seller' | 'other'>('mnada');
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const ownerLabel = (i: StockItem) => i.owner_kind === 'mnada' ? 'Mnada' : i.owner_kind === 'seller' ? (sellers.find((s) => s.id === i.owner_id)?.business_name || sellers.find((s) => s.id === i.owner_id)?.full_name || 'Seller') : i.owner_name ?? 'Other';
  const linkLabel = (i: StockItem) => lots.find((l) => l.id === i.lot_id)?.label ?? listings.find((l) => l.id === i.listing_id)?.label ?? (i.lot_id || i.listing_id ? 'Linked' : '—');

  async function run(p: PromiseLike<{ error: { message: string } | null }>, ok = 'Saved.') {
    setBusy(true);
    const { error } = await p;
    setBusy(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: ok });
    if (!error) router.refresh();
    return !error;
  }
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    for (const file of Array.from(e.target.files ?? [])) {
      const r = await uploadPhoto(supabase, 'stock', file);
      if (r.path) setPhotos((p) => [...p, r.path as string]);
    }
    e.target.value = '';
  }
  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const g = (k: string) => String(f.get(k) ?? '').trim();
    const { data: { user } } = await supabase.auth.getUser();
    const ok = await run(supabase.from('auction_stock').insert({
      title: g('title'), description: g('description') || null, category: g('category') || null, quantity: Number(g('quantity') || 1),
      condition: g('condition') || null, yard_location: g('yard_location') || null, owner_kind: ownerKind,
      owner_id: ownerKind === 'seller' ? g('owner_id') || null : null, owner_name: ownerKind === 'other' ? g('owner_name') || null : null,
      help_request_id: g('help_request_id') || null, storage_booking_id: g('storage_booking_id') || null, photos, notes: g('notes') || null, received_by: user?.id,
    }), 'Item booked in.');
    if (ok) { form.reset(); setPhotos([]); setOwnerKind('mnada'); }
  }

  const shown = items.filter((i) => (filter === 'all' ? true : filter === 'yard' ? ['received', 'listed', 'sold'].includes(i.status) : i.status === filter))
    .filter((i) => !q || `${i.ref} ${i.title} ${i.yard_location ?? ''} ${ownerLabel(i)}`.toLowerCase().includes(q.toLowerCase()));
  const inYard = items.filter((i) => ['received', 'listed', 'sold'].includes(i.status));

  return (
    <>
      {msg && <div role="status" className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`}>{msg.text}</div>}
      <div className="kpis">
        <div className="kpi"><span className="eyebrow">Items in the yard</span><b>{inYard.reduce((s, i) => s + i.quantity, 0)}</b></div>
        <div className="kpi"><span className="eyebrow">Not yet listed</span><b>{items.filter((i) => i.status === 'received').length}</b></div>
        <div className="kpi"><span className="eyebrow">Sold, awaiting collection</span><b>{items.filter((i) => i.status === 'sold').length}</b></div>
      </div>
      <details className="panel">
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>+ Book an item into the yard</summary>
        <form onSubmit={add} className="stack" style={{ gap: 12, marginTop: 12 }}>
          <div className="grid2">
            <label className="field">Item<input className="input" name="title" required placeholder="e.g. Caterpillar 320D excavator" /></label>
            <label className="field">Category<select className="input" name="category" defaultValue=""><option value="">—</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="field">Quantity<input className="input" name="quantity" type="number" min={1} defaultValue={1} /></label>
            <label className="field">Condition on arrival<input className="input" name="condition" placeholder="e.g. Runs, minor dents" /></label>
            <label className="field">Yard location<input className="input" name="yard_location" placeholder="e.g. Bay C3 / Shed 2" /></label>
            <label className="field">Owner
              <select className="input" value={ownerKind} onChange={(e) => setOwnerKind(e.target.value as typeof ownerKind)}>
                <option value="mnada">Mnada (own stock)</option><option value="seller">A seller on Mnada</option><option value="other">Someone else</option>
              </select>
            </label>
            {ownerKind === 'seller' && <label className="field">Seller<select className="input" name="owner_id" required>{sellers.map((s) => <option key={s.id} value={s.id}>{s.business_name || s.full_name}</option>)}</select></label>}
            {ownerKind === 'other' && <label className="field">Owner name &amp; phone<input className="input" name="owner_name" required /></label>}
            <label className="field">Storage booking (optional)<select className="input" name="storage_booking_id" defaultValue=""><option value="">—</option>{storage.map((s) => <option key={s.id} value={s.id}>{s.reference} · {sellers.find((x) => x.id === s.user_id)?.business_name || sellers.find((x) => x.id === s.user_id)?.full_name || 'customer'}</option>)}</select></label>
            <label className="field">Listing Help job (optional)<select className="input" name="help_request_id" defaultValue=""><option value="">—</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.reference} · {j.contact_name}</option>)}</select></label>
          </div>
          <label className="field">Description<textarea className="input" name="description" rows={2} /></label>
          <label className="field">Notes (keys, documents, missing parts…)<textarea className="input" name="notes" rows={2} /></label>
          <div className="row" style={{ gap: 8 }}>
            {photos.map((p) => <img key={p} src={photoUrl(p)} alt="" width={64} height={48} style={{ objectFit: 'cover', borderRadius: 6 }} />)}
            <label className="btn btn-outline btn-sm">+ Arrival photos<input type="file" accept="image/*" multiple className="sr" onChange={upload} /></label>
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy} style={{ alignSelf: 'flex-start' }}>Book in</button>
        </form>
      </details>
      <section className="panel stack" style={{ gap: 10 }}>
        <div className="row" style={{ gap: 10 }}>
          <input className="input" style={{ flex: '1 1 220px' }} placeholder="Search ref, item, bay, owner…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search stock" />
          <select className="input" style={{ width: 220 }} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter">
            <option value="yard">Currently in the yard</option><option value="all">All items</option>
            {Object.entries(STOCK_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div className="scroll-x">
          <table className="data" style={{ minWidth: 860 }}>
            <thead><tr><th>Ref</th><th>Item</th><th>Location</th><th>Owner</th><th>Linked to</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {shown.map((i) => (
                <tr key={i.id}>
                  <td className="small" style={{ fontWeight: 700 }}>{i.ref}<div className="muted">{new Date(i.received_at).toLocaleDateString('en-GB')}</div></td>
                  <td>{i.photos[0] && <img src={photoUrl(i.photos[0])} alt="" width={48} height={36} style={{ objectFit: 'cover', borderRadius: 4, float: 'left', marginRight: 8 }} />}<b>{i.title}</b>{i.quantity > 1 ? ` × ${i.quantity}` : ''}<div className="small muted">{[i.condition, i.notes].filter(Boolean).join(' · ')}</div></td>
                  <td className="small">{i.yard_location ?? '—'}</td>
                  <td className="small">{ownerLabel(i)}</td>
                  <td className="small">{linkLabel(i)}</td>
                  <td><span className={`pill ${STOCK_STATUS[i.status]?.[1] ?? 'pill-grey'}`}>{STOCK_STATUS[i.status]?.[0] ?? i.status}</span></td>
                  <td><button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(open === i.id ? null : i.id)}>{open === i.id ? 'Close' : 'Manage'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {shown.length === 0 && <span className="small muted">No items.</span>}
        {open && (() => {
          const i = items.find((x) => x.id === open)!;
          return (
            <form key={i.id} className="card stack" style={{ padding: 16, gap: 10 }} onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const link = String(f.get('link') ?? '');
              const patch: Record<string, unknown> = { yard_location: String(f.get('yard_location') ?? '') || null, notes: String(f.get('notes') ?? '') || null, updated_at: new Date().toISOString() };
              if (link.startsWith('lot:')) { patch.lot_id = link.slice(4); patch.listing_id = null; if (i.status === 'received') patch.status = 'listed'; }
              else if (link.startsWith('listing:')) { patch.listing_id = link.slice(8); patch.lot_id = null; if (i.status === 'received') patch.status = 'listed'; }
              else if (link === 'none') { patch.lot_id = null; patch.listing_id = null; }
              run(supabase.from('auction_stock').update(patch).eq('id', i.id), `${i.ref} updated.`);
            }}>
              <b>{i.ref} · {i.title}</b>
              <div className="grid2">
                <label className="field">Yard location<input className="input" name="yard_location" defaultValue={i.yard_location ?? ''} /></label>
                <label className="field">Linked lot or listing
                  <select className="input" name="link" defaultValue={i.lot_id ? `lot:${i.lot_id}` : i.listing_id ? `listing:${i.listing_id}` : ''}>
                    <option value="">— keep as is —</option><option value="none">Not linked</option>
                    {lots.map((l) => <option key={l.id} value={`lot:${l.id}`}>{l.label}</option>)}
                    {listings.map((l) => <option key={l.id} value={`listing:${l.id}`}>{l.label}</option>)}
                  </select>
                </label>
              </div>
              <label className="field">Notes<textarea className="input" name="notes" rows={2} defaultValue={i.notes ?? ''} /></label>
              <div className="row">
                <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>Save</button>
                {i.status !== 'collected' && <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => run(supabase.from('auction_stock').update({ status: 'collected', left_yard_at: new Date().toISOString() }).eq('id', i.id), 'Marked collected.')}>Mark collected</button>}
                {['received', 'listed'].includes(i.status) && <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => run(supabase.from('auction_stock').update({ status: 'returned', left_yard_at: new Date().toISOString() }).eq('id', i.id), 'Marked returned to owner.')}>Returned to owner</button>}
                {['received', 'listed'].includes(i.status) && <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => { if (window.confirm('Write this item off?')) run(supabase.from('auction_stock').update({ status: 'written_off', left_yard_at: new Date().toISOString() }).eq('id', i.id), 'Written off.'); }}>Write off</button>}
              </div>
            </form>
          );
        })()}
      </section>
    </>
  );
}
