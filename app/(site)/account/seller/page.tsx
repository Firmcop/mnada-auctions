import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import SellerApplyForm from './SellerApplyForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sell on Mnada' };

export default async function SellerAccountPage() {
  const { user, profile } = await getSession();
  if (!user) redirect('/login?next=/account/seller');
  if (!profile) redirect('/register');
  const s = profile.seller_status;

  return (
    <div className="wrap section stack" style={{ maxWidth: 820, gap: 20 }}>
      <h1>Sell on Mnada</h1>
      {s === 'approved' && (
        <div className="panel card stack" style={{ gap: 10 }}>
          <span className="pill pill-green" style={{ alignSelf: 'flex-start' }}>Seller account active</span>
          <p>List items for direct sale, send items for auction, answer enquiries and follow your sales in the seller portal.</p>
          <Link href="/seller" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Open seller portal</Link>
        </div>
      )}
      {s === 'pending' && (
        <div className="alert alert-info">Thanks — your seller application is being reviewed. We usually reply within one working day.</div>
      )}
      {s === 'suspended' && <div className="alert alert-err">Your seller account is suspended. Please contact us.</div>}
      {(s === 'none' || s === 'rejected') && (
        <>
          {s === 'rejected' && <div className="alert alert-err">Your previous application wasn&apos;t approved. You can update your details and apply again.</div>}
          {profile.status !== 'approved' && (
            <div className="alert alert-info">Tip: upload your ID or company certificate on <Link href="/account">your account page</Link> first — sellers must be verified too.</div>
          )}
          <div className="stack" style={{ gap: 6 }}>
            <p style={{ color: 'var(--body)' }}>Open a seller account to list machinery, vehicles, containers and structures on Mnada — for a fixed price, for offers, or in our timed auctions. We review every seller and every listing before it goes live.</p>
            <ul style={{ color: 'var(--body)', margin: 0, paddingLeft: 20 }}>
              <li>No listing fee — commission only when you sell (rate agreed on approval).</li>
              <li>Buyers pay us; we pay you out after collection, by M-Pesa or bank transfer.</li>
              <li>Optional paid AI tools to write listings and search descriptions for you.</li>
            </ul>
          </div>
          <SellerApplyForm profile={{ business_name: profile.business_name ?? profile.company_name ?? '', business_description: profile.business_description ?? '', business_location: profile.business_location ?? '', payout_method: profile.payout_method ?? 'mpesa', payout_details: profile.payout_details ?? profile.phone }} userId={user.id} />
        </>
      )}
    </div>
  );
}
