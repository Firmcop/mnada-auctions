import Link from 'next/link';
import { getSession } from '@/lib/supabase/server';
import { GavelIcon } from '@/components/Icons';
import SearchBox from '@/components/SearchBox';
import MegaMenu, { type FeaturedItem } from '@/components/MegaMenu';
import { kes, listingPrice, type Listing, type Lot } from '@/lib/format';


export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, profile } = await getSession();
  const { count: unread } = user
    ? await supabase.from('auction_notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('read_at', null)
    : { count: 0 };
  const { count: firmCount } = user ? await supabase.from('auction_auctioneer_members').select('user_id', { count: 'exact', head: true }).eq('user_id', user.id) : { count: 0 };
  const isAuctioneer = (firmCount ?? 0) > 0;
  const [{ data: fLots }, { data: fListings }] = await Promise.all([
    supabase.from('auction_lots').select('id, title, category, photos, bid_count, current_bid, start_bid, auction_auctions!inner(status)')
      .eq('status', 'open').eq('auction_auctions.status', 'live').gt('closes_at', new Date().toISOString()).order('closes_at').limit(40),
    supabase.from('auction_listings').select('slug, title, category, photos, price, price_type').eq('status', 'active').order('featured', { ascending: false }).order('created_at', { ascending: false }).limit(40),
  ]);
  const featured: FeaturedItem[] = [
    ...((fListings ?? []) as Pick<Listing, 'slug' | 'title' | 'category' | 'photos' | 'price' | 'price_type'>[]).map((l) => ({
      href: `/direct-sale/${l.slug}`, title: l.title, category: l.category, photo: l.photos?.[0], price: listingPrice(l), badge: 'Direct sale',
    })),
    ...((fLots ?? []) as unknown as Lot[]).map((l) => ({
      href: `/lots/${l.id}`, title: l.title, category: l.category ?? '', photo: l.photos?.[0],
      price: `KES ${kes(l.bid_count > 0 ? l.current_bid : l.start_bid)}`, badge: l.bid_count > 0 ? 'Auction · current bid' : 'Auction · starting bid',
    })),
  ];
  return (
    <>
      <div className="topbar">
        <div className="wrap">
          <span>Industrial &amp; commercial auctions across East Africa</span>
          <span className="row" style={{ gap: 18 }}>
            <Link href="/sell">Sell with us</Link>
            <Link href="/help">Help</Link>
            <span>EN · KES</span>
          </span>
        </div>
      </div>
      <header className="header">
        <div className="wrap">
          <Link href="/" className="logo">
            <span className="logo-mark"><GavelIcon /></span>
            <span className="logo-word">mnada</span>
          </Link>
          <SearchBox />
          <nav className="nav" aria-label="Account">
            {user ? (
              <>
                {profile?.is_admin && <Link href="/admin" className="plain">Admin</Link>}
                {profile?.seller_status === 'approved' && <Link href="/seller" className="plain">Seller portal</Link>}
                {isAuctioneer && <Link href="/auctioneer" className="plain">Auctioneer portal</Link>}
                <Link href="/watchlist" className="plain">Watchlist</Link>
                <Link href="/account/alerts" className="plain" style={{ position: 'relative' }}>
                  Alerts{(unread ?? 0) > 0 && <span className="pill" style={{ background: 'var(--accent)', color: '#fff', marginLeft: 6, padding: '2px 7px' }}>{unread}</span>}
                </Link>
                <Link href="/account" className="plain">My bids</Link>
                <form action="/auth/signout" method="post">
                  <button className="btn btn-outline btn-sm" type="submit">Log out</button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login?next=/watchlist" className="plain">Watchlist</Link>
                <Link href="/login" className="plain">Log in</Link>
                <Link href="/register" className="btn btn-primary">Register to bid</Link>
              </>
            )}
          </nav>
        </div>
        <MegaMenu featured={featured} />
      </header>
      <main>{children}</main>
      <footer className="footer">
        <div className="wrap cols">
          <div className="stack" style={{ gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 22, color: '#fff' }}>mnada</span>
            <span>Online auctions for machinery, vehicles and structures. Nairobi, Kenya.</span>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <span style={{ color: '#fff', fontWeight: 600 }}>Buying</span>
            <Link href="/#how">How to bid</Link>
            <Link href="/register">Register</Link>
            <Link href="/account">My bids</Link>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <span style={{ color: '#fff', fontWeight: 600 }}>Selling</span>
            <Link href="/sell">Request a valuation</Link>
            <Link href="/listing-help">Listing Help</Link>
            <Link href="/storage">Storage &amp; viewing</Link>
            <Link href="/account/seller">Seller account</Link>
            <Link href="/account/auctioneer">For auctioneers</Link>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <span style={{ color: '#fff', fontWeight: 600 }}>Help &amp; legal</span>
            <Link href="/help">Help &amp; FAQ</Link>
            <Link href="/terms">Terms of sale</Link>
            <Link href="/privacy">Privacy policy</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
