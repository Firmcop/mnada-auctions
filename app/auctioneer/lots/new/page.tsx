import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import { myFirm } from '@/lib/auctioneer';
import LotForm from '@/app/admin/lots/LotForm';

export default async function FirmNewLot({ searchParams }: { searchParams: Promise<{ auction?: string }> }) {
  const { auction: auctionId } = await searchParams;
  if (!auctionId) notFound();
  const { supabase, user } = await getSession();
  const { firm } = (await myFirm(supabase, user!.id))!;
  const { data: auction } = await supabase.from('auction_auctions').select('id, title, first_close_at, status').eq('id', auctionId).eq('auctioneer_id', firm.id).maybeSingle();
  if (!auction) notFound();
  if (auction.status !== 'draft') redirect(`/auctioneer/auctions/${auction.id}`);
  const { data: last } = await supabase.from('auction_lots').select('lot_no').eq('auction_id', auctionId).order('lot_no', { ascending: false }).limit(1).maybeSingle();
  const nextNo = (last?.lot_no ?? 0) + 1;
  const defaultClose = auction.first_close_at ? new Date(new Date(auction.first_close_at).getTime() + (nextNo - 1) * 60000).toISOString() : null;
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <Link href={`/auctioneer/auctions/${auction.id}`} className="small">← {auction.title}</Link>
        <h1 style={{ fontSize: 28 }}>Add lot</h1>
      </div>
      <LotForm auctionId={auction.id} auctionTitle={auction.title} defaultLotNo={nextNo} defaultClose={defaultClose} basePath="/auctioneer" photoFolder={`auctioneers/${firm.id}/lots`} mode="auctioneer" />
    </>
  );
}
