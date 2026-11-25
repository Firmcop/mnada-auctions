import { createClient } from '@/lib/supabase/server';
import InvoiceTable, { type InvoiceRow } from './InvoiceTable';

export default async function InvoicesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('auction_invoices')
    .select('id, invoice_no, total, paid, status, due_at, created_at, user_id, auction_lots(lot_no, title, auction_auctions(title))')
    .order('created_at', { ascending: false })
    .limit(500);
  const ids = Array.from(new Set((data ?? []).map((d) => d.user_id)));
  const { data: people } = ids.length
    ? await supabase.from('auction_profiles').select('id, full_name, company_name, phone').in('id', ids)
    : { data: [] };
  const rows: InvoiceRow[] = (data ?? []).map((d) => {
    const p = (people ?? []).find((x) => x.id === d.user_id);
    const lot = d.auction_lots as unknown as { lot_no: number; title: string; auction_auctions: { title: string } } | null;
    return {
      id: d.id, invoice_no: d.invoice_no, total: Number(d.total), paid: Number(d.paid), status: d.status, due_at: d.due_at,
      buyer: p ? (p.company_name || p.full_name) : '—', phone: p?.phone ?? '',
      lot: lot ? `Lot ${lot.lot_no} · ${lot.title}` : '', auction: lot?.auction_auctions?.title ?? '',
    };
  });
  return (
    <>
      <h1 style={{ fontSize: 28 }}>Payments &amp; collection</h1>
      <InvoiceTable initial={rows} />
    </>
  );
}
