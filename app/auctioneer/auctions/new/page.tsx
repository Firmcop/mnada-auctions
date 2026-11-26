import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import { myFirm } from '@/lib/auctioneer';
import AuctionForm from '@/app/admin/auctions/AuctionForm';

export default async function NewFirmAuction() {
  const { supabase, user } = await getSession();
  const { firm } = (await myFirm(supabase, user!.id))!;
  if (firm.status !== 'approved') redirect('/auctioneer');
  return (
    <>
      <h1 style={{ fontSize: 28 }}>New auction</h1>
      <p className="small muted">Create the auction, add lots, then send it for publishing. It stays hidden until it&apos;s published.</p>
      <section className="panel"><AuctionForm mode="auctioneer" auctioneerId={firm.id} basePath="/auctioneer" defaultTerms={firm.default_terms} /></section>
    </>
  );
}
