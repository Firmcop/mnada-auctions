import { requireArea } from '@/lib/require-area';
import { createClient, getSession } from '@/lib/supabase/server';
import StaffAdmin from './StaffAdmin';

export default async function StaffPage() {
  await requireArea('staff');
  const { user } = await getSession();
  const supabase = await createClient();
  const { data } = await supabase.from('auction_profiles').select('id, full_name, email, phone, admin_role').eq('is_admin', true).order('full_name');
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 style={{ fontSize: 28 }}>Staff &amp; roles</h1>
        <span className="small muted">Give each staff member only what their job needs. Roles are enforced by the database, not just hidden in the menu.</span>
      </div>
      <StaffAdmin staff={(data ?? []) as { id: string; full_name: string; email: string | null; phone: string; admin_role: string | null }[]} me={user!.id} />
    </>
  );
}
