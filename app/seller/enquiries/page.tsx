import { getSession } from '@/lib/supabase/server';
import EnquiryInbox, { type EnquiryRow } from '@/app/admin/enquiries/EnquiryInbox';

export default async function SellerEnquiries() {
  const { supabase, user } = await getSession();
  const { data } = await supabase.from('auction_enquiries')
    .select('*, auction_listings!inner(title, slug, ref_no, price, price_type, owner_id)')
    .eq('auction_listings.owner_id', user!.id)
    .order('created_at', { ascending: false }).limit(300);
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 style={{ fontSize: 28 }}>Enquiries &amp; offers</h1>
        <span className="small muted">From buyers interested in your listings. Call or WhatsApp them, then update the status.</span>
      </div>
      <EnquiryInbox initial={(data ?? []) as unknown as EnquiryRow[]} />
    </>
  );
}
