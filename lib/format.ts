export const SITE_NAME = 'Mnada';
/** Bump when the terms of sale change; every bid records the version accepted. */
export const TERMS_VERSION = '2026-11-25';
export const VAT_RATE = 0.16;

export function kes(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return Math.round(Number(n)).toLocaleString('en-US');
}

/** Mirrors public.auction_increment in the database. */
export function increment(p: number) {
  if (p < 50000) return 1000;
  if (p < 200000) return 5000;
  if (p < 1000000) return 20000;
  if (p < 5000000) return 50000;
  return 100000;
}

export function minNextBid(lot: { bid_count: number; start_bid: number; current_bid: number | null }) {
  if (lot.bid_count === 0 || lot.current_bid === null) return Number(lot.start_bid);
  return Number(lot.current_bid) + increment(Number(lot.current_bid));
}

export function timeLeft(closesAt: string | Date, now = Date.now()) {
  const ms = new Date(closesAt).getTime() - now;
  if (ms <= 0) return 'Closed';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
  return `${m}m ${String(sec).padStart(2, '0')}s`;
}

export function eat(d: string | Date, withTime = true) {
  return new Date(d).toLocaleString('en-GB', {
    timeZone: 'Africa/Nairobi',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }) + (withTime ? ' EAT' : '');
}

export function photoUrl(path: string) {
  if (path.startsWith('http')) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/auction-photos/${path}`;
}

export type Auction = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  location: string | null;
  status: 'draft' | 'live' | 'closed';
  first_close_at: string | null;
  inspection_text: string | null;
  collection_text: string | null;
  premium_pct: number;
  code: number;
  seo_title?: string | null;
  seo_description?: string | null;
  created_at: string;
  auctioneer_id?: string | null;
  publish_state?: 'awaiting_payment' | 'awaiting_review' | 'rejected' | null;
  publish_note?: string | null;
  terms_text?: string | null;
  success_fee_pct?: number | null;
  listing_fee_kes?: number | null;
};

export type Lot = {
  id: string;
  auction_id: string;
  lot_no: number;
  title: string;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  specs: [string, string][];
  photos: string[];
  location: string | null;
  start_bid: number;
  current_bid: number | null;
  bid_count: number;
  leader_id: string | null;
  reserve_met: boolean;
  has_reserve: boolean;
  closes_at: string;
  status: 'open' | 'sold' | 'unsold';
  vat_on_hammer: boolean;
  condition_tags: string[];
  watch_count: number;
  seller_id?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seller_type: 'own' | 'commercial' | 'receiver' | 'private';
  extra_costs: ExtraCost[];
};

export type ExtraCost = { label: string; amount: number; mandatory: boolean };

export const CONDITION_TAGS: Record<string, string> = {
  new: 'New / unused',
  tested: 'Tested — working at inspection',
  not_tested: 'Not tested — sold as seen',
  buyer_dismantles: 'Buyer dismantles & removes',
  docs: 'Documents / manuals available',
  spares: 'Spare parts included',
};

export const SELLER_TYPES: Record<string, string> = {
  own: 'Mnada own stock',
  commercial: 'Commercial seller',
  receiver: 'Receiver / liquidator',
  private: 'Private seller',
};

export function lotRef(auctionCode: number | null | undefined, lotNo: number) {
  return `MN-${auctionCode ?? '000'}-${lotNo}`;
}

export function mandatoryExtras(lot: { extra_costs?: ExtraCost[] }) {
  return (lot.extra_costs ?? []).filter((e) => e.mandatory).reduce((s, e) => s + Number(e.amount || 0), 0);
}

export { CATEGORY_NAMES as CATEGORIES } from './categories';

export type Listing = {
  id: string;
  ref_no: number;
  slug: string;
  title: string;
  category: string;
  subcategory: string | null;
  summary: string | null;
  description: string | null;
  specs: [string, string][];
  photos: string[];
  location: string | null;
  price: number | null;
  price_type: 'fixed' | 'offer' | 'on_request';
  stock: number;
  lead_time: string | null;
  condition_tags: string[];
  seller_type: 'own' | 'commercial' | 'receiver' | 'private';
  status: 'draft' | 'active' | 'reserved' | 'sold';
  featured: boolean;
  sku: string | null;
  owner_id: string | null;
  review_status: 'approved' | 'pending' | 'rejected';
  review_note: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
};

export function listingPrice(l: Pick<Listing, 'price' | 'price_type'>) {
  if (l.price_type === 'offer' && l.price === null) return 'Open to offers';
  if (l.price_type === 'on_request' || l.price === null) return 'Price on request';
  if (l.price_type === 'offer') return `KES ${kes(l.price)} · or make an offer`;
  return `KES ${kes(l.price)}`;
}
