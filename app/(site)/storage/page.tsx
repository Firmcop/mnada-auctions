import { getSession } from '@/lib/supabase/server';
import { usd, type StorageSettings, type StorageSize } from '@/lib/storage';
import StorageCalculator from './StorageCalculator';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Storage at the Mnada yard — let buyers view your items',
  description: 'Store machinery, vehicles, containers and equipment at the Mnada yard while they are on sale. Priced per m³ per month — calculate your price instantly.',
};

export default async function StoragePage() {
  const { supabase, user, profile } = await getSession();
  const [{ data: settings }, { data: sizes }] = await Promise.all([
    supabase.from('auction_storage_settings').select('enabled, rate_per_m3_usd, min_monthly_usd, handling_fee_usd, usd_to_kes, vat').eq('id', 1).single(),
    supabase.from('auction_storage_sizes').select('*').eq('active', true).order('sort'),
  ]);
  const s = settings as StorageSettings;
  return (
    <>
      <section style={{ background: 'var(--navy)', color: '#fff' }}>
        <div className="wrap stack" style={{ padding: '48px 24px', gap: 14 }}>
          <span className="eyebrow" style={{ color: '#F5A27A' }}>Storage &amp; viewing</span>
          <h1 style={{ color: '#fff', maxWidth: 820, fontSize: 'clamp(30px, 4.4vw, 48px)' }}>Keep your items at our yard — buyers view them here.</h1>
          <p style={{ color: '#C9D5DF', fontSize: 18, maxWidth: 680 }}>Secure storage for machinery, vehicles, containers and equipment while they&apos;re on sale. Buyers inspect by appointment, and collection is handled on site.</p>
          <span style={{ color: '#fff', fontWeight: 700 }}>From USD {usd(s?.min_monthly_usd ?? 60)} per month{s?.rate_per_m3_usd != null ? ` · USD ${usd(s.rate_per_m3_usd)} per m³` : ''}{s?.vat ? ' + VAT' : ''}</span>
        </div>
      </section>
      <div className="wrap section stack" style={{ gap: 32 }}>
        <section className="row" style={{ gap: 36, alignItems: 'flex-start' }}>
          <div className="stack" style={{ flex: '1 1 280px', gap: 12 }}>
            <h2>How it works</h2>
            <ol className="small" style={{ margin: 0, paddingLeft: 20, color: 'var(--body)', lineHeight: 1.9 }}>
              <li>Add your items below — pick a size or enter length × width × height.</li>
              <li>See the space you need in m³ and the monthly price.</li>
              <li>Send the request; we confirm a quote and a delivery date.</li>
              <li>Bring the items in (or ask for <a href="/listing-help">Listing Help</a> to collect, photograph and list them).</li>
              <li>You&apos;re billed monthly by M-Pesa or bank until the items are sold and collected.</li>
            </ol>
            <p className="small muted">Prices in USD, billed in KES at the rate on the billing date{s?.vat ? ', plus 16% VAT' : ''}.{s?.handling_fee_usd ? ` One-off handling in and out: USD ${usd(s.handling_fee_usd)}.` : ''}</p>
          </div>
          <div style={{ flex: '2 1 560px' }}>
            <StorageCalculator settings={s} sizes={(sizes ?? []) as StorageSize[]} userId={user?.id ?? null} defaultPhone={profile?.phone ?? ''} />
          </div>
        </section>
      </div>
    </>
  );
}
