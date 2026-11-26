import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import { GavelIcon } from '@/components/Icons';
import AdminNav from './AdminNav';
import { ROLE_LABEL, type StaffRole } from '@/lib/staff';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getSession();
  if (!user) redirect('/login?next=/admin');
  if (!profile?.is_admin) {
    return (
      <div className="wrap section stack" style={{ maxWidth: 560 }}>
        <h1 style={{ fontSize: 28 }}>Staff only</h1>
        <p>This account doesn&apos;t have admin access. <Link href="/">Back to the site</Link></p>
      </div>
    );
  }
  const role = (profile.admin_role ?? 'owner') as StaffRole;
  return (
    <div className="admin">
      <nav className="admin-nav" aria-label="Admin">
        <Link href="/admin" className="logo" style={{ color: '#fff', padding: '4px 8px 6px', background: 'none' }}>
          <span className="logo-mark" style={{ width: 34, height: 34 }}><GavelIcon size={18} /></span>
          <span className="logo-word" style={{ fontSize: 21 }}>mnada <span style={{ fontWeight: 500, fontSize: 13, color: '#AFC0CD' }}>admin</span></span>
        </Link>
        <span className="small" style={{ color: '#AFC0CD', padding: '0 12px 12px' }}>{profile.full_name} · {ROLE_LABEL[role][0]}</span>
        <AdminNav role={role} />
        <Link href="/" style={{ marginTop: 'auto' }}>← View site</Link>
      </nav>
      <main className="admin-main">{children}</main>
    </div>
  );
}
