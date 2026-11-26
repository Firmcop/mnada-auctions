import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import type { Listing } from '@/lib/format';
import ListingForm from '@/app/admin/listings/ListingForm';

export default async function SellerEditListing({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const { supabase, user } = await getSession();
  const { data } = await supabase.from('auction_listings').select('*').eq('id', id).eq('owner_id', user!.id).maybeSingle();
  if (!data) notFound();
  const l = data as Listing;
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <Link href="/seller/listings" className="small">← Listings</Link>
        <h1 style={{ fontSize: 28 }}>{l.title}</h1>
      </div>
      {saved && <div className="alert alert-ok">Submitted. We&apos;ll review it and publish it shortly.</div>}
      <ListingForm mode="seller" userId={user!.id} listing={l} />
    </>
  );
}
