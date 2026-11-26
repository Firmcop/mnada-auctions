import { getSession } from '@/lib/supabase/server';
import { myFirm } from '@/lib/auctioneer';
import { loadAllocations } from '@/lib/allocations';
import AllocationDesk from '@/components/AllocationDesk';

export default async function FirmAllocations() {
  const { supabase, user } = await getSession();
  const { firm } = (await myFirm(supabase, user!.id))!;
  const list = (await loadAllocations(supabase, { since: new Date(Date.now() - 30 * 86400000).toISOString() })).filter((a) => a.auction_lots?.auction_auctions?.auctioneer_id === firm.id);
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 style={{ fontSize: 28 }}>Allocation</h1>
        <span className="small muted">Lots that closed below the reserve or need your approval. Decide within 48 hours: accept, counter-offer (up to 2 rounds) or decline. Undecided lots stay unsold.</span>
      </div>
      <AllocationDesk allocations={list} empty="Nothing to decide right now." />
    </>
  );
}
