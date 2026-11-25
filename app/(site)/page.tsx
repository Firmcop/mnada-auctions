import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import LotCard from '@/components/LotCard';
import Countdown from '@/components/Countdown';
import { CATEGORIES, eat, type Auction, type Lot } from '@/lib/format';
import { CheckIcon } from '@/components/Icons';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createClient();
  const [{ data: auctions }, { data: lots }] = await Promise.all([
    supabase.from('auction_auctions').select('*').eq('status', 'live').order('first_close_at'),
    supabase.from('auction_lots').select('*, auction_auctions!inner(status)').eq('status', 'open')
      .eq('auction_auctions.status', 'live').gt('closes_at', new Date().toISOString()).order('closes_at').limit(8),
  ]);
  const live = (auctions ?? []) as Auction[];
  const featured = live[0];
  const { data: counts } = await supabase.from('auction_lots').select('auction_id').in('auction_id', live.map((a) => a.id));
  const lotCount = (id: string) => (counts ?? []).filter((c) => c.auction_id === id).length;

  return (
    <>
      <section style={{ background: 'var(--surface)' }}>
        <div className="wrap row" style={{ padding: '52px 24px', gap: 40, alignItems: 'center' }}>
          <div className="stack" style={{ flex: '1 1 460px', gap: 18 }}>
            <span className="eyebrow" style={{ color: 'var(--accent-text)' }}>Online auctions · Verified sellers</span>
            <h1 style={{ fontSize: 'clamp(34px, 5vw, 56px)' }}>Bid on machinery, vehicles and ready-built structures.</h1>
            <p style={{ fontSize: 18, color: 'var(--body)', maxWidth: 560 }}>
              Inspect lots in person, bid online from anywhere, pay by M-Pesa or bank transfer and collect from the seller&apos;s site — or let us arrange delivery.
            </p>
            <div className="row">
              <a href="#auctions" className="btn btn-primary">Browse live auctions</a>
              <Link href="/sell" className="btn btn-outline">Sell with us</Link>
            </div>
            <div className="row small" style={{ gap: '10px 24px', color: '#2D3540' }}>
              <span className="row" style={{ gap: 6 }}><CheckIcon color="#1F6B45" />Inspection days before every close</span>
              <span className="row" style={{ gap: 6 }}><CheckIcon color="#1F6B45" />M-Pesa &amp; bank transfer</span>
              <span className="row" style={{ gap: 6 }}><CheckIcon color="#1F6B45" />Transport &amp; loading arranged</span>
            </div>
          </div>
          {featured && (
            <Link href={`/auctions/${featured.slug}`} className="card" style={{ flex: '1 1 420px', overflow: 'hidden', textDecoration: 'none', color: 'inherit', boxShadow: '0 8px 24px rgba(15,42,61,.08)' }}>
              <div className="ph" style={{ height: 220, justifyContent: 'space-between' }}>
                <span className="pill" style={{ background: 'var(--navy)', color: '#fff' }}>FEATURED AUCTION</span>
              </div>
              <div className="stack" style={{ padding: 22, gap: 10 }}>
                <h3 style={{ fontSize: 22 }}>{featured.title}</h3>
                <span className="small muted">{featured.location} · {lotCount(featured.id)} lots{featured.first_close_at ? ` · first lot closes ${eat(featured.first_close_at)}` : ''}</span>
                {featured.first_close_at && <span>First lot closes in <Countdown closesAt={featured.first_close_at} icon={false} /></span>}
              </div>
            </Link>
          )}
        </div>
      </section>

      <section className="wrap section">
        <div className="row between" style={{ marginBottom: 22 }}>
          <h2>Closing soon</h2>
        </div>
        {lots && lots.length > 0 ? (
          <div className="lot-grid">{(lots as Lot[]).map((l) => <LotCard key={l.id} lot={l} />)}</div>
        ) : (
          <p className="muted">No lots are open right now. New auctions are added every week.</p>
        )}
      </section>

      <section id="auctions" className="wrap section" style={{ paddingTop: 8 }}>
        <h2 style={{ marginBottom: 16 }}>Live auctions</h2>
        <div style={{ borderTop: '1px solid var(--line)' }}>
          {live.map((a) => (
            <Link key={a.id} href={`/auctions/${a.slug}`} className="list-row" style={{ textDecoration: 'none', color: 'inherit' }}>
              <span className="stack" style={{ gap: 4, flex: '1 1 320px' }}>
                <span style={{ fontWeight: 600, fontSize: 17 }}>{a.title}</span>
                <span className="small muted">{a.location} · {lotCount(a.id)} lots{a.inspection_text ? ` · ${a.inspection_text}` : ''}</span>
              </span>
              {a.first_close_at && <span className="small" style={{ fontWeight: 600 }}>Closes from {eat(a.first_close_at)}</span>}
              <span className="pill pill-green">Open for bidding</span>
            </Link>
          ))}
          {live.length === 0 && <p className="muted" style={{ padding: '16px 0' }}>No live auctions right now.</p>}
        </div>
      </section>

      <section className="wrap section" style={{ paddingTop: 8 }}>
        <h2 style={{ marginBottom: 18 }}>Browse by category</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          {CATEGORIES.filter((c) => c !== 'Other').map((c) => (
            <Link key={c} href={`/search?cat=${encodeURIComponent(c)}`} style={{ background: 'var(--surface)', borderRadius: 12, padding: 20, textDecoration: 'none', fontWeight: 600, minHeight: 84 }}>{c}</Link>
          ))}
        </div>
      </section>

      <section id="how" className="wrap section">
        <h2 style={{ marginBottom: 24 }}>How buying works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 26 }}>
          {[
            ['01', 'Register & verify', 'Sign up with your phone number and ID or company KRA PIN. Once approved you can bid straight away.'],
            ['02', 'Inspect', 'Every auction has a viewing day at the seller’s site. Photos and condition notes are on each lot.'],
            ['03', 'Bid online', 'Bid manually or set a maximum and let auto-bid raise for you. A bid in the last 2 minutes extends the lot by 2 minutes.'],
            ['04', 'Pay & collect', 'Pay the invoice by M-Pesa or bank transfer, then collect on the set dates or book transport.'],
          ].map(([n, t, d]) => (
            <div key={n} className="stack" style={{ gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 38, color: 'var(--accent-text)' }}>{n}</span>
              <span style={{ fontWeight: 700, fontSize: 18 }}>{t}</span>
              <span style={{ color: 'var(--body)' }}>{d}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: 'var(--navy)', color: '#fff' }}>
        <div className="wrap row between" style={{ padding: '48px 24px', gap: 24 }}>
          <div className="stack" style={{ flex: '1 1 480px' }}>
            <h2 style={{ color: '#fff' }}>Selling surplus equipment — or a whole site?</h2>
            <p style={{ color: '#C9D5DF', fontSize: 17 }}>We value, photograph, list and market your assets, run the viewing day and handle buyer payments.</p>
          </div>
          <Link href="/sell" className="btn btn-primary">Request a valuation</Link>
        </div>
      </section>
    </>
  );
}
