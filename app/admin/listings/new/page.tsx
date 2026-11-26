import Link from 'next/link';
import ListingForm from '../ListingForm';

export default function NewListing() {
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <Link href="/admin/listings" className="small">← Direct sale</Link>
        <h1 style={{ fontSize: 28 }}>Add direct-sale item</h1>
      </div>
      <ListingForm />
    </>
  );
}
