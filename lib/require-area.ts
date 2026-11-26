import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import { canArea, type Area, type StaffRole } from '@/lib/staff';

/** Call at the top of an admin page: sends staff without the right role back to the dashboard. */
export async function requireArea(area: Area) {
  const { profile } = await getSession();
  const role = (profile?.is_admin ? (profile.admin_role ?? 'owner') : null) as StaffRole | null;
  if (!canArea(role, area)) redirect('/admin?denied=1');
  return role!;
}
