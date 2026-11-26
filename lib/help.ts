export type HelpService = {
  code: string; name: string; description: string | null; unit: HelpUnit; price_kes: number | null; min_charge_kes: number;
  vat: boolean; allow_from_proceeds: boolean; offered: boolean; includes: string[]; sort: number;
};
export type HelpUnit = 'flat' | 'per_visit' | 'per_lot' | 'per_hour' | 'per_km';
export type HelpStatus = 'requested' | 'quoted' | 'accepted' | 'scheduled' | 'in_progress' | 'done' | 'cancelled' | 'declined';
export type HelpRequest = {
  id: string; reference: string; user_id: string; services: string[]; contact_name: string; contact_phone: string; location: string;
  distance_km: number | null; est_lots: number; items_description: string; preferred_date: string | null; pay_method: 'upfront' | 'proceeds';
  estimate_kes: number | null; estimate_complete: boolean; status: HelpStatus; quote_subtotal_kes: number | null; quote_vat_kes: number | null;
  quote_total_kes: number | null; quote_note: string | null; quoted_at: string | null; accepted_at: string | null; from_proceeds_kes: number;
  scheduled_for: string | null; assigned_to: string | null; checklist: ChecklistItem[]; progress_note: string | null; completed_at: string | null;
  created_at: string; updated_at: string;
};
export type ChecklistItem = { label: string; done: boolean };
export type QuoteLine = {
  id: string; request_id: string; service_code: string | null; description: string; unit: string; qty: number; unit_price_kes: number;
  vat: boolean; from_proceeds_ok: boolean; line_total_kes: number; sort: number;
};
export type HelpPayment = {
  id: string; request_id: string; user_id: string; reference: string; kind: 'deposit' | 'balance'; amount_kes: number;
  status: 'pending' | 'paid' | 'cancelled'; payment_ref: string | null; confirmed_at: string | null; created_at: string;
};
export type HelpSettings = { vat_pct: number; deposit_pct: number; free_km: number };

export const UNIT_LABEL: Record<HelpUnit, string> = {
  flat: 'flat fee', per_visit: 'per visit', per_lot: 'per lot', per_hour: 'per hour', per_km: 'per km',
};

export const STATUS_LABEL: Record<HelpStatus, [string, string]> = {
  requested: ['Request received', 'pill-warn'],
  quoted: ['Quote ready', 'pill-warn'],
  accepted: ['Quote accepted', 'pill-green'],
  scheduled: ['Visit scheduled', 'pill-green'],
  in_progress: ['In progress', 'pill-green'],
  done: ['Completed', 'pill-green'],
  cancelled: ['Cancelled', 'pill-grey'],
  declined: ['Declined', 'pill-grey'],
};

export const STEPS: HelpStatus[] = ['requested', 'quoted', 'accepted', 'scheduled', 'in_progress', 'done'];

export const DEFAULT_CHECKLIST: Record<string, string[]> = {
  survey: ['Survey visit done', 'Item count confirmed with customer'],
  sorting: ['Items sorted into lots', 'Lot tags attached'],
  photos: ['Photos taken for every lot', 'Photos uploaded'],
  video: ['Videos recorded', 'Videos uploaded'],
  listing: ['Descriptions and specs written', 'Lots / listings published'],
};

export function checklistFor(services: string[], all: HelpService[]): ChecklistItem[] {
  const codes = services.flatMap((c) => { const s = all.find((x) => x.code === c); return s && s.includes.length ? s.includes : [c]; });
  return Array.from(new Set(codes)).flatMap((c) => (DEFAULT_CHECKLIST[c] ?? [])).map((label) => ({ label, done: false }));
}
