import type { SupabaseClient } from '@supabase/supabase-js';

export type Line = { date: string; stream: string; ref: string; description: string; amount: number; auctionId?: string | null; helpId?: string | null };
export const VAT_STREAM = 'VAT collected (output)';

/** Mnada's income lines (excl. money held for sellers/auctioneers), on payments received in [since, until). */
export async function incomeLines(supabase: SupabaseClient, since: string, until?: string): Promise<{ lines: Line[]; aiCost: number }> {
  const u = until ?? new Date(Date.now() + 86400000).toISOString();
  const [{ data: inv }, { data: st }, { data: firmFees }, { data: help }, { data: aiPay }, { data: aiUse }, { data: helpReqs }, { data: storage }] = await Promise.all([
    supabase.from('auction_invoices').select('id, invoice_no, hammer, premium, extras, vat, paid_at, auction_lots(lot_no, title, seller_id, vat_on_hammer, auction_id, auction_auctions(auctioneer_id))').not('paid_at', 'is', null).gte('paid_at', since).lt('paid_at', u),
    supabase.from('auction_settlements').select('invoice_id, payee_kind, fee_kes, fee_vat_kes, help_deduction_kes, status'),
    supabase.from('auction_auctioneer_fees').select('reference, amount_kes, confirmed_at, auction_id').eq('status', 'paid').gte('confirmed_at', since).lt('confirmed_at', u),
    supabase.from('auction_help_payments').select('reference, kind, amount_kes, confirmed_at, request_id').eq('status', 'paid').gte('confirmed_at', since).lt('confirmed_at', u),
    supabase.from('auction_ai_payments').select('reference, purpose, amount_kes, confirmed_at').eq('status', 'paid').gte('confirmed_at', since).lt('confirmed_at', u),
    supabase.from('auction_ai_ledger').select('amount_kes, cost_kes, internal, created_at').eq('kind', 'usage').gte('created_at', since).lt('created_at', u),
    supabase.from('auction_help_requests').select('id, quote_subtotal_kes, quote_total_kes').not('quote_total_kes', 'is', null),
    supabase.from('auction_storage_charges').select('reference, description, amount_kes, vat_kes, confirmed_at').eq('status', 'paid').gte('confirmed_at', since).lt('confirmed_at', u),
  ]);
  // Listing Help receipts include VAT: split them using the job's quote (subtotal / total)
  const helpRatio = (id: string | null | undefined) => {
    const r = (helpReqs ?? []).find((x) => x.id === id);
    return r && Number(r.quote_total_kes) > 0 ? Number(r.quote_subtotal_kes) / Number(r.quote_total_kes) : 1 / 1.16;
  };
  const lines: Line[] = [];
  const d = (s: string | null) => (s ?? '').slice(0, 10);
  type InvRow = { id: string; invoice_no: string | number; hammer: number; premium: number; extras: number; vat: number; paid_at: string; auction_lots: { lot_no: number; title: string; seller_id: string | null; vat_on_hammer: boolean; auction_id: string; auction_auctions: { auctioneer_id: string | null } } | null };
  for (const i of (inv ?? []) as unknown as InvRow[]) {
    const lot = i.auction_lots;
    const auctionId = lot?.auction_id ?? null;
    const ref = String(i.invoice_no);
    const desc = `Inv ${ref} · Lot ${lot?.lot_no} ${lot?.title ?? ''}`;
    const base = { date: d(i.paid_at), ref, auctionId };
    if (!lot?.auction_auctions?.auctioneer_id) {
      lines.push({ ...base, stream: "Buyer's premium", description: desc, amount: Number(i.premium) });
      if (Number(i.extras)) lines.push({ ...base, stream: 'Lot extras (loading, delivery…)', description: desc, amount: Number(i.extras) });
      if (!lot?.seller_id) lines.push({ ...base, stream: 'Own stock sales (hammer)', description: desc, amount: Number(i.hammer) });
      // VAT on the hammer of a consigned lot belongs to the seller; the rest of the invoice VAT is Mnada's output VAT
      const vat = Number(i.vat) - (lot?.vat_on_hammer && lot?.seller_id ? Math.round(Number(i.hammer) * 0.16) : 0);
      lines.push({ ...base, stream: VAT_STREAM, description: desc, amount: vat });
    }
    const s = (st ?? []).find((x) => x.invoice_id === i.id);
    if (s && s.status !== 'cancelled') {
      lines.push({ ...base, stream: s.payee_kind === 'seller' ? 'Seller commission' : 'Auctioneer success fees', description: desc, amount: Number(s.fee_kes) });
      if (Number(s.fee_vat_kes)) lines.push({ ...base, stream: VAT_STREAM, description: `VAT on fee · ${desc}`, amount: Number(s.fee_vat_kes) });
      if (Number(s.help_deduction_kes)) {
        const net = Math.round(Number(s.help_deduction_kes) / 1.16);
        lines.push({ ...base, stream: 'Listing Help', description: `Deducted from proceeds · ${desc}`, amount: net });
        lines.push({ ...base, stream: VAT_STREAM, description: `VAT on Listing Help deducted · ${desc}`, amount: Number(s.help_deduction_kes) - net });
      }
    }
  }
  for (const f of firmFees ?? []) lines.push({ date: d(f.confirmed_at), stream: 'Auctioneer listing fees', ref: f.reference, description: 'Listing fee', amount: Number(f.amount_kes), auctionId: f.auction_id });
  for (const h of help ?? []) {
    const net = Math.round(Number(h.amount_kes) * helpRatio(h.request_id));
    lines.push({ date: d(h.confirmed_at), stream: 'Listing Help', ref: h.reference, description: `${h.kind} payment`, amount: net, helpId: h.request_id });
    if (Number(h.amount_kes) - net) lines.push({ date: d(h.confirmed_at), stream: VAT_STREAM, ref: h.reference, description: `VAT on Listing Help ${h.kind}`, amount: Number(h.amount_kes) - net, helpId: h.request_id });
  }
  for (const c of storage ?? []) {
    lines.push({ date: d(c.confirmed_at), stream: 'Storage', ref: c.reference, description: c.description, amount: Number(c.amount_kes) });
    if (Number(c.vat_kes)) lines.push({ date: d(c.confirmed_at), stream: VAT_STREAM, ref: c.reference, description: `VAT · ${c.description}`, amount: Number(c.vat_kes) });
  }
  for (const a of aiPay ?? []) if (a.purpose === 'activation') lines.push({ date: d(a.confirmed_at), stream: 'AI tools', ref: a.reference, description: 'Activation', amount: Number(a.amount_kes) });
  const aiUsage = (aiUse ?? []).filter((x) => !x.internal).reduce((s, x) => s + -Number(x.amount_kes), 0);
  const aiCost = (aiUse ?? []).reduce((s, x) => s + Number(x.cost_kes ?? 0), 0);
  if (aiUsage) lines.push({ date: d(new Date().toISOString()), stream: 'AI tools', ref: '', description: 'Metered usage (period total)', amount: aiUsage });
  return { lines, aiCost };
}

export function byStream(lines: Line[]) {
  const m = new Map<string, number>();
  for (const l of lines) m.set(l.stream, (m.get(l.stream) ?? 0) + l.amount);
  return m;
}
