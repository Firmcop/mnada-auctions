'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { uploadPhoto } from '@/lib/image';
import { slugify } from '@/lib/eat-input';
import { CATEGORY_TREE } from '@/lib/categories';
import { kes, type Listing, type Lot } from '@/lib/format';
import {
  COLUMN_HELP, EXAMPLE_LISTING, EXAMPLE_LOT, LISTING_COLUMNS, LOT_COLUMNS, cellToString, matchCategory, matchSub, num,
  parseEat, parseExtras, parseSpecs, parseTags, photoMatches, rowsFromTable, yes, type RawRow, type Target,
} from '@/lib/catalogue';

type AuctionOpt = { id: string; title: string; first_close_at: string | null };
type Checked = { idx: number; key: string; row: RawRow; errors: string[]; warnings: string[]; photos: File[]; exists: boolean; title: string; category: string | null; sub: string | null; priceText: string };

export default function ImportTool({ auctions, mode = 'admin', lotFolder = 'lots', basePath = '/admin' }: { auctions: AuctionOpt[]; mode?: 'admin' | 'auctioneer'; lotFolder?: string; basePath?: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [target, setTarget] = useState<Target>(mode === 'auctioneer' ? 'lots' : 'listings');
  const [auctionId, setAuctionId] = useState(auctions[0]?.id ?? '');
  const [rows, setRows] = useState<RawRow[]>([]);
  const [sheetName, setSheetName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [existing, setExisting] = useState<{ keys: Set<string>; withBids: Set<string>; lastLot: number; lastClose: string | null }>({ keys: new Set(), withBids: new Set(), lastLot: 0, lastClose: null });
  const [publish, setPublish] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; log: string[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const columns: readonly string[] = target === 'listings' ? LISTING_COLUMNS : LOT_COLUMNS;
  const keyCol = target === 'listings' ? 'code' : 'lot_no';

  async function loadExisting(t = target, aId = auctionId) {
    if (t === 'listings') {
      const { data } = await supabase.from('auction_listings').select('sku');
      setExisting({ keys: new Set((data ?? []).map((d) => String(d.sku ?? '').toUpperCase()).filter(Boolean)), withBids: new Set(), lastLot: 0, lastClose: null });
    } else if (aId) {
      const { data } = await supabase.from('auction_lots').select('lot_no, bid_count, closes_at').eq('auction_id', aId).order('lot_no');
      const d = data ?? [];
      setExisting({
        keys: new Set(d.map((x) => String(x.lot_no))),
        withBids: new Set(d.filter((x) => x.bid_count > 0).map((x) => String(x.lot_no))),
        lastLot: d.length ? Math.max(...d.map((x) => x.lot_no)) : 0,
        lastClose: d.length ? d[d.length - 1].closes_at : null,
      });
    }
  }

  async function downloadTemplate() {
    const { default: writeXlsxFile } = await import('write-excel-file/browser');
    const example = target === 'listings' ? EXAMPLE_LISTING : EXAMPLE_LOT;
    const header = columns.map((c) => ({ value: c, fontWeight: 'bold' as const, backgroundColor: '#F2F4F6' }));
    const help = columns.map((c) => ({ value: COLUMN_HELP[c] ?? '', wrap: true, color: '#5B6470' }));
    const cats = [[{ value: 'category', fontWeight: 'bold' as const }, { value: 'types', fontWeight: 'bold' as const }], ...CATEGORY_TREE.map((c) => [c.name, c.subs.join('; ')])];
    await writeXlsxFile([
      { sheet: target === 'listings' ? 'Products' : 'Lots', data: [header], columns: columns.map(() => ({ width: 24 })) },
      { sheet: 'Example & help', data: [header, columns.map((c) => example[c] ?? ''), help], columns: columns.map(() => ({ width: 28 })) },
      { sheet: 'Categories', data: cats, columns: [{ width: 32 }, { width: 110 }] },
    ]).toFile(target === 'listings' ? 'mnada-products-template.xlsx' : 'mnada-lots-template.xlsx');
  }

  async function downloadCurrent() {
    const { default: writeXlsxFile } = await import('write-excel-file/browser');
    const specs = (s: [string, string][]) => (s ?? []).map(([k, v]) => `${k}: ${v}`).join('; ');
    let data: (string | number)[][] = [];
    if (target === 'listings') {
      const { data: ls } = await supabase.from('auction_listings').select('*').order('created_at');
      data = ((ls ?? []) as Listing[]).map((l) => [l.sku ?? '', l.title, l.category, l.subcategory ?? '', l.summary ?? '', l.description ?? '', specs(l.specs), l.price_type, l.price ?? '', l.stock, l.lead_time ?? '', l.location ?? '', l.condition_tags.join(', '), l.status, l.featured ? 'yes' : 'no', '', l.seo_title ?? '', l.seo_description ?? '']);
    } else {
      const { data: ls } = await supabase.from('auction_lots').select('*').eq('auction_id', auctionId).order('lot_no');
      const { data: priv } = await supabase.from('auction_lot_private').select('lot_id, reserve');
      const res = (id: string) => (priv ?? []).find((p) => p.lot_id === id)?.reserve ?? '';
      data = ((ls ?? []) as Lot[]).map((l) => [l.lot_no, l.title, l.category ?? '', l.subcategory ?? '', l.description ?? '', specs(l.specs), l.start_bid, res(l.id), cellToString(new Date(l.closes_at)), l.location ?? '', l.condition_tags.join(', '), l.seller_type, l.vat_on_hammer ? 'yes' : 'no', l.extra_costs.map((e) => `${e.label}: ${e.amount}: ${e.mandatory ? 'mandatory' : 'optional'}`).join('; '), '', l.seo_title ?? '', l.seo_description ?? '']);
    }
    await writeXlsxFile([columns.map((c) => ({ value: c, fontWeight: 'bold' as const })), ...data], { columns: columns.map(() => ({ width: 24 })) })
      .toFile(target === 'listings' ? 'mnada-products-current.xlsx' : 'mnada-lots-current.xlsx');
  }

  async function onSheet(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setErr(null);
    setProgress(null);
    try {
      let table: unknown[][];
      if (/\.csv$/i.test(f.name)) {
        const Papa = (await import('papaparse')).default;
        table = Papa.parse<string[]>(await f.text(), { skipEmptyLines: true }).data;
      } else {
        const { readSheet } = await import('read-excel-file/browser');
        table = (await readSheet(f)) as unknown[][];
      }
      const parsed = rowsFromTable(table);
      if (!parsed.length) { setErr('No rows found. Make sure the first row has the column names from the template (e.g. code, title, category).'); return; }
      setRows(parsed.filter((r) => r.title || r[keyCol]));
      setSheetName(f.name);
      await loadExisting();
    } catch (x) {
      setErr(`Could not read that file: ${(x as Error).message}`);
    }
  }

  async function onPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    const out: File[] = [];
    for (const f of list) {
      if (/\.zip$/i.test(f.name)) {
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(f);
        for (const entry of Object.values(zip.files)) {
          if (entry.dir || !/\.(jpe?g|png|webp|heic)$/i.test(entry.name) || entry.name.startsWith('__MACOSX')) continue;
          const blob = await entry.async('blob');
          const ext = entry.name.split('.').pop()!.toLowerCase();
          out.push(new File([blob], entry.name.split('/').pop()!, { type: ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg' }));
        }
      } else if (f.type.startsWith('image/')) out.push(f);
    }
    setFiles((prev) => [...prev, ...out]);
    e.target.value = '';
  }

  const checked: Checked[] = rows.map((row, idx) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const title = (row.title ?? '').trim();
    if (!title) errors.push('Title missing');
    const category = matchCategory(row.category ?? '');
    if (!row.category) errors.push('Category missing');
    else if (!category) errors.push(`Unknown category “${row.category}”`);
    const sub = matchSub(category, row.type ?? '');
    if (row.type && !sub) warnings.push(`Type “${row.type}” not in list — left blank`);
    let key = '';
    let priceText = '';
    if (target === 'listings') {
      key = (row.code ?? '').trim().toUpperCase();
      if (!key) warnings.push('No code — will always create a new item');
      const pt = (row.price_type || (num(row.price) ? 'fixed' : 'on_request')).toLowerCase().replace(/\s+/g, '_');
      if (!['on_request', 'offer', 'fixed'].includes(pt)) errors.push(`price_type must be on_request, offer or fixed`);
      if (pt === 'fixed' && !num(row.price)) errors.push('Fixed price needs a price');
      priceText = pt === 'on_request' ? 'On request' : num(row.price) ? `KES ${kes(num(row.price))}${pt === 'offer' ? ' (offers)' : ''}` : 'Open to offers';
    } else {
      key = String(num(row.lot_no) ?? '');
      if (!key) errors.push('lot_no missing');
      if (!num(row.start_bid)) errors.push('start_bid missing');
      if (parseEat(row.closes_at) === undefined) errors.push('closes_at must look like 2026-12-08 14:00');
      if (existing.withBids.has(key)) warnings.push('Lot has bids — starting bid and closing time won’t be changed');
      priceText = num(row.start_bid) ? `Start KES ${kes(num(row.start_bid))}` : '';
    }
    const ph = photoMatches(key, row.photos ?? '', files);
    if (ph.missing.length) warnings.push(`Photos not found: ${ph.missing.join(', ')}`);
    if (!ph.files.length && !ph.missing.length) warnings.push('No photos matched');
    const exists = !!key && existing.keys.has(key);
    return { idx, key, row, errors, warnings, photos: ph.files as File[], exists, title, category, sub, priceText };
  });
  const ok = checked.filter((c) => !c.errors.length);

  async function runImport() {
    setBusy(true);
    setErr(null);
    const log: string[] = [];
    setProgress({ done: 0, total: ok.length, log });
    let lastClose = existing.lastClose ?? auctions.find((a) => a.id === auctionId)?.first_close_at ?? new Date(Date.now() + 7 * 86400000).toISOString();
    for (const [i, c] of ok.entries()) {
      try {
        const r = c.row;
        const specs = parseSpecs(r.specs);
        const tags = parseTags(r.condition);
        if (target === 'listings') {
          const { data: found } = c.key ? await supabase.from('auction_listings').select('id, slug, photos').eq('sku', c.key).maybeSingle() : { data: null };
          const id = found?.id ?? crypto.randomUUID();
          const uploaded: string[] = [];
          for (const f of c.photos) { const u = await uploadPhoto(supabase, `listings/${id}`, f); if (u.path) uploaded.push(u.path); }
          const pt = (r.price_type || (num(r.price) ? 'fixed' : 'on_request')).toLowerCase().replace(/\s+/g, '_');
          const status = (r.status || '').toLowerCase();
          const row = {
            title: c.title, category: c.category!, subcategory: c.sub, summary: r.summary || null, description: r.description || null,
            specs, price_type: pt, price: pt === 'on_request' ? null : num(r.price), stock: num(r.stock) ?? 1, lead_time: r.lead_time || null,
            location: r.location || null, condition_tags: tags, featured: yes(r.featured),
            status: ['draft', 'active', 'reserved', 'sold'].includes(status) ? status : publish ? 'active' : 'draft',
            seo_title: r.seo_title || null, seo_description: r.seo_description || null, updated_at: new Date().toISOString(),
            ...(uploaded.length ? { photos: uploaded } : {}),
          };
          const { error } = found
            ? await supabase.from('auction_listings').update(row).eq('id', id)
            : await supabase.from('auction_listings').insert({ ...row, id, sku: c.key || null, photos: uploaded, slug: `${slugify(c.title)}-${Math.random().toString(36).slice(2, 6)}` });
          if (error) throw error;
          log.push(`✓ ${found ? 'Updated' : 'Added'} ${c.key || c.title}${uploaded.length ? ` (${uploaded.length} photos)` : ''}`);
        } else {
          const lotNo = Number(c.key);
          const { data: found } = await supabase.from('auction_lots').select('id, bid_count, closes_at').eq('auction_id', auctionId).eq('lot_no', lotNo).maybeSingle();
          const id = found?.id ?? crypto.randomUUID();
          const uploaded: string[] = [];
          for (const f of c.photos) { const u = await uploadPhoto(supabase, `${lotFolder}/${id}`, f); if (u.path) uploaded.push(u.path); }
          const closes: string = parseEat(r.closes_at) || found?.closes_at || new Date(new Date(lastClose).getTime() + 60000).toISOString();
          lastClose = closes;
          const locked = (found?.bid_count ?? 0) > 0;
          const seller = (r.seller || 'own').toLowerCase();
          const row = {
            title: c.title, category: c.category, subcategory: c.sub, description: r.description || null, specs, location: r.location || null,
            condition_tags: tags, seller_type: ['own', 'commercial', 'receiver', 'private'].includes(seller) ? seller : 'own',
            vat_on_hammer: r.vat_on_hammer ? yes(r.vat_on_hammer) : true, extra_costs: parseExtras(r.extra_costs),
            seo_title: r.seo_title || null, seo_description: r.seo_description || null,
            ...(locked ? {} : { start_bid: num(r.start_bid)!, closes_at: closes }),
            ...(uploaded.length ? { photos: uploaded } : {}),
          };
          const { error } = found
            ? await supabase.from('auction_lots').update(row).eq('id', id)
            : await supabase.from('auction_lots').insert({ ...row, id, auction_id: auctionId, lot_no: lotNo, photos: uploaded, start_bid: num(r.start_bid)!, closes_at: closes });
          if (error) throw error;
          const reserve = num(r.reserve);
          if (r.reserve !== undefined) await supabase.from('auction_lot_private').upsert({ lot_id: id, reserve });
          log.push(`✓ ${found ? 'Updated' : 'Added'} lot ${lotNo}${uploaded.length ? ` (${uploaded.length} photos)` : ''}`);
        }
      } catch (x) {
        log.push(`✗ Row ${c.idx + 2} (${c.key || c.title}): ${(x as { message?: string }).message ?? 'failed'}`);
      }
      setProgress({ done: i + 1, total: ok.length, log: [...log] });
    }
    setBusy(false);
    await loadExisting();
  }

  return (
    <div className="stack" style={{ gap: 18 }}>
      <section className="panel stack" style={{ gap: 14 }}>
        <h3>1. What are you importing?</h3>
        <div className="row">
          {((mode === 'auctioneer' ? ['lots'] : ['listings', 'lots']) as Target[]).map((t) => (
            <label key={t} className="check" style={{ border: `2px solid ${target === t ? 'var(--accent)' : 'var(--line)'}`, borderRadius: 10, padding: '10px 14px' }}>
              <input type="radio" name="target" checked={target === t} onChange={() => { setTarget(t); setRows([]); setProgress(null); loadExisting(t); }} />
              {t === 'listings' ? 'Direct-sale products' : 'Auction lots'}
            </label>
          ))}
          {target === 'lots' && (
            <label className="field" style={{ minWidth: 280 }}>Auction
              <select className="input" value={auctionId} onChange={(e) => { setAuctionId(e.target.value); setRows([]); loadExisting('lots', e.target.value); }}>
                {auctions.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
            </label>
          )}
        </div>
        <div className="row">
          <button type="button" className="btn btn-dark" onClick={downloadTemplate}>Download blank template (.xlsx)</button>
          <button type="button" className="btn btn-outline" onClick={downloadCurrent} disabled={target === 'lots' && !auctionId}>Download current {target === 'listings' ? 'products' : 'lots'} to edit</button>
        </div>
        <p className="small muted">
          Fill one row per {target === 'listings' ? 'product' : 'lot'}. To update prices or stock later, download the current list, edit it and upload it again —
          rows are matched by <b>{keyCol}</b>. Works with Excel, Google Sheets (File → Download → .xlsx or .csv) and CSV.
        </p>
      </section>

      <section className="panel stack" style={{ gap: 14 }}>
        <h3>2. Upload the spreadsheet and photos</h3>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <label className="btn btn-outline">
            {sheetName ? `Sheet: ${sheetName}` : 'Choose spreadsheet (.xlsx / .csv)'}
            <input type="file" accept=".xlsx,.csv" className="sr" onChange={onSheet} />
          </label>
          <label className="btn btn-outline">
            Add photos or a .zip
            <input type="file" accept="image/*,.zip" multiple className="sr" onChange={onPhotos} />
          </label>
          {files.length > 0 && <span className="small" style={{ alignSelf: 'center' }}>{files.length} photos loaded · <button type="button" className="btn btn-outline btn-sm" onClick={() => setFiles([])}>Clear</button></span>}
        </div>
        <p className="small muted">Photos are matched by the file names in the <b>photos</b> column, or automatically when a file name starts with the {keyCol === 'code' ? 'product code (CH40-2BR-1.jpg)' : 'lot number (12-front.jpg or lot12_1.jpg)'}. They are resized and compressed before upload.</p>
        {err && <div role="alert" className="alert alert-err">{err}</div>}
      </section>

      {checked.length > 0 && (
        <section className="panel stack" style={{ gap: 12 }}>
          <div className="row between">
            <h3>3. Check and import</h3>
            <span className="small"><b>{ok.length}</b> ready · {checked.length - ok.length} with errors · {ok.filter((c) => c.exists).length} updates · {ok.filter((c) => !c.exists).length} new</span>
          </div>
          <div className="scroll-x">
            <table className="data" style={{ minWidth: 860 }}>
              <thead><tr><th>Row</th><th>{keyCol}</th><th>Title</th><th>Category / type</th><th>Price</th><th>Photos</th><th>Check</th></tr></thead>
              <tbody>
                {checked.map((c) => (
                  <tr key={c.idx} style={{ background: c.errors.length ? '#FFF4F2' : undefined }}>
                    <td>{c.idx + 2}</td>
                    <td><b>{c.key || '—'}</b><div className="small muted">{c.exists ? 'update' : 'new'}</div></td>
                    <td>{c.title}</td>
                    <td className="small">{c.category ?? c.row.category}{c.sub ? ` › ${c.sub}` : ''}</td>
                    <td className="small">{c.priceText}</td>
                    <td>{c.photos.length}</td>
                    <td className="small">
                      {c.errors.map((e) => <div key={e} style={{ color: 'var(--danger)' }}>✗ {e}</div>)}
                      {c.warnings.map((w) => <div key={w} style={{ color: '#7A3E0A' }}>! {w}</div>)}
                      {!c.errors.length && !c.warnings.length && <span style={{ color: 'var(--green)' }}>✓ Ready</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {target === 'listings' && <label className="check"><input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />Publish new products straight away (rows with a status column keep their own status)</label>}
          <div className="row">
            <button type="button" className="btn btn-primary" disabled={busy || ok.length === 0} onClick={runImport}>
              {busy ? `Importing… ${progress?.done ?? 0}/${progress?.total ?? ok.length}` : `Import ${ok.length} ${target === 'listings' ? 'products' : 'lots'}`}
            </button>
            {checked.length - ok.length > 0 && <span className="small muted">Rows with ✗ are skipped — fix them in the sheet and upload again.</span>}
          </div>
          {progress && (
            <div className="stack small" style={{ gap: 4, background: 'var(--surface)', borderRadius: 10, padding: 14 }}>
              <b>{progress.done === progress.total && !busy ? 'Import finished' : 'Importing…'} ({progress.done}/{progress.total})</b>
              {progress.log.map((l, i) => <span key={i} style={{ color: l.startsWith('✗') ? 'var(--danger)' : undefined }}>{l}</span>)}
              {!busy && progress.done === progress.total && (
                <Link href={target === 'listings' ? `${basePath}/listings` : `${basePath}/auctions/${auctionId}`} className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start', marginTop: 6 }}>
                  Review imported {target === 'listings' ? 'products' : 'lots'}
                </Link>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
