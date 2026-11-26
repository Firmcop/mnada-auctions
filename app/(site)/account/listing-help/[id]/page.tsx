import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import { kes, photoUrl } from '@/lib/format';
import { STATUS_LABEL, STEPS, type HelpPayment, type HelpRequest, type HelpService, type QuoteLine } from '@/lib/help';
import QuoteActions from './QuoteActions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Listing Help request' };

export default async function HelpRequestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, user } = await getSession();
  if (!user) redirect(`/login?next=/account/listing-help/${id}`);
  const { data: req } = await supabase.from('auction_help_requests').select('*').eq('id', id).maybeSingle();
  if (!req) notFound();
  const r = req as HelpRequest;
  const [{ data: lines }, { data: payments }, { data: services }, { data: lots }, { data: listings }, { data: settings }] = await Promise.all([
    supabase.from('auction_help_quote_lines').select('*').eq('request_id', id).order('sort'),
    supabase.from('auction_help_payments').select('*').eq('request_id', id).order('created_at'),
    supabase.from('auction_help_services').select('code, name'),
    supabase.from('auction_lots').select('id, title, photos').eq('help_request_id', id),
    supabase.from('auction_listings').select('id, slug, title, photos, status').eq('help_request_id', id),
    supabase.from('auction_help_settings').select('vat_pct, deposit_pct').eq('id', 1).single(),
  ]);
  const ql = (lines ?? []) as QuoteLine[];
  const pays = (payments ?? []) as HelpPayment[];
  const names = Object.fromEntries(((services ?? []) as Pick<HelpService, 'code' | 'name'>[]).map((s) => [s.code, s.name]));
  const [label, cls] = STATUS_LABEL[r.status];
  const stepIdx = STEPS.indexOf(r.status);
  const done = (r.checklist ?? []).filter((c) => c.done).length;
  const vatPct = settings?.vat_pct ?? 16;
  const upfrontOnly = ql.filter((l) => !l.from_proceeds_ok).reduce((s, l) => s + l.line_total_kes * (l.vat ? 1 + vatPct / 100 : 1), 0);

  return (
    <div className="wrap section stack" style={{ maxWidth: 900, gap: 18 }}>
      <Link href="/account/listing-help" className="small">← All Listing Help requests</Link>
      {sp.new && <div className="alert alert-ok">Thanks — we&apos;ve received your request. We&apos;ll send a firm quote, usually within one working day. You&apos;ll get an alert when it&apos;s ready.</div>}
      <div className="row between">
        <h1 style={{ fontSize: 30 }}>Listing Help · {r.reference}</h1>
        <span className={`pill ${cls}`} style={{ fontSize: 14, padding: '8px 12px' }}>{label}</span>
      </div>
      {stepIdx >= 0 && (
        <ol className="row small" style={{ listStyle: 'none', padding: 0, margin: 0, gap: 6 }} aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s} style={{ flex: '1 1 110px', padding: '8px 10px', borderRadius: 8, background: i <= stepIdx ? 'var(--green-bg)' : 'var(--surface)', color: i <= stepIdx ? 'var(--green)' : 'var(--body)', fontWeight: i === stepIdx ? 700 : 500 }}>
              {STATUS_LABEL[s][0]}
            </li>
          ))}
        </ol>
      )}
      <section className="panel stack" style={{ gap: 6 }}>
        <h3>Your request</h3>
        <span className="small"><b>Services:</b> {r.services.map((c) => names[c] ?? c).join(', ')}</span>
        <span className="small"><b>Where:</b> {r.location}{r.distance_km != null ? ` (~${r.distance_km} km from Nairobi)` : ''} · <b>Lots:</b> about {r.est_lots}{r.preferred_date ? <> · <b>Preferred date:</b> {new Date(r.preferred_date).toLocaleDateString('en-GB')}</> : null}</span>
        <p className="small" style={{ whiteSpace: 'pre-line', color: 'var(--body)', margin: 0 }}>{r.items_description}</p>
        {r.status === 'requested' && r.estimate_kes != null && <span className="small muted">Estimate when you asked: KES {kes(r.estimate_kes)}{r.estimate_complete ? '' : ' + items priced on review'}</span>}
      </section>
      {r.scheduled_for && (
        <div className="alert alert-info"><b>Visit:</b> {new Date(r.scheduled_for).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
      )}
      {['in_progress', 'done'].includes(r.status) && r.checklist?.length > 0 && (
        <section className="panel stack" style={{ gap: 6 }}>
          <h3>Progress · {done} of {r.checklist.length}</h3>
          {r.checklist.map((c, i) => <span key={i} className="small">{c.done ? '✓' : '○'} {c.label}</span>)}
          {r.progress_note && <p className="small" style={{ color: 'var(--body)', margin: 0 }}>{r.progress_note}</p>}
        </section>
      )}
      {r.status !== 'requested' && ql.length > 0 && (
        <section className="panel stack" style={{ gap: 6 }}>
          <h3>Quote</h3>
          {ql.map((l) => (
            <div key={l.id} className="row between small" style={{ padding: '4px 0', borderBottom: '1px solid #F0F2F4' }}>
              <span>{l.description}{Number(l.qty) !== 1 ? ` × ${Number(l.qty)}` : ''}</span><span>KES {kes(l.line_total_kes)}</span>
            </div>
          ))}
          <div className="row between small"><span>VAT</span><span>KES {kes(r.quote_vat_kes)}</span></div>
          <div className="row between"><b>Total</b><b>KES {kes(r.quote_total_kes)}</b></div>
          {r.quote_note && <p className="small" style={{ whiteSpace: 'pre-line', margin: 0 }}><b>Note from Mnada:</b> {r.quote_note}</p>}
          {r.from_proceeds_kes > 0 && <span className="small" style={{ color: 'var(--green)', fontWeight: 600 }}>KES {kes(r.from_proceeds_kes)} will be deducted from your sale proceeds.</span>}
        </section>
      )}
      {r.status === 'declined' && r.quote_note && <div className="alert alert-err">{r.quote_note}</div>}
      <QuoteActions request={r} depositPct={settings?.deposit_pct ?? 50} upfrontOnly={Math.ceil(upfrontOnly)} />
      {pays.length > 0 && (
        <section className="panel stack" style={{ gap: 8 }}>
          <h3>Payments</h3>
          {pays.map((p) => (
            <div key={p.id} className="stack" style={{ gap: 2, padding: '6px 0', borderBottom: '1px solid #F0F2F4' }}>
              <div className="row between"><b>{p.kind === 'deposit' ? 'Deposit' : 'Balance'} · KES {kes(p.amount_kes)}</b><span className={`pill ${p.status === 'paid' ? 'pill-green' : p.status === 'pending' ? 'pill-warn' : 'pill-grey'}`}>{p.status}</span></div>
              {p.status === 'pending' && <span className="small">M-Pesa: Lipa na M-Pesa › Pay Bill › Business no. <b>[PAYBILL]</b> › Account no. <b>{p.reference}</b></span>}
            </div>
          ))}
        </section>
      )}
      {((lots ?? []).length > 0 || (listings ?? []).length > 0) && (
        <section className="panel stack" style={{ gap: 8 }}>
          <h3>Your listed items</h3>
          {(lots ?? []).map((l) => <Link key={l.id} href={`/lots/${l.id}`} className="row small" style={{ gap: 10 }}>{l.photos?.[0] && <img src={photoUrl(l.photos[0])} alt="" width={56} height={42} style={{ objectFit: 'cover', borderRadius: 6 }} />}{l.title} <span className="muted">· auction lot</span></Link>)}
          {(listings ?? []).map((l) => <Link key={l.id} href={`/direct-sale/${l.slug}`} className="row small" style={{ gap: 10 }}>{l.photos?.[0] && <img src={photoUrl(l.photos[0])} alt="" width={56} height={42} style={{ objectFit: 'cover', borderRadius: 6 }} />}{l.title} <span className="muted">· direct sale ({l.status})</span></Link>)}
        </section>
      )}
    </div>
  );
}
