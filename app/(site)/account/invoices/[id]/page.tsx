import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import { eat, kes } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await getSession();
  if (!user) redirect('/login?next=/account');
  const { data: inv } = await supabase.from('auction_invoices').select('*, auction_lots(title, lot_no, vat_on_hammer, auction_auctions(title, premium_pct, collection_text, location))').eq('id', id).maybeSingle();
  if (!inv) notFound();
  const lot = inv.auction_lots;
  const auction = lot?.auction_auctions;
  const owed = Number(inv.total) - Number(inv.paid);

  return (
    <div className="wrap section" style={{ maxWidth: 860 }}>
      <Link href="/account" className="small">← Back to My bids</Link>
      <div className="panel card stack" style={{ gap: 18, marginTop: 14 }}>
        <div className="row between">
          <div className="stack" style={{ gap: 4 }}>
            <span className="eyebrow">Invoice INV-{inv.invoice_no} · issued {eat(inv.created_at, false)}</span>
            <h1 style={{ fontSize: 28 }}>Lot {lot?.lot_no}: {lot?.title}</h1>
            <span className="muted small">{auction?.title}</span>
          </div>
          <span className={`pill ${inv.status === 'cancelled' ? 'pill-grey' : owed <= 0 ? 'pill-green' : 'pill-warn'}`} style={{ fontSize: 14, padding: '8px 12px' }}>
            {inv.status === 'cancelled' ? 'Cancelled' : owed <= 0 ? 'Paid' : `KES ${kes(owed)} due ${eat(inv.due_at, false)}`}
          </span>
        </div>
        <div className="stack small" style={{ gap: 8, maxWidth: 460 }}>
          <div className="row between"><span className="muted">Billed to</span><span>{profile?.company_name || profile?.full_name}{profile?.kra_pin ? ` · PIN ${profile.kra_pin}` : ''}</span></div>
          <div className="row between"><span className="muted">Hammer price</span><span>KES {kes(inv.hammer)}</span></div>
          <div className="row between"><span className="muted">Buyer&apos;s premium ({Number(inv.hammer) ? Math.round((Number(inv.premium) / Number(inv.hammer)) * 1000) / 10 : auction?.premium_pct}%)</span><span>KES {kes(inv.premium)}</span></div>
          {Number(inv.extras) > 0 && <div className="row between"><span className="muted">Additional costs (loading, delivery, etc.)</span><span>KES {kes(inv.extras)}</span></div>}
          <div className="row between"><span className="muted">VAT (16%){lot?.vat_on_hammer ? ' on fees and hammer' : ' on fees'}</span><span>KES {kes(inv.vat)}</span></div>
          <div className="row between" style={{ fontWeight: 700, fontSize: 16, borderTop: '1px dashed var(--field)', paddingTop: 8 }}><span>Total</span><span>KES {kes(inv.total)}</span></div>
          {Number(inv.paid) > 0 && <div className="row between"><span className="muted">Received</span><span>KES {kes(inv.paid)}</span></div>}
        </div>
        {inv.status === 'cancelled' && <div className="alert alert-err">This invoice was cancelled{inv.cancelled_reason ? `: ${inv.cancelled_reason}` : ''}.</div>}
        {owed > 0 && inv.status !== 'cancelled' && (
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 18 }} className="stack">
            <b>Pay KES {kes(owed)} by {eat(inv.due_at, false)}</b>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
              <div className="card stack" style={{ padding: 14, gap: 4 }}>
                <b>M-Pesa Paybill</b>
                <span className="small">Lipa na M-Pesa › Pay Bill › Business no. <b>[PAYBILL]</b> › Account no. <b>INV{inv.invoice_no}</b></span>
                <span className="small muted">Pay in several transactions if the amount is above your M-Pesa limit — each one is added to this invoice.</span>
              </div>
              <div className="card stack" style={{ padding: 14, gap: 4 }}>
                <b>Bank transfer, RTGS or PesaLink</b>
                <span className="small"><b>[BANK NAME]</b> · account <b>[ACCOUNT NO.]</b> · reference <b>INV-{inv.invoice_no}</b></span>
                <span className="small muted">Best for large amounts. Send the bank slip to us if the reference is missing.</span>
              </div>
              <div className="card stack" style={{ padding: 14, gap: 4, opacity: 0.7 }}>
                <b>Pay online (M-Pesa prompt or card)</b>
                <span className="small muted">Coming soon — you&apos;ll get an M-Pesa prompt on your phone or pay by card here.</span>
              </div>
            </div>
            <p className="small muted" style={{ margin: 0 }}>Part-payments are accepted. We release the lot for collection once the invoice is fully paid. If it isn&apos;t paid by the due date, the sale may be cancelled and offered to the next bidder.</p>
          </div>
        )}
        {auction?.collection_text && <p className="small"><b>Collection:</b> {auction.collection_text}{auction.location ? ` · ${auction.location}` : ''}</p>}
      </div>
    </div>
  );
}
