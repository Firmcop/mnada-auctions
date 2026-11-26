'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { kes, photoUrl, type ExtraCost } from '@/lib/format';

export type ConsignRow = {
  id: string; seller_id: string; title: string; category: string | null; subcategory: string | null; description: string | null;
  specs: [string, string][]; photos: string[]; location: string | null; quantity: number; suggested_start: number | null; desired_reserve: number | null;
  condition_tags: string[]; status: 'submitted' | 'accepted' | 'rejected' | 'withdrawn'; admin_note: string | null; lot_id: string | null; created_at: string;
  seller: { business_name: string | null; phone: string } | null;
};

export default function ConsignmentAdmin({ initial, auctions }: { initial: ConsignRow[]; auctions: { id: string; title: string; first_close_at: string | null }[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState(initial);
  const [tab, setTab] = useState<string>('submitted');
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState<{ auction: string; start: string; reserve: string; note: string }>({ auction: auctions[0]?.id ?? '', start: '', reserve: '', note: '' });
  const [msg, setMsg] = useState<string | null>(null);

  async function accept(c: ConsignRow) {
    setMsg(null);
    const start = Number(form.start.replace(/[^0-9]/g, '')) || Number(c.suggested_start) || 0;
    if (!form.auction || !start) { setMsg('Choose an auction and a starting bid.'); return; }
    const { data: last } = await supabase.from('auction_lots').select('lot_no, closes_at').eq('auction_id', form.auction).order('lot_no', { ascending: false }).limit(1).maybeSingle();
    const auction = auctions.find((a) => a.id === form.auction);
    const closes = new Date(new Date(last?.closes_at ?? auction?.first_close_at ?? Date.now() + 7 * 86400000).getTime() + (last ? 60000 : 0)).toISOString();
    const id = crypto.randomUUID();
    const { error } = await supabase.from('auction_lots').insert({
      id, auction_id: form.auction, lot_no: (last?.lot_no ?? 0) + 1, title: c.quantity > 1 ? `${c.title} (× ${c.quantity})` : c.title,
      category: c.category, subcategory: c.subcategory, description: c.description, specs: c.specs, photos: c.photos, location: c.location,
      start_bid: start, closes_at: closes, condition_tags: c.condition_tags, seller_type: 'commercial', seller_id: c.seller_id, extra_costs: [] as ExtraCost[],
    });
    if (error) { setMsg(error.message); return; }
    const reserve = Number(form.reserve.replace(/[^0-9]/g, '')) || Number(c.desired_reserve) || null;
    await supabase.from('auction_lot_private').upsert({ lot_id: id, reserve });
    await supabase.from('auction_consignments').update({ status: 'accepted', lot_id: id, admin_note: form.note || null }).eq('id', c.id);
    setRows((rs) => rs.map((r) => (r.id === c.id ? { ...r, status: 'accepted', lot_id: id, admin_note: form.note || null } : r)));
    setOpen(null);
  }

  async function reject(c: ConsignRow) {
    await supabase.from('auction_consignments').update({ status: 'rejected', admin_note: form.note || null }).eq('id', c.id);
    setRows((rs) => rs.map((r) => (r.id === c.id ? { ...r, status: 'rejected', admin_note: form.note || null } : r)));
    setOpen(null);
  }

  const shown = rows.filter((r) => r.status === tab);
  return (
    <>
      <div className="row" role="tablist">
        {[['submitted', 'To review'], ['accepted', 'Accepted'], ['rejected', 'Rejected'], ['withdrawn', 'Withdrawn']].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={`btn btn-sm ${tab === id ? 'btn-dark' : 'btn-outline'}`} onClick={() => setTab(id)}>
            {label} ({rows.filter((r) => r.status === id).length})
          </button>
        ))}
      </div>
      <section className="panel stack" style={{ gap: 0 }}>
        {shown.length === 0 && <p className="small muted">Nothing here.</p>}
        {shown.map((c) => (
          <div key={c.id} className="stack" style={{ padding: '16px 0', borderBottom: '1px solid var(--line)', gap: 10 }}>
            <div className="row" style={{ gap: '10px 20px', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 6, flex: 'none' }}>
                {c.photos.slice(0, 3).map((p) => (
                  <a key={p} href={photoUrl(p)} target="_blank" rel="noreferrer" className="thumb" style={{ width: 72, height: 54, borderRadius: 6, display: 'block' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoUrl(p)} alt="" />
                  </a>
                ))}
              </div>
              <div className="stack" style={{ gap: 3, flex: '1 1 300px' }}>
                <b>{c.title}{c.quantity > 1 ? ` × ${c.quantity}` : ''}</b>
                <span className="small muted">{[c.subcategory ?? c.category, c.location, `from ${c.seller?.business_name ?? 'seller'} (${c.seller?.phone ?? ''})`].filter(Boolean).join(' · ')}</span>
                {c.description && <span className="small" style={{ color: 'var(--body)', whiteSpace: 'pre-line' }}>{c.description}</span>}
                <span className="small">{c.suggested_start ? `Suggested start KES ${kes(c.suggested_start)} · ` : ''}{c.desired_reserve ? `Reserve wanted KES ${kes(c.desired_reserve)}` : 'No reserve requested'}</span>
                {c.admin_note && <span className="small muted">Note: {c.admin_note}</span>}
              </div>
              {c.status === 'submitted' && <button type="button" className="btn btn-outline btn-sm" onClick={() => { setOpen(open === c.id ? null : c.id); setForm((f) => ({ ...f, start: c.suggested_start ? String(c.suggested_start) : '', reserve: c.desired_reserve ? String(c.desired_reserve) : '', note: '' })); }}>Review</button>}
              {c.lot_id && <Link href={`/admin/lots/${c.lot_id}`} className="btn btn-outline btn-sm">Open lot</Link>}
            </div>
            {open === c.id && (
              <div className="row" style={{ background: 'var(--surface)', borderRadius: 10, padding: 14, alignItems: 'flex-end' }}>
                <label className="field" style={{ flex: '2 1 220px' }}>Add to auction
                  <select className="input" value={form.auction} onChange={(e) => setForm((f) => ({ ...f, auction: e.target.value }))}>{auctions.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}</select>
                </label>
                <label className="field" style={{ flex: '1 1 140px' }}>Starting bid<input className="input" inputMode="numeric" value={form.start ? kes(Number(form.start.replace(/[^0-9]/g, ''))) : ''} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} /></label>
                <label className="field" style={{ flex: '1 1 140px' }}>Reserve agreed<input className="input" inputMode="numeric" value={form.reserve ? kes(Number(form.reserve.replace(/[^0-9]/g, ''))) : ''} onChange={(e) => setForm((f) => ({ ...f, reserve: e.target.value }))} /></label>
                <label className="field" style={{ flex: '2 1 220px' }}>Note to seller (optional)<input className="input" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} /></label>
                <button type="button" className="btn btn-green" onClick={() => accept(c)}>Accept as lot</button>
                <button type="button" className="btn btn-outline" onClick={() => reject(c)}>Reject</button>
                {msg && <span className="small" style={{ color: 'var(--danger)', width: '100%' }}>{msg}</span>}
              </div>
            )}
          </div>
        ))}
      </section>
    </>
  );
}
