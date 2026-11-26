import { requireArea } from '@/lib/require-area';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Listing } from '@/lib/format';
import ListingForm from '../ListingForm';

export default async function EditListing({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireArea('catalogue');
  const { id } = await params;
  const { saved } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from('auction_listings').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  const l = data as Listing;
  return (
    <>
      <div className="row between">
        <div className="stack" style={{ gap: 4 }}>
          <Link href="/admin/listings" className="small">← Direct sale</Link>
          <h1 style={{ fontSize: 28 }}>{l.title}</h1>
        </div>
        {l.status !== 'draft' && <Link href={`/direct-sale/${l.slug}`} className="btn btn-outline">View on site</Link>}
      </div>
      {saved && <div className="alert alert-ok">Item created.</div>}
      <ListingForm listing={l} />
    </>
  );
}
