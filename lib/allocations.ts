import type { SupabaseClient } from '@supabase/supabase-js';

export type Offer = {
  id: string; allocation_id: string; bidder_id: string; from_side: 'seller' | 'bidder'; round: number; amount: number;
  status: 'pending' | 'accepted' | 'declined' | 'countered' | 'expired' | 'withdrawn'; note: string | null; expires_at: string; created_at: string;
};
export type Allocation = {
  id: string; lot_id: string; reason: 'reserve_not_met' | 'seller_approval' | 'buyer_default'; top_bid: number; top_bidder: string | null;
  reserve: number | null; status: 'open' | 'agreed' | 'declined' | 'expired'; deadline: string; agreed_price: number | null; buyer_id: string | null;
  created_at: string; closed_at: string | null;
  auction_lots: { id: string; lot_no: number; title: string; photos: string[]; seller_id: string | null; auction_id: string; auction_auctions: { title: string; auctioneer_id: string | null; code: number | null } } | null;
  offers: Offer[];
};

export const REASON: Record<Allocation['reason'], string> = {
  reserve_not_met: 'Reserve not met',
  seller_approval: 'Seller approval lot',
  buyer_default: 'Buyer did not pay',
};
export const ALLOC_STATUS: Record<Allocation['status'], [string, string]> = {
  open: ['Awaiting decision', 'pill-warn'], agreed: ['Sold', 'pill-green'], declined: ['Not sold', 'pill-grey'], expired: ['Expired — not sold', 'pill-grey'],
};

/** Allocations visible to the signed-in user (RLS decides), newest first, with their offers. */
export async function loadAllocations(supabase: SupabaseClient, opts: { since?: string } = {}) {
  let q = supabase.from('auction_allocations')
    .select('*, auction_lots(id, lot_no, title, photos, seller_id, auction_id, auction_auctions(title, auctioneer_id, code))')
    .order('status', { ascending: false }).order('deadline', { ascending: true }).limit(200);
  if (opts.since) q = q.or(`status.eq.open,closed_at.gte.${opts.since}`);
  const { data } = await q;
  const list = (data ?? []) as unknown as Allocation[];
  const ids = list.map((a) => a.id);
  const { data: offers } = ids.length ? await supabase.from('auction_allocation_offers').select('*').in('allocation_id', ids).order('created_at') : { data: [] };
  for (const a of list) a.offers = ((offers ?? []) as Offer[]).filter((o) => o.allocation_id === a.id);
  return list.sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) || a.deadline.localeCompare(b.deadline));
}
