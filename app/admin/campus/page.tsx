import { requireArea } from '@/lib/require-area';
import { createClient } from '@/lib/supabase/server';
import { kes } from '@/lib/format';
import { canArea } from '@/lib/staff';
import type { CampusSettings, Challenge, Earning, Gig, Lead, Member, Video } from '@/lib/campus';
import CampusAdmin, { type Person } from './CampusAdmin';

export const dynamic = 'force-dynamic';

export default async function AdminCampus() {
  const role = await requireArea('people');
  const supabase = await createClient();
  const [{ data: st }, { data: mem }, { data: leads }, { data: gigs }, { data: vids }, { data: earn }, { data: ch }, { data: refs }, { data: pos }, { data: sellers }, { data: firms }, { data: jobs }] = await Promise.all([
    supabase.from('auction_campus_settings').select('*').eq('id', 1).single(),
    supabase.from('auction_campus_members').select('*').order('created_at', { ascending: false }),
    supabase.from('auction_campus_leads').select('*').order('created_at', { ascending: false }).limit(500),
    supabase.from('auction_campus_gigs').select('*').neq('status', 'cancelled').order('created_at', { ascending: false }).limit(300),
    supabase.from('auction_campus_videos').select('*').order('created_at', { ascending: false }).limit(300),
    supabase.from('auction_campus_earnings').select('*').order('created_at', { ascending: false }).limit(2000),
    supabase.from('auction_campus_challenges').select('*').order('starts_at', { ascending: false }),
    supabase.from('auction_campus_referrals').select('*').order('created_at', { ascending: false }).limit(1000),
    supabase.from('auction_payouts').select('id, reference, campus_member_id, amount_kes, gross_kes, wht_kes, status, payment_ref, created_at, paid_at').eq('payee_kind', 'student').order('created_at', { ascending: false }).limit(300),
    supabase.from('auction_profiles').select('id, full_name, business_name, phone').eq('seller_status', 'approved').order('full_name').limit(1000),
    supabase.from('auction_auctioneers').select('id, name').order('name'),
    supabase.from('auction_help_requests').select('id, reference, location, status').in('status', ['accepted', 'scheduled', 'in_progress']).order('created_at', { ascending: false }).limit(100),
  ]);
  const members = (mem ?? []) as Member[];
  const r = (refs ?? []) as { referred_id: string; member_id: string; code: string; flag: string | null; blocked: boolean; first_bid_paid: boolean; created_at: string }[];
  const ids = Array.from(new Set([...members.map((m) => m.id), ...r.map((x) => x.referred_id)]));
  const { data: ppl } = ids.length ? await supabase.from('auction_profiles').select('id, full_name, phone, email, id_number, kra_pin, status').in('id', ids) : { data: [] };
  const people: Record<string, Person> = {};
  ((ppl ?? []) as Person[]).forEach((p) => { people[p.id] = p; });

  const files: Record<string, string> = {};
  const paths = [...members.map((m) => m.student_id_path), ...((leads ?? []) as Lead[]).flatMap((l) => l.photos)].filter(Boolean) as string[];
  if (paths.length) {
    const { data: signed } = await supabase.storage.from('auction-kyc').createSignedUrls(paths.slice(0, 400), 3600);
    (signed ?? []).forEach((x) => { if (x.path && x.signedUrl) files[x.path] = x.signedUrl; });
  }
  const e = (earn ?? []) as Earning[];
  const due = e.filter((x) => x.status === 'approved' && !x.payout_id).reduce((a, x) => a + Number(x.amount_kes), 0);
  const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0);
  const paidMonth = ((pos ?? []) as { status: string; gross_kes: number; paid_at: string | null }[]).filter((p) => p.status === 'paid' && p.paid_at && new Date(p.paid_at) >= month).reduce((a, p) => a + Number(p.gross_kes ?? 0), 0);

  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 style={{ fontSize: 28 }}>Mnada Campus</h1>
        <span className="small muted">Students earn by scouting sellers, referring bidders, field gigs, videos and condition reports. Earnings are recorded automatically from paid invoices and approved work; pay them out from here.</span>
      </div>
      <div className="kpis">
        <div className="kpi"><span className="eyebrow">Active students</span><b>{members.filter((m) => m.status === 'active').length}</b><span className="small muted">{members.filter((m) => m.status === 'pending').length} waiting for approval</span></div>
        <div className="kpi"><span className="eyebrow">Open leads</span><b>{((leads ?? []) as Lead[]).filter((l) => ['new', 'contacted', 'qualified'].includes(l.status)).length}</b><span className="small muted">{((leads ?? []) as Lead[]).filter((l) => l.status === 'won').length} won</span></div>
        <div className="kpi"><span className="eyebrow">Referred bidders</span><b>{r.filter((x) => !x.blocked).length}</b><span className="small muted">{r.filter((x) => x.blocked).length} blocked</span></div>
        <div className="kpi"><span className="eyebrow">Ready to pay students</span><b style={{ color: 'var(--accent)' }}>KES {kes(due)}</b></div>
        <div className="kpi"><span className="eyebrow">Paid this month</span><b>KES {kes(paidMonth)}</b><span className="small muted">before withholding</span></div>
      </div>
      <CampusAdmin settings={st as CampusSettings} members={members} leads={(leads ?? []) as Lead[]} gigs={(gigs ?? []) as Gig[]} videos={(vids ?? []) as Video[]}
        earnings={e} challenges={(ch ?? []) as Challenge[]} referrals={r} payouts={pos ?? []} people={people} files={files}
        sellers={sellers ?? []} firms={firms ?? []} jobs={jobs ?? []}
        canFinance={canArea(role, 'finance')} canOps={canArea(role, 'operations')} />
    </>
  );
}
