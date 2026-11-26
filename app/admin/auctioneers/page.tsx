import { createClient } from '@/lib/supabase/server';
import { kes } from '@/lib/format';
import type { Firm, FirmFee, FirmPrivate, FirmSettings } from '@/lib/auctioneer';
import FirmsAdmin from './FirmsAdmin';

export default async function AdminAuctioneers() {
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ data: firms }, { data: privs }, { data: settings }, { data: fees }, { data: review }] = await Promise.all([
    supabase.from('auction_auctioneers').select('*').order('created_at', { ascending: false }),
    supabase.from('auction_auctioneer_private').select('*'),
    supabase.from('auction_auctioneer_settings').select('*').eq('id', 1).single(),
    supabase.from('auction_auctioneer_fees').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('auction_auctions').select('id, title, slug, auctioneer_id, publish_state, listing_fee_kes, success_fee_pct, first_close_at').eq('status', 'draft').not('auctioneer_id', 'is', null).not('publish_state', 'is', null),
  ]);
  const p = (privs ?? []) as FirmPrivate[];
  const docs: Record<string, string> = {};
  for (const x of p) {
    if (x.licence_doc) {
      const { data } = await supabase.storage.from('auction-kyc').createSignedUrl(x.licence_doc, 3600);
      if (data?.signedUrl) docs[x.auctioneer_id] = data.signedUrl;
    }
  }
  const f = (fees ?? []) as FirmFee[];
  const paid30 = f.filter((x) => x.status === 'paid' && (x.confirmed_at ?? '') >= since).reduce((s, x) => s + Number(x.amount_kes), 0);
  const list = (firms ?? []) as Firm[];
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 style={{ fontSize: 28 }}>Auctioneers</h1>
        <span className="small muted">Licensed auctioneer firms running their own auctions on Mnada. They pay a listing fee to publish; the success fee is taken from sale proceeds at payout.</span>
      </div>
      <div className="kpis">
        <div className="kpi"><span className="eyebrow">Approved firms</span><b>{list.filter((x) => x.status === 'approved').length}</b></div>
        <div className="kpi"><span className="eyebrow">Applications</span><b>{list.filter((x) => x.status === 'pending').length}</b></div>
        <div className="kpi"><span className="eyebrow">Listing fees (30 days)</span><b>KES {kes(paid30)}</b></div>
      </div>
      <FirmsAdmin firms={list} privs={p} docs={docs} settings={settings as FirmSettings} fees={f} review={review ?? []} />
    </>
  );
}
