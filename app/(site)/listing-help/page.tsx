import { getSession } from '@/lib/supabase/server';
import { kes } from '@/lib/format';
import { UNIT_LABEL, type HelpService, type HelpSettings } from '@/lib/help';
import HelpRequestForm from './HelpRequestForm';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Listing Help — we survey, photograph and list your items',
  description: 'Mnada Listing Help: site survey, sorting into lots, professional photos and video, and listing on the auction platform or direct sale. Get an instant estimate.',
};

export default async function ListingHelpPage() {
  const { supabase, user, profile } = await getSession();
  const [{ data: services }, { data: settings }] = await Promise.all([
    supabase.from('auction_help_services').select('*').eq('offered', true).order('sort'),
    supabase.from('auction_help_settings').select('vat_pct, deposit_pct, free_km').eq('id', 1).single(),
  ]);
  const list = (services ?? []) as HelpService[];
  const st = (settings ?? { vat_pct: 16, deposit_pct: 50, free_km: 30 }) as HelpSettings;

  return (
    <>
      <section style={{ background: 'var(--navy)', color: '#fff' }}>
        <div className="wrap stack" style={{ padding: '48px 24px', gap: 14 }}>
          <span className="eyebrow" style={{ color: '#F5A27A' }}>Listing Help</span>
          <h1 style={{ color: '#fff', maxWidth: 820, fontSize: 'clamp(30px, 4.4vw, 48px)' }}>We survey, sort, photograph and list your items for you.</h1>
          <p style={{ color: '#C9D5DF', fontSize: 18, maxWidth: 680 }}>Pick just the help you need — from a single listing to the full package. You get an instant estimate, then a firm quote before any work starts.</p>
        </div>
      </section>
      <div className="wrap section stack" style={{ gap: 40 }}>
        <section className="stack" style={{ gap: 16 }}>
          <h2>Services &amp; prices</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {list.filter((s) => s.code !== 'travel').map((s) => (
              <div key={s.code} className="card stack" style={{ padding: 20, gap: 6, borderColor: s.includes.length ? 'var(--accent)' : undefined }}>
                {s.includes.length > 0 && <span className="eyebrow">Best value</span>}
                <b style={{ fontSize: 18 }}>{s.name}</b>
                <span className="small" style={{ color: 'var(--body)' }}>{s.description}</span>
                <span style={{ fontWeight: 700, marginTop: 'auto' }}>{s.price_kes != null ? <>KES {kes(s.price_kes)} <span className="small muted">{UNIT_LABEL[s.unit]}</span></> : <span className="small muted">Quoted after review</span>}</span>
              </div>
            ))}
          </div>
          <p className="small muted">Prices exclude VAT ({st.vat_pct}%). Visits within {st.free_km} km of Nairobi have no travel charge{(() => { const t = list.find((s) => s.code === 'travel'); return t?.price_kes != null ? `; beyond that KES ${kes(t.price_kes)} per km` : ''; })()}. Pay {st.deposit_pct}% upfront and the rest on completion — or have most of it deducted from your sale proceeds (the survey and travel are always paid upfront).</p>
        </section>
        <section id="request" className="row" style={{ gap: 36, alignItems: 'flex-start' }}>
          <div className="stack" style={{ flex: '1 1 280px', gap: 12 }}>
            <h2>Request Listing Help</h2>
            <ol className="small" style={{ margin: 0, paddingLeft: 20, color: 'var(--body)', lineHeight: 1.9 }}>
              <li>Choose services and tell us about the items.</li>
              <li>We confirm a firm quote, usually within one working day.</li>
              <li>Accept the quote and pay the deposit.</li>
              <li>We visit, do the work and list your items. Follow progress in your account.</li>
            </ol>
          </div>
          <div style={{ flex: '2 1 520px' }}>
            {user ? (
              <HelpRequestForm services={list} settings={st} userId={user.id} defaultName={profile?.full_name ?? ''} defaultPhone={profile?.phone ?? ''} />
            ) : (
              <div className="card panel stack" style={{ gap: 12 }}>
                <b style={{ fontSize: 18 }}>Log in or register to request Listing Help</b>
                <span className="small" style={{ color: 'var(--body)' }}>We need an account so you can review the quote and follow the work.</span>
                <div className="row"><a className="btn btn-primary" href="/login?next=/listing-help%23request">Log in</a><a className="btn btn-outline" href="/register?next=/listing-help%23request">Register</a></div>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
