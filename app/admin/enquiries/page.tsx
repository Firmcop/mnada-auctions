import { createClient } from '@/lib/supabase/server';
import EnquiryInbox, { type EnquiryRow } from './EnquiryInbox';

export default async function EnquiriesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('auction_enquiries')
    .select('*, auction_listings(title, slug, ref_no, price, price_type)')
    .order('created_at', { ascending: false }).limit(300);
  return (
    <>
      <h1 style={{ fontSize: 28 }}>Enquiries &amp; offers</h1>
      <EnquiryInbox initial={(data ?? []) as unknown as EnquiryRow[]} />
    </>
  );
}
