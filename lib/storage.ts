export type StorageSettings = { enabled: boolean; rate_per_m3_usd: number | null; min_monthly_usd: number; handling_fee_usd: number | null; usd_to_kes: number | null; vat: boolean };
export type StorageSize = { id: string; name: string; length_m: number; width_m: number; height_m: number; volume_m3: number; sort: number; active: boolean };
export type StorageItem = { label: string; qty: number; l: number; w: number; h: number; size_id?: string | null };
export type StorageBooking = {
  id: string; reference: string; user_id: string; status: 'requested' | 'quoted' | 'accepted' | 'active' | 'ended' | 'declined' | 'cancelled';
  items: StorageItem[]; volume_m3: number; est_monthly_usd: number | null; monthly_usd: number | null; handling_usd: number; months_planned: number | null;
  wanted_from: string | null; viewing_allowed: boolean; contact_phone: string | null; notes: string | null; admin_note: string | null; bay: string | null;
  start_date: string | null; end_date: string | null; last_billed_month: string | null; created_at: string;
};
export type StorageCharge = {
  id: string; booking_id: string; user_id: string; reference: string; kind: 'month' | 'handling'; period_month: string | null; description: string;
  amount_usd: number; usd_to_kes: number; amount_kes: number; vat_kes: number; total_kes: number; status: 'pending' | 'paid' | 'cancelled'; payment_ref: string | null; confirmed_at: string | null; created_at: string;
};
export const STORAGE_STATUS: Record<StorageBooking['status'], [string, string]> = {
  requested: ['Request received', 'pill-warn'], quoted: ['Quote ready', 'pill-warn'], accepted: ['Accepted — bring items in', 'pill-green'],
  active: ['In storage', 'pill-green'], ended: ['Ended', 'pill-grey'], declined: ['Declined', 'pill-grey'], cancelled: ['Cancelled', 'pill-grey'],
};
export const usd = (n: number | null | undefined) => (n == null ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 }));
export function itemVolume(i: StorageItem) { return Math.max(0, Number(i.qty) || 0) * (Number(i.l) || 0) * (Number(i.w) || 0) * (Number(i.h) || 0); }
export function monthlyFor(volume: number, s: StorageSettings) {
  if (s.rate_per_m3_usd == null) return null;
  return Math.max(Number(s.min_monthly_usd), Math.round(volume * Number(s.rate_per_m3_usd) * 100) / 100);
}
