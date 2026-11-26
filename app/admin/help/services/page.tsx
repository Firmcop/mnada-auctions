import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { HelpService, HelpSettings } from '@/lib/help';
import ServicesAdmin from './ServicesAdmin';

export default async function HelpServicesPage() {
  const supabase = await createClient();
  const [{ data: services }, { data: settings }] = await Promise.all([
    supabase.from('auction_help_services').select('*').order('sort'),
    supabase.from('auction_help_settings').select('vat_pct, deposit_pct, free_km').eq('id', 1).single(),
  ]);
  return (
    <>
      <Link href="/admin/help" className="small">← Listing Help jobs</Link>
      <h1 style={{ fontSize: 28 }}>Listing Help — services &amp; prices</h1>
      <span className="small muted">These prices drive the instant estimate customers see and pre-fill each quote. Leave a price blank to show “quoted after review”. Prices exclude VAT.</span>
      <ServicesAdmin services={(services ?? []) as HelpService[]} settings={(settings ?? { vat_pct: 16, deposit_pct: 50, free_km: 30 }) as HelpSettings} />
    </>
  );
}
