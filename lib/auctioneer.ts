import type { SupabaseClient } from '@supabase/supabase-js';

export type Firm = {
  id: string; slug: string; name: string; licence_no: string; licence_expiry: string | null; about: string | null; logo: string | null;
  phone: string | null; email: string | null; location: string | null; default_terms: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended'; review_note: string | null; created_by: string | null; approved_at: string | null; created_at: string;
};
export type FirmPrivate = {
  auctioneer_id: string; kra_pin: string | null; licence_doc: string | null; payout_method: 'mpesa' | 'bank'; payout_details: string | null;
  listing_fee_kes: number | null; lot_fee_kes: number | null; success_fee_pct: number | null;
};
export type FirmFee = {
  id: string; auctioneer_id: string; auction_id: string | null; reference: string; kind: 'listing'; lot_count: number; amount_kes: number;
  status: 'pending' | 'paid' | 'cancelled'; payment_ref: string | null; confirmed_at: string | null; created_at: string;
};
export type FirmSettings = { listing_fee_kes: number | null; lot_fee_kes: number | null; success_fee_pct: number | null; auto_publish_when_paid: boolean };

export const FIRM_STATUS: Record<Firm['status'], [string, string]> = {
  pending: ['Awaiting approval', 'pill-warn'], approved: ['Approved', 'pill-green'], rejected: ['Not approved', 'pill-grey'], suspended: ['Suspended', 'pill-warn'],
};

export function licenceExpired(f: Pick<Firm, 'licence_expiry'>) {
  if (!f.licence_expiry) return false;
  const today = new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
  return f.licence_expiry < today;
}
export function licenceExpiringSoon(f: Pick<Firm, 'licence_expiry'>) {
  if (!f.licence_expiry) return false;
  const days = (new Date(f.licence_expiry).getTime() - Date.now()) / 86400000;
  return days >= 0 && days < 30;
}

/** The firm the signed-in user works for (first membership), with their role. */
export async function myFirm(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from('auction_auctioneer_members').select('role, auction_auctioneers(*)').eq('user_id', userId).order('created_at').limit(1).maybeSingle();
  if (!data) return null;
  const firm = (data as unknown as { auction_auctioneers: Firm }).auction_auctioneers;
  return { firm, role: data.role as 'owner' | 'staff' };
}

export function publishLabel(a: { status: string; publish_state?: string | null }): [string, string] {
  if (a.status === 'live') return ['Live', 'pill-green'];
  if (a.status === 'closed') return ['Closed', 'pill-grey'];
  if (a.publish_state === 'awaiting_payment') return ['Listing fee due', 'pill-warn'];
  if (a.publish_state === 'awaiting_review') return ['With Mnada for review', 'pill-warn'];
  if (a.publish_state === 'rejected') return ['Changes needed', 'pill-warn'];
  return ['Draft', 'pill-grey'];
}
