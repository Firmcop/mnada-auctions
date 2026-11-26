import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import { FIRM_STATUS, myFirm } from '@/lib/auctioneer';
import FirmApplyForm from './FirmApplyForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Auctioneers — run your auctions on Mnada' };

export default async function AuctioneerApplyPage() {
  const { supabase, user, profile } = await getSession();
  if (!user) redirect('/login?next=/account/auctioneer');
  const mine = await myFirm(supabase, user.id);
  const { data: settings } = await supabase.from('auction_auctioneer_settings').select('listing_fee_kes, lot_fee_kes, success_fee_pct').eq('id', 1).single();

  return (
    <div className="wrap section stack" style={{ maxWidth: 860, gap: 20 }}>
      <div className="stack" style={{ gap: 8 }}>
        <span className="eyebrow">For licensed auctioneers</span>
        <h1>Run your auctions on Mnada</h1>
        <p style={{ color: 'var(--body)' }}>List your auctions to Mnada&apos;s verified bidders, with online bidding, automatic extensions, invoices and collection tracking — under your own firm&apos;s name and terms.</p>
        <ul className="small" style={{ margin: 0, paddingLeft: 20, color: 'var(--body)', lineHeight: 1.8 }}>
          <li>Your own firm page, logo and terms of sale.</li>
          <li>Upload lots one by one or from a spreadsheet; add your team.</li>
          <li>See bids, winners and invoice status for every lot.</li>
          <li>Fees: {settings?.listing_fee_kes || settings?.lot_fee_kes || settings?.success_fee_pct
            ? [settings.listing_fee_kes ? `KES ${Number(settings.listing_fee_kes).toLocaleString('en-US')} per auction` : null, settings.lot_fee_kes ? `KES ${Number(settings.lot_fee_kes).toLocaleString('en-US')} per lot` : null, settings.success_fee_pct ? `${settings.success_fee_pct}% of the hammer price on sold lots` : null].filter(Boolean).join(' + ')
            : 'shared with you on approval'}.</li>
        </ul>
      </div>
      {mine ? (
        <section className="panel stack" style={{ gap: 10 }}>
          <div className="row between"><h2 style={{ fontSize: 22 }}>{mine.firm.name}</h2><span className={`pill ${FIRM_STATUS[mine.firm.status][1]}`}>{FIRM_STATUS[mine.firm.status][0]}</span></div>
          {mine.firm.status === 'pending' && <p className="small">Thanks — we&apos;re checking your licence and details. You&apos;ll be able to create auctions once approved.</p>}
          {mine.firm.review_note && <p className="small" style={{ color: 'var(--warn)' }}>{mine.firm.review_note}</p>}
          {mine.firm.status === 'approved' && <Link href="/auctioneer" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Open the auctioneer portal</Link>}
          {mine.firm.status !== 'approved' && mine.role === 'owner' && <Link href="/auctioneer/profile" className="btn btn-outline" style={{ alignSelf: 'flex-start' }}>Update firm details</Link>}
        </section>
      ) : (
        <FirmApplyForm userId={user.id} defaultPhone={profile?.phone ?? ''} defaultEmail={user.email ?? ''} />
      )}
    </div>
  );
}
