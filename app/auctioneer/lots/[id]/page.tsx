import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import type { Lot } from '@/lib/format';
import { myFirm } from '@/lib/auctioneer';
import LotForm from '@/app/admin/lots/LotForm';

export default async function FirmEditLot({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const { supabase, user } = await getSession();
  const { firm } = (await myFirm(supabase, user!.id))!;
  const { data } = await supabase.from('auction_lots').select('*, auction_auctions!inner(id, title, status, auctioneer_id)').eq('id', id).eq('auction_auctions.auctioneer_id', firm.id).maybeSingle();
  if (!data) notFound();
  const { auction_auctions: auction, ...lot } = data as Lot & { auction_auctions: { id: string; title: string; status: string } };
  const { data: priv } = await supabase.from('auction_lot_private').select('reserve').eq('lot_id', id).maybeSingle();
  return (
    <>
      <div className="row between">
        <div className="stack" style={{ gap: 4 }}>
          <Link href={`/auctioneer/auctions/${auction.id}`} className="small">← {auction.title}</Link>
          <h1 style={{ fontSize: 28 }}>Edit lot {lot.lot_no}</h1>
        </div>
        {auction.status !== 'draft' && <Link href={`/lots/${lot.id}`} className="btn btn-outline">View on site</Link>}
      </div>
      {saved && <div className="alert alert-ok">Lot saved.</div>}
      <LotForm auctionId={auction.id} auctionTitle={auction.title} lot={lot as Lot} reserve={priv?.reserve ?? null} defaultLotNo={lot.lot_no} defaultClose={lot.closes_at}
        basePath="/auctioneer" photoFolder={`auctioneers/${firm.id}/lots`} mode="auctioneer" locked={auction.status !== 'draft'} />
    </>
  );
}
