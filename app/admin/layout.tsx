import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import { GavelIcon } from '@/components/Icons';
import AdminNav from './AdminNav';

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
  return (
    <div className="admin">
      <nav className="admin-nav" aria-label="Admin">
        <Link href="/admin" className="logo" style={{ color: '#fff', padding: '4px 8px 18px', background: 'none' }}>
          <span className="logo-mark" style={{ width: 34, height: 34 }}><GavelIcon size={18} /></span>
          <span className="logo-word" style={{ fontSize: 21 }}>mnada <span style={{ fontWeight: 500, fontSize: 13, color: '#AFC0CD' }}>admin</span></span>
        </Link>
        <AdminNav />
        <Link href="/" style={{ marginTop: 'auto' }}>← View site</Link>
      </nav>
      <main className="admin-main">{children}</main>
    </div>
  );
}
