import { requireArea } from '@/lib/require-area';
import { createClient } from '@/lib/supabase/server';
import { loadAllocations } from '@/lib/allocations';
import AllocationDesk from '@/components/AllocationDesk';

export default async function AdminAllocations() {
  await requireArea('operations');
  const supabase = await createClient();
  const list = await loadAllocations(supabase, { since: new Date(Date.now() - 14 * 86400000).toISOString() });
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 style={{ fontSize: 28 }}>Allocation</h1>
        <span className="small muted">Lots that closed below the reserve, seller-approval lots, and lots whose buyer didn&apos;t pay. The seller has 48 hours to accept, counter-offer (2 rounds) or decline; offers to bidders last 24 hours. Staff can act for any seller, e.g. after agreeing by phone.</span>
      </div>
      <div className="kpis">
        <div className="kpi"><span className="eyebrow">Awaiting decision</span><b>{list.filter((a) => a.status === 'open').length}</b></div>
        <div className="kpi"><span className="eyebrow">Sold via allocation (14 days)</span><b>{list.filter((a) => a.status === 'agreed').length}</b></div>
      </div>
      <AllocationDesk allocations={list} empty="No lots in allocation." />
    </>
  );
}
