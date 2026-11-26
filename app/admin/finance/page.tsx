import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { kes } from '@/lib/format';
import FinanceExport, { type Line } from './FinanceExport';

const PERIODS: [string, string, number][] = [['30', 'Last 30 days', 30], ['90', 'Last 90 days', 90], ['365', 'Last 12 months', 365]];

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p = '30' } = await searchParams;
  const days = PERIODS.find((x) => x[0] === p)?.[2] ?? 30;
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const supabase = await createClient();
  const [{ data: inv }, { data: st }, { data: firmFees }, { data: help }, { data: aiPay }, { data: aiUse }, { data: open }, { data: held }] = await Promise.all([
    supabase.from('auction_invoices').select('id, invoice_no, hammer, premium, extras, vat, total, paid_at, lot_id, auction_lots(lot_no, title, seller_id, vat_on_hammer, auction_auctions(auctioneer_id, title))').not('paid_at', 'is', null).gte('paid_at', since),
    supabase.from('auction_settlements').select('invoice_id, payee_kind, fee_kes, fee_vat_kes, help_deduction_kes, status'),
    supabase.from('auction_auctioneer_fees').select('reference, amount_kes, confirmed_at').eq('status', 'paid').gte('confirmed_at', since),
    supabase.from('auction_help_payments').select('reference, kind, amount_kes, confirmed_at').eq('status', 'paid').gte('confirmed_at', since),
    supabase.from('auction_ai_payments').select('reference, purpose, amount_kes, confirmed_at').eq('status', 'paid').gte('confirmed_at', since),
    supabase.from('auction_ai_ledger').select('amount_kes, cost_kes, internal, created_at').eq('kind', 'usage').gte('created_at', since),
    supabase.from('auction_invoices').select('total, paid').in('status', ['unpaid', 'part']),
    supabase.from('auction_settlements').select('net_kes, status').in('status', ['held', 'released']),
  ]);

  const lines: Line[] = [];
  const d = (s: string | null) => (s ?? '').slice(0, 10);
  type InvRow = { id: string; invoice_no: string | number; hammer: number; premium: number; extras: number; vat: number; total: number; paid_at: string; auction_lots: { lot_no: number; title: string; seller_id: string | null; vat_on_hammer: boolean; auction_auctions: { auctioneer_id: string | null; title: string } } | null };
  for (const i of (inv ?? []) as unknown as InvRow[]) {
    const lot = i.auction_lots;
    const firm = lot?.auction_auctions?.auctioneer_id;
    const desc = `Inv ${i.invoice_no} · Lot ${lot?.lot_no} ${lot?.title ?? ''}`;
    const s = (st ?? []).find((x) => x.invoice_id === i.id);
    if (!firm) {
      lines.push({ date: d(i.paid_at), stream: "Buyer's premium", ref: String(i.invoice_no), description: desc, amount: Number(i.premium) });
      if (Number(i.extras)) lines.push({ date: d(i.paid_at), stream: 'Lot extras (loading, delivery…)', ref: String(i.invoice_no), description: desc, amount: Number(i.extras) });
      if (!lot?.seller_id) lines.push({ date: d(i.paid_at), stream: 'Own stock sales (hammer)', ref: String(i.invoice_no), description: desc, amount: Number(i.hammer) });
      // VAT on the hammer of a consigned lot belongs to the seller; everything else on a Mnada invoice is Mnada's output VAT
      const vat = Number(i.vat) - (lot?.vat_on_hammer && lot?.seller_id ? Math.round(Number(i.hammer) * 0.16) : 0);
      lines.push({ date: d(i.paid_at), stream: 'VAT collected (output)', ref: String(i.invoice_no), description: desc, amount: vat });
    }
    if (s && s.status !== 'cancelled') {
      lines.push({ date: d(i.paid_at), stream: s.payee_kind === 'seller' ? 'Seller commission' : 'Auctioneer success fees', ref: String(i.invoice_no), description: desc, amount: Number(s.fee_kes) });
      if (Number(s.fee_vat_kes)) lines.push({ date: d(i.paid_at), stream: 'VAT collected (output)', ref: String(i.invoice_no), description: `VAT on fee · ${desc}`, amount: Number(s.fee_vat_kes) });
      if (Number(s.help_deduction_kes)) lines.push({ date: d(i.paid_at), stream: 'Listing Help', ref: String(i.invoice_no), description: `Deducted from proceeds · ${desc}`, amount: Number(s.help_deduction_kes) });
    }
  }
  for (const f of firmFees ?? []) lines.push({ date: d(f.confirmed_at), stream: 'Auctioneer listing fees', ref: f.reference, description: 'Listing fee', amount: Number(f.amount_kes) });
  for (const h of help ?? []) lines.push({ date: d(h.confirmed_at), stream: 'Listing Help', ref: h.reference, description: `${h.kind} payment`, amount: Number(h.amount_kes) });
  for (const a of aiPay ?? []) if (a.purpose === 'activation') lines.push({ date: d(a.confirmed_at), stream: 'AI tools', ref: a.reference, description: 'Activation', amount: Number(a.amount_kes) });
  const aiUsage = (aiUse ?? []).filter((x) => !x.internal).reduce((s, x) => s + -Number(x.amount_kes), 0);
  const aiCost = (aiUse ?? []).reduce((s, x) => s + Number(x.cost_kes ?? 0), 0);
  if (aiUsage) lines.push({ date: d(new Date().toISOString()), stream: 'AI tools', ref: '', description: 'Metered usage (period total)', amount: aiUsage });

  const streams = new Map<string, number>();
  for (const l of lines) streams.set(l.stream, (streams.get(l.stream) ?? 0) + l.amount);
  const vatOut = streams.get('VAT collected (output)') ?? 0;
  const revenue = [...streams.entries()].filter(([k]) => k !== 'VAT collected (output)').reduce((s, [, v]) => s + v, 0);
  const receivable = (open ?? []).reduce((s, x) => s + Number(x.total) - Number(x.paid), 0);
  const owed = (held ?? []).reduce((s, x) => s + Number(x.net_kes), 0);

  return (
    <>
      <div className="row between">
        <div className="stack" style={{ gap: 4 }}>
          <h1 style={{ fontSize: 28 }}>Finance</h1>
          <span className="small muted">Mnada&apos;s income from every stream, on payments received. Excludes money held for sellers and auctioneers.</span>
        </div>
        <div className="row">
          {PERIODS.map(([k, label]) => <Link key={k} href={`/admin/finance?p=${k}`} className={`btn btn-sm ${k === p ? 'btn-dark' : 'btn-outline'}`}>{label}</Link>)}
          <FinanceExport lines={lines} period={PERIODS.find((x) => x[0] === p)?.[1] ?? ''} />
        </div>
      </div>
      <div className="kpis">
        <div className="kpi"><span className="eyebrow">Mnada revenue (excl. VAT)</span><b style={{ color: 'var(--green)' }}>KES {kes(revenue)}</b></div>
        <div className="kpi"><span className="eyebrow">VAT collected</span><b>KES {kes(vatOut)}</b><span className="small muted">to remit to KRA</span></div>
        <div className="kpi"><span className="eyebrow">Buyers still owe</span><b>KES {kes(receivable)}</b><Link href="/admin/invoices" className="small">Payments &amp; collection</Link></div>
        <div className="kpi"><span className="eyebrow">Held for sellers / auctioneers</span><b>KES {kes(owed)}</b><Link href="/admin/payouts" className="small">Payouts</Link></div>
      </div>
      <section className="panel">
        <h3 style={{ marginBottom: 10 }}>Revenue by stream</h3>
        <table className="data">
          <thead><tr><th>Stream</th><th style={{ textAlign: 'right' }}>Entries</th><th style={{ textAlign: 'right' }}>KES</th></tr></thead>
          <tbody>
            {[...streams.entries()].filter(([k]) => k !== 'VAT collected (output)').sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <tr key={k}><td>{k}</td><td style={{ textAlign: 'right' }}>{lines.filter((l) => l.stream === k).length}</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{kes(v)}</td></tr>
            ))}
            {streams.size === 0 && <tr><td colSpan={3} className="small muted">No income recorded in this period yet.</td></tr>}
          </tbody>
        </table>
        {aiCost > 0 && <p className="small muted" style={{ marginTop: 10 }}>AI provider cost in this period: KES {kes(aiCost)} (including internal staff use).</p>}
        <p className="small muted" style={{ marginTop: 10 }}>For bookkeeping, export the lines and give them to your accountant. Expenses and full accounts are added in a later step.</p>
      </section>
    </>
  );
}
