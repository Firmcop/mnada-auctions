import { requireArea } from '@/lib/require-area';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/supabase/server';
import BidderQueue from './BidderQueue';

export default async function BiddersPage() {
  await requireArea('people');
  const supabase = await createClient();
  const { data } = await supabase.from('auction_profiles').select('*').order('created_at', { ascending: false }).limit(300);
  return (
    <>
      <h1 style={{ fontSize: 28 }}>Bidders</h1>
      <BidderQueue initial={(data ?? []) as (Profile & { email: string | null })[]} />
    </>
  );
}
