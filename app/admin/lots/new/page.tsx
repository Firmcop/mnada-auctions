import { requireArea } from '@/lib/require-area';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LotForm from '../LotForm';

export default async function NewLot({ searchParams }: { searchParams: Promise<{ auction?: string }> }) {
  await requireArea('catalogue');
  const { auction: auctionId } = await searchParams;
  if (!auctionId) notFound();
  const supabase = await createClient();
  const { data: auction } = await supabase.from('auction_auctions').select('id, title, first_close_at').eq('id', auctionId).maybeSingle();
  if (!auction) notFound();
  const { data: last } = await supabase.from('auction_lots').select('lot_no').eq('auction_id', auctionId).order('lot_no', { ascending: false }).limit(1).maybeSingle();
  const nextNo = (last?.lot_no ?? 0) + 1;
  const defaultClose = auction.first_close_at ? new Date(new Date(auction.first_close_at).getTime() + (nextNo - 1) * 60000).toISOString() : null;
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <Link href={`/admin/auctions/${auction.id}`} className="small">← {auction.title}</Link>
        <h1 style={{ fontSize: 28 }}>Add lot</h1>
      </div>
      <LotForm auctionId={auction.id} auctionTitle={auction.title} defaultLotNo={nextNo} defaultClose={defaultClose} />
    </>
  );
}
