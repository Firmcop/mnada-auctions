import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import { kes } from '@/lib/format';
import { STORAGE_STATUS, itemVolume, usd, type StorageBooking, type StorageCharge } from '@/lib/storage';
import StorageActions from './StorageActions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Storage booking' };

export default async function StorageBookingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, user } = await getSession();
  if (!user) redirect(`/login?next=/account/storage/${id}`);
  const { data } = await supabase.from('auction_storage_bookings').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  const b = data as StorageBooking;
  const [{ data: ch }, { data: st }] = await Promise.all([
    supabase.from('auction_storage_charges').select('*').eq('booking_id', id).neq('status', 'cancelled').order('created_at', { ascending: false }),
    supabase.from('auction_storage_settings').select('usd_to_kes, vat').eq('id', 1).single(),
  ]);
  const charges = (ch ?? []) as StorageCharge[];
  const [label, cls] = STORAGE_STATUS[b.status];
  return (
    <div className="wrap section stack" style={{ maxWidth: 900, gap: 18 }}>
      <Link href="/account/storage" className="small">← All storage</Link>
      {sp.new && <div className="alert alert-ok">Thanks — we&apos;ve received your storage request and will send a quote, usually within one working day.</div>}
      <div className="row between"><h1 style={{ fontSize: 30 }}>Storage · {b.reference}</h1><span className={`pill ${cls}`} style={{ fontSize: 14, padding: '8px 12px' }}>{label}</span></div>
      <section className="panel stack" style={{ gap: 6 }}>
        <h3>Items · {Number(b.volume_m3)} m³</h3>
        {b.items.map((it, i) => (
          <div key={i} className="row between small" style={{ padding: '4px 0', borderBottom: '1px solid #F0F2F4' }}>
            <span>{it.qty} × {it.label}</span><span className="muted">{it.l} × {it.w} × {it.h} m</span><b>{Math.round(itemVolume(it) * 100) / 100} m³</b>
          </div>
        ))}
        {b.notes && <p className="small" style={{ margin: 0, color: 'var(--body)' }}>{b.notes}</p>}
        <span className="small muted">{b.viewing_allowed ? 'Buyers may view these items at the yard by appointment.' : 'Viewing by buyers is switched off.'}{b.bay ? ` · Bay ${b.bay}` : ''}{b.start_date ? ` · In storage since ${new Date(b.start_date).toLocaleDateString('en-GB')}` : ''}{b.end_date ? ` · ended ${new Date(b.end_date).toLocaleDateString('en-GB')}` : ''}</span>
      </section>
      {b.monthly_usd != null && (
        <section className="panel stack" style={{ gap: 6 }}>
          <h3>Price</h3>
          <div className="row between"><span>Monthly storage</span><b>USD {usd(b.monthly_usd)}{st?.usd_to_kes ? <span className="small muted"> ≈ KES {kes(Number(b.monthly_usd) * Number(st.usd_to_kes))}</span> : null}</b></div>
          {Number(b.handling_usd) > 0 && <div className="row between"><span>Handling in &amp; out (once)</span><b>USD {usd(b.handling_usd)}</b></div>}
          <span className="small muted">Billed in KES at the exchange rate on each billing date{st?.vat ? ', plus 16% VAT' : ''}. Each month is billed at the start of the month.</span>
          {b.admin_note && <p className="small" style={{ margin: 0 }}><b>Note from Mnada:</b> {b.admin_note}</p>}
        </section>
      )}
      {b.status === 'declined' && b.admin_note && <div className="alert alert-err">{b.admin_note}</div>}
      <StorageActions booking={b} />
      {charges.length > 0 && (
        <section className="panel stack" style={{ gap: 8 }}>
          <h3>Bills</h3>
          {charges.map((c) => (
            <div key={c.id} className="stack" style={{ gap: 2, padding: '6px 0', borderBottom: '1px solid #F0F2F4' }}>
              <div className="row between"><b>{c.description}</b><span className={`pill ${c.status === 'paid' ? 'pill-green' : 'pill-warn'}`}>{c.status}</span></div>
              <span className="small">USD {usd(c.amount_usd)} × {Number(c.usd_to_kes)} = KES {kes(c.amount_kes)}{Number(c.vat_kes) ? ` + VAT ${kes(c.vat_kes)}` : ''} = <b>KES {kes(c.total_kes)}</b></span>
              {c.status === 'pending' && <span className="small">M-Pesa: Pay Bill › Business no. <b>[PAYBILL]</b> › Account no. <b>{c.reference}</b></span>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
