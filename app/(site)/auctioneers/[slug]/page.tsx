import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { eat, photoUrl, type Auction } from '@/lib/format';
import { SITE_URL } from '@/lib/seo';
import type { Firm } from '@/lib/auctioneer';

export const dynamic = 'force-dynamic';

async function load(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from('auction_auctioneers').select('*').eq('slug', slug).eq('status', 'approved').maybeSingle();
  return { supabase, firm: data as Firm | null };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { firm } = await load(slug);
  if (!firm) return { title: 'Auctioneer not found' };
  return { title: `${firm.name} — auctions on Mnada`, description: (firm.about ?? `Online auctions by ${firm.name}, licensed auctioneers, on Mnada.`).slice(0, 160), alternates: { canonical: `${SITE_URL}/auctioneers/${firm.slug}` } };
}

export default async function FirmPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, firm } = await load(slug);
  if (!firm) notFound();
  const { data } = await supabase.from('auction_auctions').select('*').eq('auctioneer_id', firm.id).neq('status', 'draft').order('first_close_at', { ascending: false }).limit(60);
  const auctions = (data ?? []) as Auction[];
  const live = auctions.filter((a) => a.status === 'live');
  const past = auctions.filter((a) => a.status === 'closed');
  return (
    <div className="wrap section stack" style={{ gap: 24 }}>
      <section className="row" style={{ gap: 20, alignItems: 'center' }}>
        {firm.logo && <img src={photoUrl(firm.logo)} alt={`${firm.name} logo`} width={96} height={96} style={{ borderRadius: 14, objectFit: 'cover', border: '1px solid var(--line)' }} />}
        <div className="stack" style={{ gap: 4, flex: '1 1 300px' }}>
          <span className="eyebrow">Licensed auctioneer · {firm.licence_no}</span>
          <h1>{firm.name}</h1>
          <span className="small muted">{[firm.location, firm.phone, firm.email].filter(Boolean).join(' · ')}</span>
        </div>
      </section>
      {firm.about && <p style={{ color: 'var(--body)', maxWidth: 820, whiteSpace: 'pre-line' }}>{firm.about}</p>}
      <section className="stack" style={{ gap: 12 }}>
        <h2>Open auctions</h2>
        {live.length === 0 && <p className="small muted">No open auctions right now.</p>}
        {live.map((a) => (
          <Link key={a.id} href={`/auctions/${a.slug}`} className="card list-row" style={{ padding: 16, textDecoration: 'none', color: 'inherit' }}>
            <span className="pill pill-green">Open</span>
            <b style={{ flex: '1 1 300px' }}>{a.title}</b>
            <span className="small muted">{a.location ?? ''} · first lot closes {a.first_close_at ? eat(a.first_close_at) : '—'}</span>
          </Link>
        ))}
      </section>
      {past.length > 0 && (
        <section className="stack" style={{ gap: 8 }}>
          <h2 style={{ fontSize: 22 }}>Past auctions</h2>
          {past.map((a) => <Link key={a.id} href={`/auctions/${a.slug}`} className="small">{a.title}</Link>)}
        </section>
      )}
    </div>
  );
}
