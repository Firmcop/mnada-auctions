import Link from 'next/link';
import { getSession } from '@/lib/supabase/server';
import ListingForm from '@/app/admin/listings/ListingForm';

export default async function SellerNewListing() {
  const { user } = await getSession();
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <Link href="/seller/listings" className="small">← Listings</Link>
        <h1 style={{ fontSize: 28 }}>List an item for sale</h1>
        <span className="small muted">Our team checks every listing before it goes live — usually the same working day.</span>
      </div>
      <ListingForm mode="seller" userId={user!.id} />
    </>
  );
}
