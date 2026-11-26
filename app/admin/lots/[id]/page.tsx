import { requireArea } from '@/lib/require-area';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Lot } from '@/lib/format';
import LotForm from '../LotForm';

export default async function EditLot({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireArea('catalogue');
  const { id } = await params;
  const { saved } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from('auction_lots').select('*, auction_auctions(id, title)').eq('id', id).maybeSingle();
  if (!data) notFound();
  const { auction_auctions: auction, ...lot } = data as Lot & { auction_auctions: { id: string; title: string } };
  const { data: priv } = await supabase.from('auction_lot_private').select('reserve').eq('lot_id', id).maybeSingle();
  return (
    <>
      <div className="row between">
        <div className="stack" style={{ gap: 4 }}>
          <Link href={`/admin/auctions/${auction.id}`} className="small">← {auction.title}</Link>
          <h1 style={{ fontSize: 28 }}>Edit lot {lot.lot_no}</h1>
        </div>
        <Link href={`/lots/${lot.id}`} className="btn btn-outline">View on site</Link>
      </div>
      {saved && <div className="alert alert-ok">Lot created.</div>}
      <LotForm auctionId={auction.id} auctionTitle={auction.title} lot={lot as Lot} reserve={priv?.reserve ?? null} defaultLotNo={lot.lot_no} defaultClose={lot.closes_at} />
    </>
  );
}
