import Link from 'next/link';
import { getSession } from '@/lib/supabase/server';
import { GavelIcon, SearchIcon } from '@/components/Icons';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getSession();
  return (
    <>
      <div className="topbar">
        <div className="wrap">
          <span>Industrial &amp; commercial auctions across East Africa</span>
          <span className="row" style={{ gap: 18 }}>
            <Link href="/sell">Sell with us</Link>
            <Link href="/#how">How it works</Link>
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
          <form className="search" role="search" action="/search">
            <label htmlFor="q" className="sr">Search lots</label>
            <input id="q" name="q" type="search" placeholder="Search excavators, containers, welders, trucks…" />
            <button type="submit" aria-label="Search"><SearchIcon /></button>
          </form>
          <nav className="nav" aria-label="Account">
            {user ? (
              <>
                {profile?.is_admin && <Link href="/admin" className="plain">Admin</Link>}
                <Link href="/account" className="plain">My bids</Link>
                <form action="/auth/signout" method="post">
                  <button className="btn btn-outline btn-sm" type="submit">Log out</button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="plain">Log in</Link>
                <Link href="/register" className="btn btn-primary">Register to bid</Link>
              </>
            )}
          </nav>
        </div>
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
          </div>
        </div>
      </footer>
    </>
  );
}
