import { getSession } from '@/lib/supabase/server';
import { myFirm } from '@/lib/auctioneer';
import ImportTool from '@/app/admin/import/ImportTool';

export default async function FirmImport() {
  const { supabase, user } = await getSession();
  const { firm } = (await myFirm(supabase, user!.id))!;
  const { data } = await supabase.from('auction_auctions').select('id, title, first_close_at').eq('auctioneer_id', firm.id).eq('status', 'draft').order('created_at', { ascending: false });
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 style={{ fontSize: 28 }}>Bulk import lots</h1>
        <span className="muted">Add or update many lots in a draft auction at once from Excel, Google Sheets or CSV, with photos.</span>
      </div>
      {(data ?? []).length === 0 ? <p className="small muted">Create a draft auction first.</p> : <ImportTool auctions={data ?? []} mode="auctioneer" lotFolder={`auctioneers/${firm.id}/lots`} basePath="/auctioneer" />}
    </>
  );
}
