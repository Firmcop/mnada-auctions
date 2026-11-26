import { createClient } from '@/lib/supabase/server';
import type { StockItem } from '@/lib/erp';
import StockAdmin from './StockAdmin';

export default async function StockPage() {
  const supabase = await createClient();
  const [{ data }, { data: sellers }, { data: jobs }, { data: lots }, { data: listings }] = await Promise.all([
    supabase.from('auction_stock').select('*').order('received_at', { ascending: false }).limit(1000),
    supabase.from('auction_profiles').select('id, full_name, business_name').eq('seller_status', 'approved'),
    supabase.from('auction_help_requests').select('id, reference, contact_name').not('status', 'in', '(cancelled,declined)').order('created_at', { ascending: false }).limit(100),
    supabase.from('auction_lots').select('id, lot_no, title, status, auction_auctions!inner(title, status)').neq('auction_auctions.status', 'closed').order('created_at', { ascending: false }).limit(400),
    supabase.from('auction_listings').select('id, title, status').neq('status', 'sold').order('created_at', { ascending: false }).limit(300),
  ]);
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 style={{ fontSize: 28 }}>Yard stock</h1>
        <span className="small muted">Every item physically at the yard: who owns it, where it sits, and where it is in the sale. Status updates by itself when the linked lot sells or the buyer collects.</span>
      </div>
      <StockAdmin items={(data ?? []) as StockItem[]} sellers={sellers ?? []} jobs={jobs ?? []}
        lots={(lots ?? []).map((l) => ({ id: l.id, label: `Lot ${l.lot_no} · ${l.title} (${(l.auction_auctions as unknown as { title: string }).title})` }))}
        listings={(listings ?? []).map((l) => ({ id: l.id, label: `Direct sale · ${l.title}` }))} />
    </>
  );
}
