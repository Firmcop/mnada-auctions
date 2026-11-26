import { requireArea } from '@/lib/require-area';
import { createClient } from '@/lib/supabase/server';
import { kes } from '@/lib/format';
import type { Payout, Settlement } from '@/lib/settlements';
import PayoutsAdmin from './PayoutsAdmin';

export default async function AdminPayouts() {
  await requireArea('finance');
  const supabase = await createClient();
  const [{ data: settings }, { data: st }, { data: po }, { data: firms }] = await Promise.all([
    supabase.from('auction_payout_settings').select('*').eq('id', 1).single(),
    supabase.from('auction_settlements').select('*, auction_lots(lot_no, title)').neq('status', 'cancelled').order('created_at', { ascending: false }).limit(500),
    supabase.from('auction_payouts').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('auction_auctioneers').select('id, name'),
  ]);
  const settlements = (st ?? []) as (Settlement & { auction_lots: { lot_no: number; title: string } | null })[];
  const sellerIds = Array.from(new Set([...settlements.map((s) => s.seller_id), ...((po ?? []) as Payout[]).map((p) => p.seller_id)].filter(Boolean))) as string[];
  const { data: sellers } = sellerIds.length ? await supabase.from('auction_profiles').select('id, full_name, business_name').in('id', sellerIds) : { data: [] };
  const names: Record<string, string> = {};
  (sellers ?? []).forEach((s) => { names[s.id] = s.business_name || s.full_name; });
  (firms ?? []).forEach((f) => { names[f.id] = f.name; });
  const sum = (k: Settlement['status']) => settlements.filter((s) => s.status === k).reduce((a, s) => a + Number(s.net_kes), 0);
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 style={{ fontSize: 28 }}>Seller &amp; auctioneer payouts</h1>
        <span className="small muted">Each sold lot from a seller or auctioneer is split automatically: their share is held until the buyer pays and collects, then released for payout. Mnada&apos;s commission or success fee is kept.</span>
      </div>
      <div className="kpis">
        <div className="kpi"><span className="eyebrow">Awaiting buyer payment</span><b>KES {kes(sum('awaiting_payment'))}</b></div>
        <div className="kpi"><span className="eyebrow">Held (paid, not collected)</span><b>KES {kes(sum('held'))}</b></div>
        <div className="kpi"><span className="eyebrow">Released — to pay out</span><b style={{ color: 'var(--accent)' }}>KES {kes(sum('released'))}</b></div>
        <div className="kpi"><span className="eyebrow">Paid out</span><b>KES {kes(sum('paid'))}</b></div>
      </div>
      <PayoutsAdmin settings={settings} settlements={settlements} payouts={(po ?? []) as Payout[]} names={names} />
    </>
  );
}
