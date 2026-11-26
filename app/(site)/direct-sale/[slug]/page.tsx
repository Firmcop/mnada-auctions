import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession } from '@/lib/supabase/server';
import Gallery from '../../lots/[id]/Gallery';
import EnquiryForm from './EnquiryForm';
import { CONDITION_TAGS, listingPrice, photoUrl, SELLER_TYPES, type Listing } from '@/lib/format';
import { jsonLd, listingSeoDescription, listingSeoTitle, SITE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { supabase } = await getSession();
  const { data } = await supabase.from('auction_listings').select('*').eq('slug', slug).maybeSingle();
  if (!data) return {};
  const l = data as Listing;
  const title = listingSeoTitle(l);
  const description = listingSeoDescription(l);
  const images = (l.photos ?? []).slice(0, 1).map((p) => ({ url: photoUrl(p), alt: l.title }));
  return { title, description, alternates: { canonical: `/direct-sale/${slug}` }, openGraph: { title, description, images, url: `/direct-sale/${slug}` } };
}

export default async function ListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, user, profile } = await getSession();
  const { data } = await supabase.from('auction_listings').select('*').eq('slug', slug).maybeSingle();
  if (!data) notFound();
  const l = data as Listing;

  const offer = l.price !== null && l.price_type !== 'on_request'
    ? { '@type': 'Offer', url: `${SITE_URL}/direct-sale/${l.slug}`, priceCurrency: 'KES', price: Number(l.price),
        availability: l.status === 'sold' ? 'https://schema.org/SoldOut' : l.status === 'reserved' ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/InStock',
        itemCondition: l.condition_tags.includes('new') ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
        seller: { '@type': 'Organization', name: 'Mnada' } }
    : undefined;
  const ld = [
    {
      '@context': 'https://schema.org', '@type': 'Product', name: l.title, description: l.summary ?? l.description ?? undefined,
      image: (l.photos ?? []).map(photoUrl), sku: l.sku ?? `DS-${l.ref_no}`, brand: l.seller_type === 'own' ? { '@type': 'Brand', name: 'Mnada' } : undefined,
      category: [l.category, l.subcategory].filter(Boolean).join(' > '), offers: offer,
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Direct sale', item: `${SITE_URL}/direct-sale` },
        { '@type': 'ListItem', position: 3, name: l.title },
      ],
    },
  ];

  return (
    <div className="wrap" style={{ padding: '20px 24px 40px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
      <nav aria-label="Breadcrumb" className="small muted row" style={{ gap: 8 }}>
        <Link href="/" style={{ color: 'var(--muted)' }}>Home</Link><span>/</span>
        <Link href="/direct-sale" style={{ color: 'var(--muted)' }}>Direct sale</Link><span>/</span>
        <span style={{ color: 'var(--ink)' }}>{l.title}</span>
      </nav>
      <div className="row" style={{ marginTop: 16, gap: 32, alignItems: 'flex-start' }}>
        <div className="stack" style={{ flex: '999 1 540px', minWidth: 0, gap: 26 }}>
          <div className="stack" style={{ gap: 8 }}>
            <span className="eyebrow">{l.subcategory ?? l.category}{l.location ? ` · ${l.location}` : ''}</span>
            <h1 style={{ fontSize: 'clamp(26px, 3.4vw, 36px)' }}>{l.title}</h1>
            <div className="row small" style={{ gap: 8 }}>
              <span className="pill pill-grey">Ref DS-{l.ref_no}</span>
              <span className="pill pill-grey">{SELLER_TYPES[l.seller_type]}</span>
              {l.condition_tags.map((t) => <span key={t} className="pill pill-green">{CONDITION_TAGS[t] ?? t}</span>)}
            </div>
            {l.summary && <p style={{ fontSize: 17, color: 'var(--body)' }}>{l.summary}</p>}
          </div>
          <Gallery photos={l.photos ?? []} title={l.title} />
          {l.specs?.length > 0 && (
            <section className="stack">
              <h3 style={{ fontSize: 22 }}>Specifications</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', columnGap: 24, borderTop: '1px solid var(--line)' }}>
                {l.specs.map(([k, v], i) => (
                  <div key={i} className="row between" style={{ padding: '11px 0', borderBottom: '1px solid var(--line)' }}>
                    <span className="muted">{k}</span><span style={{ fontWeight: 600, textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
          {l.description && (
            <section className="stack">
              <h3 style={{ fontSize: 22 }}>Description</h3>
              <p style={{ color: '#2D3540', whiteSpace: 'pre-line' }}>{l.description}</p>
            </section>
          )}
        </div>
        <aside style={{ flex: '1 1 360px', minWidth: 0, position: 'sticky', top: 16 }} className="stack">
          <div className="card stack" style={{ padding: 22, gap: 14, boxShadow: '0 8px 24px rgba(15,42,61,.06)' }}>
            <span className="pill" style={{ alignSelf: 'flex-start', background: 'var(--navy)', color: '#fff' }}>
              {l.status === 'active' ? 'BUY NOW · DIRECT SALE' : l.status === 'reserved' ? 'RESERVED' : 'SOLD'}
            </span>
            <span style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: l.price === null ? 28 : 34, color: 'var(--navy)' }}>
              {l.price === null ? (l.price_type === 'offer' ? 'Open to offers' : 'Price on request') : l.price_type === 'on_request' ? 'Price on request' : `KES ${Number(l.price).toLocaleString('en-US')}`}
            </span>
            <span className="small muted">
              {l.price_type === 'offer' ? (l.price === null ? 'Tell us what you would pay. ' : 'Asking price — offers considered. ') : l.price_type === 'fixed' ? 'Fixed price. ' : ''}
              Prices exclude VAT, delivery and installation unless stated.
            </span>
            <div className="grid2 small" style={{ gap: 10 }}>
              <div><span className="eyebrow">Availability</span><div style={{ fontWeight: 600 }}>{l.status === 'sold' ? 'Sold' : `${l.stock} available`}</div></div>
              {l.lead_time && <div><span className="eyebrow">Lead time</span><div style={{ fontWeight: 600 }}>{l.lead_time}</div></div>}
            </div>
            {l.status === 'sold' ? (
              <p className="small">This item has sold. <Link href="/direct-sale">See what&apos;s available</Link> or ask us to build one for you.</p>
            ) : (
              <EnquiryForm listingId={l.id} priceType={l.price_type} askingPrice={l.price}
                defaults={{ name: profile?.company_name || profile?.full_name || '', phone: profile?.phone ?? '', email: profile?.email ?? user?.email ?? '' }}
                userId={user?.id ?? null} />
            )}
          </div>
          <p className="small muted">Listing {listingPrice(l)} · Ref DS-{l.ref_no}. Delivery and crane offloading can be quoted to your site.</p>
        </aside>
      </div>
    </div>
  );
}
