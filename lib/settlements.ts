export type Settlement = {
  id: string; lot_id: string; invoice_id: string; payee_kind: 'seller' | 'auctioneer'; seller_id: string | null; auctioneer_id: string | null;
  invoice_total: number; hammer: number; hammer_vat: number; gross_kes: number; fee_pct: number; fee_kes: number; fee_vat_kes: number;
  help_deduction_kes: number; net_kes: number; status: 'awaiting_payment' | 'held' | 'released' | 'paid' | 'cancelled';
  release_at: string | null; released_at: string | null; payout_id: string | null; created_at: string;
};
export type Payout = {
  id: string; reference: string; payee_kind: 'seller' | 'auctioneer' | 'student'; campus_member_id?: string | null; seller_id: string | null; auctioneer_id: string | null; amount_kes: number;
  method: string | null; details: string | null; status: 'pending' | 'paid' | 'cancelled'; payment_ref: string | null; provider: string; created_at: string; paid_at: string | null;
};
export const SETTLE_LABEL: Record<Settlement['status'], [string, string]> = {
  awaiting_payment: ['Awaiting buyer payment', 'pill-warn'],
  held: ['Buyer paid — held until collection', 'pill-warn'],
  released: ['Released — payout due', 'pill-green'],
  paid: ['Paid out', 'pill-green'],
  cancelled: ['Cancelled', 'pill-grey'],
};
