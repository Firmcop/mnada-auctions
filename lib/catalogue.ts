'use client';
import { CATEGORY_TREE } from './categories';
import { CONDITION_TAGS, SELLER_TYPES, type ExtraCost } from './format';

export type Target = 'listings' | 'lots';
export type RawRow = Record<string, string>;

export const LISTING_COLUMNS = [
  'code', 'title', 'category', 'type', 'summary', 'description', 'specs', 'price_type', 'price', 'stock',
  'lead_time', 'location', 'condition', 'status', 'featured', 'photos', 'seo_title', 'seo_description',
] as const;

export const LOT_COLUMNS = [
  'lot_no', 'title', 'category', 'type', 'description', 'specs', 'start_bid', 'reserve', 'closes_at', 'location',
  'condition', 'seller', 'seller_approval', 'vat_on_hammer', 'extra_costs', 'photos', 'seo_title', 'seo_description',
] as const;

export const COLUMN_HELP: Record<string, string> = {
  code: 'Your product code, e.g. CH40-2BR. Re-uploading a row with the same code updates that item.',
  lot_no: 'Lot number in this auction. Re-uploading the same number updates that lot.',
  title: 'Required.',
  category: 'One of the categories on the Categories sheet.',
  type: 'One of the types listed under that category (optional).',
  specs: 'Name: value pairs separated by semicolons — e.g. Size: 40ft; Bedrooms: 2',
  price_type: 'on_request, offer or fixed',
  price: 'KES, numbers only. Leave empty for price on request.',
  start_bid: 'KES, numbers only. Required.',
  reserve: 'Hidden minimum price in KES. Optional.',
  closes_at: 'YYYY-MM-DD HH:MM in Nairobi time. Optional — defaults to one minute after the previous lot.',
  condition: `Comma-separated: ${Object.keys(CONDITION_TAGS).join(', ')}`,
  seller: Object.keys(SELLER_TYPES).join(', '),
  status: 'draft or active',
  featured: 'yes or no',
  vat_on_hammer: 'yes or no',
  seller_approval: 'yes = the seller approves the highest bid after closing (allocation lot); no or empty = sells automatically at or above the reserve',
  extra_costs: 'Label: amount: mandatory|optional; … — e.g. Loading: 15000: mandatory',
  photos: 'Photo file names separated by semicolons. Leave empty to match files that start with the code / lot number (e.g. CH40-2BR-1.jpg, lot12_2.jpg).',
  seo_title: 'Optional — leave empty for the automatic search title.',
  seo_description: 'Optional — leave empty for the automatic search description.',
};

export const EXAMPLE_LISTING: RawRow = {
  code: 'CH20-SHOP', title: '20ft container shop / kiosk', category: 'Container houses & modular', type: 'Container shops & kiosks',
  summary: 'Lockable kiosk with serving hatch, shelves and lighting.', description: 'Built from a 20ft container with roller shutter hatch.',
  specs: 'Size: 20ft; Hatch: Roller shutter; Electrics: Lights and sockets', price_type: 'offer', price: '350000', stock: '4',
  lead_time: '2 weeks from order', location: 'Ruiru', condition: 'new', status: 'draft', featured: 'no',
  photos: 'CH20-SHOP-1.jpg; CH20-SHOP-2.jpg', seo_title: '', seo_description: '',
};

export const EXAMPLE_LOT: RawRow = {
  lot_no: '1', title: 'Caterpillar 320D excavator, 2013', category: 'Construction & earthmoving', type: 'Excavators',
  description: 'Starts and drives. Service records available.', specs: 'Hours: 9,800; Bucket: 1.0 m³', start_bid: '2000000', reserve: '2800000',
  closes_at: '', location: 'Mombasa', condition: 'tested', seller: 'commercial', seller_approval: 'no', vat_on_hammer: 'yes',
  extra_costs: 'Loading onto truck: 15000: mandatory', photos: '', seo_title: '', seo_description: '',
};

const norm = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');

export function matchCategory(input: string) {
  const n = norm(input);
  if (!n) return null;
  return CATEGORY_TREE.find((c) => norm(c.name) === n || norm(c.short) === n)?.name ?? (n === 'other' ? 'Other' : null);
}

export function matchSub(category: string | null, input: string) {
  const n = norm(input);
  if (!n || !category) return null;
  return CATEGORY_TREE.find((c) => c.name === category)?.subs.find((s) => norm(s) === n) ?? null;
}

export const num = (v: string | undefined) => {
  const n = Number(String(v ?? '').replace(/[^0-9.]/g, ''));
  return String(v ?? '').trim() && Number.isFinite(n) ? n : null;
};

export const yes = (v: string | undefined) => /^(y|yes|true|1)$/i.test(String(v ?? '').trim());

export function parseSpecs(v: string | undefined): [string, string][] {
  return String(v ?? '').split(/;|\n/).map((p) => p.trim()).filter(Boolean).map((p) => {
    const i = p.indexOf(':');
    return i > 0 ? [p.slice(0, i).trim(), p.slice(i + 1).trim()] as [string, string] : null;
  }).filter((x): x is [string, string] => !!x && !!x[0] && !!x[1]);
}

export function parseExtras(v: string | undefined): ExtraCost[] {
  return String(v ?? '').split(/;|\n/).map((p) => p.trim()).filter(Boolean).map((p) => {
    const [label, amount, flag] = p.split(':').map((x) => x.trim());
    const a = num(amount);
    return label && a ? { label, amount: a, mandatory: !/^opt/i.test(flag ?? '') } : null;
  }).filter((x): x is ExtraCost => !!x);
}

export function parseTags(v: string | undefined) {
  return String(v ?? '').split(/[,;]/).map((t) => t.trim().toLowerCase().replace(/[\s-]+/g, '_')).filter((t) => t in CONDITION_TAGS);
}

/** "2026-12-08 14:00" (Nairobi) → ISO */
export function parseEat(v: string | undefined) {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})/);
  if (!m) return undefined;
  const [, y, mo, d, h, mi] = m;
  return new Date(`${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T${h.padStart(2, '0')}:${mi}:00+03:00`).toISOString();
}

export function cellToString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) {
    const d = new Date(v.getTime() + 3 * 3600 * 1000);
    return d.toISOString().slice(0, 16).replace('T', ' ');
  }
  return String(v).trim();
}

/** Turn a header row + data rows into keyed rows (headers normalised to template column names). */
export function rowsFromTable(table: unknown[][]): RawRow[] {
  const headerIdx = table.findIndex((r) => r.some((c) => /^(title|code|lot_no|lot no)$/i.test(cellToString(c))));
  if (headerIdx < 0) return [];
  const headers = table[headerIdx].map((h) => cellToString(h).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, ''));
  return table.slice(headerIdx + 1)
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, cellToString(r[i])])))
    .filter((r) => Object.values(r).some((v) => v));
}

export function photoMatches(rowKey: string, listed: string, files: { name: string }[]) {
  const base = (n: string) => n.split('/').pop()!.toLowerCase();
  const names = listed.split(/[;,\n]/).map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (names.length) {
    const found = names.map((n) => files.find((f) => base(f.name) === n));
    return { files: found.filter(Boolean) as { name: string }[], missing: names.filter((_, i) => !found[i]) };
  }
  const key = rowKey.toLowerCase();
  if (!key) return { files: [], missing: [] };
  const re = new RegExp(`^(lot[-_ ]?)?${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([-_ .(]|$)`, 'i');
  const matched = files.filter((f) => re.test(base(f.name))).sort((a, b) => base(a.name).localeCompare(base(b.name), undefined, { numeric: true }));
  return { files: matched, missing: [] };
}
