import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import type { CampusSettings, Member } from '@/lib/campus';

/** Signed-in campus member (any status) plus settings; sends others to the join page. */
export async function requireMember() {
  const { supabase, user, profile } = await getSession();
  if (!user) redirect('/login?next=/campus/dashboard');
  const [{ data: m }, { data: s }] = await Promise.all([
    supabase.from('auction_campus_members').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('auction_campus_settings').select('*').eq('id', 1).single(),
  ]);
  if (!m) redirect('/campus#join');
  return { supabase, user, profile, member: m as Member, settings: s as CampusSettings };
}
