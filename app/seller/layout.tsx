import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import { GavelIcon } from '@/components/Icons';
import SellerNav from './SellerNav';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Seller portal', robots: { index: false } };

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getSession();
  if (!user) redirect('/login?next=/seller');
  if (profile?.seller_status !== 'approved') redirect('/account/seller');
  return (
    <div className="admin">
      <nav className="admin-nav" aria-label="Seller">
        <Link href="/seller" className="logo" style={{ color: '#fff', padding: '4px 8px 6px', background: 'none' }}>
          <span className="logo-mark" style={{ width: 34, height: 34 }}><GavelIcon size={18} /></span>
          <span className="logo-word" style={{ fontSize: 21 }}>mnada <span style={{ fontWeight: 500, fontSize: 13, color: '#AFC0CD' }}>seller</span></span>
        </Link>
        <span className="small" style={{ color: '#AFC0CD', padding: '0 12px 14px' }}>{profile.business_name}</span>
        <SellerNav />
        <Link href="/account/ai" style={{ marginTop: 12 }}>AI tools</Link>
        <Link href="/" style={{ marginTop: 'auto' }}>← View site</Link>
      </nav>
      <main className="admin-main">{children}</main>
    </div>
  );
}
