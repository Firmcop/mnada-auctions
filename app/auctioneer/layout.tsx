import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import { GavelIcon } from '@/components/Icons';
import { FIRM_STATUS, licenceExpired, myFirm } from '@/lib/auctioneer';
import AuctioneerNav from './AuctioneerNav';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Auctioneer portal', robots: { index: false } };

export default async function AuctioneerLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await getSession();
  if (!user) redirect('/login?next=/auctioneer');
  const mine = await myFirm(supabase, user.id);
  if (!mine) redirect('/account/auctioneer');
  const { firm } = mine;
  return (
    <div className="admin">
      <nav className="admin-nav" aria-label="Auctioneer">
        <Link href="/auctioneer" className="logo" style={{ color: '#fff', padding: '4px 8px 6px', background: 'none' }}>
          <span className="logo-mark" style={{ width: 34, height: 34 }}><GavelIcon size={18} /></span>
          <span className="logo-word" style={{ fontSize: 21 }}>mnada <span style={{ fontWeight: 500, fontSize: 13, color: '#AFC0CD' }}>auctioneer</span></span>
        </Link>
        <span className="small" style={{ color: '#AFC0CD', padding: '0 12px 14px' }}>{firm.name}</span>
        <AuctioneerNav />
        <Link href="/account/ai" style={{ marginTop: 12 }}>AI tools</Link>
        <Link href="/listing-help">Listing Help</Link>
        <Link href="/" style={{ marginTop: 'auto' }}>← View site</Link>
      </nav>
      <main className="admin-main">
        {firm.status !== 'approved' && <div className="alert alert-info">Firm status: <b>{FIRM_STATUS[firm.status][0]}</b>.{firm.review_note ? ` ${firm.review_note}` : ''} You can prepare your profile; auctions can be created once approved.</div>}
        {firm.status === 'approved' && licenceExpired(firm) && <div className="alert alert-err">Your auctioneer licence on file has expired. Upload the renewed licence in Firm profile to keep publishing auctions.</div>}
        {children}
      </main>
    </div>
  );
}
