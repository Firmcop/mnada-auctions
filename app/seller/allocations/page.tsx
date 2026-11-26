import { getSession } from '@/lib/supabase/server';
import { loadAllocations } from '@/lib/allocations';
import AllocationDesk from '@/components/AllocationDesk';

export default async function SellerAllocations() {
  const { supabase, user } = await getSession();
  const list = (await loadAllocations(supabase, { since: new Date(Date.now() - 30 * 86400000).toISOString() })).filter((a) => a.auction_lots?.seller_id === user!.id);
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 style={{ fontSize: 28 }}>Decisions on your lots</h1>
        <span className="small muted">When bidding closes below your reserve, you have 48 hours to accept the highest bid, make a counter-offer (up to 2 rounds) or decline. If you don&apos;t decide, the lot stays unsold. Prices exclude the buyer&apos;s premium; your commission applies to the agreed price.</span>
      </div>
      <AllocationDesk allocations={list} empty="Nothing to decide right now." />
    </>
  );
}
