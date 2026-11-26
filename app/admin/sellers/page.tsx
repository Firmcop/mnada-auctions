import { requireArea } from '@/lib/require-area';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/supabase/server';
import SellerAdmin from './SellerAdmin';

export default async function SellersPage() {
  await requireArea('people');
  const supabase = await createClient();
  const { data } = await supabase.from('auction_profiles').select('*').neq('seller_status', 'none').order('seller_applied_at', { ascending: false });
  return (
    <>
      <h1 style={{ fontSize: 28 }}>Sellers</h1>
      <SellerAdmin initial={(data ?? []) as Profile[]} />
    </>
  );
}
