import { requireArea } from '@/lib/require-area';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { HelpPayment, HelpRequest, HelpService, QuoteLine } from '@/lib/help';
import JobAdmin from './JobAdmin';

export default async function AdminHelpJob({ params }: { params: Promise<{ id: string }> }) {
  await requireArea('catalogue');
  const { id } = await params;
  const supabase = await createClient();
  const { data: req } = await supabase.from('auction_help_requests').select('*').eq('id', id).maybeSingle();
  if (!req) notFound();
  const r = req as HelpRequest;
  const [{ data: lines }, { data: payments }, { data: services }, { data: notes }, { data: staff }, { data: customer }, { data: settings }, { data: lots }, { data: listings }] = await Promise.all([
    supabase.from('auction_help_quote_lines').select('*').eq('request_id', id).order('sort'),
    supabase.from('auction_help_payments').select('*').eq('request_id', id).order('created_at'),
    supabase.from('auction_help_services').select('*').order('sort'),
    supabase.from('auction_help_notes').select('*').eq('request_id', id).order('created_at', { ascending: false }),
    supabase.from('auction_profiles').select('id, full_name').eq('is_admin', true),
    supabase.from('auction_profiles').select('id, full_name, phone, email, business_name, seller_status').eq('id', r.user_id).maybeSingle(),
    supabase.from('auction_help_settings').select('vat_pct, deposit_pct, free_km').eq('id', 1).single(),
    supabase.from('auction_lots').select('id, title, lot_no, help_request_id, seller_id').or(`help_request_id.eq.${id},seller_id.eq.${r.user_id}`).limit(200),
    supabase.from('auction_listings').select('id, title, slug, help_request_id, owner_id').or(`help_request_id.eq.${id},owner_id.eq.${r.user_id}`).limit(200),
  ]);
  return (
    <>
      <Link href="/admin/help" className="small">← Listing Help jobs</Link>
      <JobAdmin
        request={r} lines={(lines ?? []) as QuoteLine[]} payments={(payments ?? []) as HelpPayment[]} services={(services ?? []) as HelpService[]}
        notes={notes ?? []} staff={staff ?? []} customer={customer} vatPct={settings?.vat_pct ?? 16}
        lots={lots ?? []} listings={listings ?? []}
      />
    </>
  );
}
