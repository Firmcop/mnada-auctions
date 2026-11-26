import { getSession } from '@/lib/supabase/server';
import { myFirm, type FirmPrivate } from '@/lib/auctioneer';
import FirmProfileForm from './FirmProfileForm';

export default async function FirmProfile() {
  const { supabase, user } = await getSession();
  const { firm, role } = (await myFirm(supabase, user!.id))!;
  const [{ data: priv }, { data: members }] = await Promise.all([
    supabase.from('auction_auctioneer_private').select('*').eq('auctioneer_id', firm.id).maybeSingle(),
    supabase.from('auction_auctioneer_members').select('user_id, role, created_at').eq('auctioneer_id', firm.id).order('created_at'),
  ]);
  const ids = (members ?? []).map((m) => m.user_id);
  const { data: people } = ids.length ? await supabase.rpc('auction_firm_member_names', { p_auctioneer: firm.id }) : { data: [] };
  return (
    <>
      <h1 style={{ fontSize: 28 }}>Firm profile &amp; team</h1>
      <FirmProfileForm firm={firm} priv={(priv ?? null) as FirmPrivate | null} isOwner={role === 'owner'} userId={user!.id}
        members={(members ?? []).map((m) => ({ ...m, name: ((people ?? []) as { user_id: string; name: string; email: string }[]).find((p) => p.user_id === m.user_id) }))} />
    </>
  );
}
