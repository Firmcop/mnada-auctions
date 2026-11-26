import { createClient } from '@/lib/supabase/server';
import ConsignmentAdmin, { type ConsignRow } from './ConsignmentAdmin';

export default async function ConsignmentsPage() {
  const supabase = await createClient();
  const [{ data }, { data: auctions }] = await Promise.all([
    supabase.from('auction_consignments').select('*').order('created_at', { ascending: false }).limit(300),
    supabase.from('auction_auctions').select('id, title, first_close_at').neq('status', 'closed').order('created_at', { ascending: false }),
  ]);
  const ids = Array.from(new Set((data ?? []).map((c) => c.seller_id)));
  const { data: sellers } = ids.length ? await supabase.from('auction_profiles').select('id, business_name, phone').in('id', ids) : { data: [] };
  const rows = (data ?? []).map((c) => ({ ...c, seller: (sellers ?? []).find((s) => s.id === c.seller_id) ?? null })) as ConsignRow[];
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 style={{ fontSize: 28 }}>Items sent for auction</h1>
        <span className="small muted">From sellers. Accept an item to turn it into a lot in one of your auctions.</span>
      </div>
      <ConsignmentAdmin initial={rows} auctions={auctions ?? []} />
    </>
  );
}
