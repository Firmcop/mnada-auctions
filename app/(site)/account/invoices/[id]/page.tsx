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
          <span className={`pill ${owed <= 0 ? 'pill-green' : 'pill-warn'}`} style={{ fontSize: 14, padding: '8px 12px' }}>
            {owed <= 0 ? 'Paid' : `KES ${kes(owed)} due ${eat(inv.due_at, false)}`}
          </span>
        </div>
        <div className="stack small" style={{ gap: 8, maxWidth: 460 }}>
          <div className="row between"><span className="muted">Billed to</span><span>{profile?.company_name || profile?.full_name}{profile?.kra_pin ? ` · PIN ${profile.kra_pin}` : ''}</span></div>
          <div className="row between"><span className="muted">Hammer price</span><span>KES {kes(inv.hammer)}</span></div>
          <div className="row between"><span className="muted">Buyer&apos;s premium ({auction?.premium_pct}%)</span><span>KES {kes(inv.premium)}</span></div>
          <div className="row between"><span className="muted">VAT (16%){lot?.vat_on_hammer ? ' on premium and hammer' : ' on premium'}</span><span>KES {kes(inv.vat)}</span></div>
          <div className="row between" style={{ fontWeight: 700, fontSize: 16, borderTop: '1px dashed var(--field)', paddingTop: 8 }}><span>Total</span><span>KES {kes(inv.total)}</span></div>
          {Number(inv.paid) > 0 && <div className="row between"><span className="muted">Received</span><span>KES {kes(inv.paid)}</span></div>}
        </div>
        {owed > 0 && (
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 18 }} className="stack">
            <b>How to pay</b>
            <p className="small">M-Pesa: Lipa na M-Pesa › Pay Bill › Business no. <b>[PAYBILL]</b> › Account no. <b>INV{inv.invoice_no}</b></p>
            <p className="small">Bank transfer: <b>[BANK NAME]</b>, account <b>[ACCOUNT NO.]</b>, reference <b>INV-{inv.invoice_no}</b></p>
            <p className="small muted">Online M-Pesa payment from this page is coming soon. We release the lot for collection once the invoice is fully paid.</p>
          </div>
        )}
        {auction?.collection_text && <p className="small"><b>Collection:</b> {auction.collection_text}{auction.location ? ` · ${auction.location}` : ''}</p>}
      </div>
    </div>
  );
}
