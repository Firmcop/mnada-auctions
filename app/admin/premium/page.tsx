import { requireArea } from '@/lib/require-area';
import { createClient } from '@/lib/supabase/server';
import PremiumRules from './PremiumRules';

export default async function PremiumPage() {
  await requireArea('finance');
  const supabase = await createClient();
  const { data } = await supabase.from('auction_premium_rules').select('*').order('category', { nullsFirst: true }).order('min_hammer');
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 style={{ fontSize: 28 }}>Buyer&apos;s premium</h1>
        <span className="small muted">By default each auction&apos;s own premium % applies. Rules here override it on Mnada&apos;s auctions — by category, by price band, or both (e.g. 10% normally, 7% on hammer prices above KES 2,000,000). The most specific rule that fits a lot wins. Auctioneer firms&apos; auctions always use their own premium.</span>
      </div>
      <PremiumRules rules={data ?? []} />
    </>
  );
}
