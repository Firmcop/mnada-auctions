'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { kes } from '@/lib/format';

export type EnquiryRow = {
  id: string; kind: 'offer' | 'quote' | 'question'; name: string; phone: string; email: string | null;
  offer_amount: number | null; quantity: number | null; delivery_location: string | null; message: string | null;
  status: 'new' | 'contacted' | 'won' | 'lost'; created_at: string;
  auction_listings: { title: string; slug: string; ref_no: number; price: number | null; price_type: string } | null;
};

const KIND: Record<string, string> = { offer: 'Offer', quote: 'Quote request', question: 'Question' };
const STATUS: [EnquiryRow['status'], string][] = [['new', 'New'], ['contacted', 'Contacted'], ['won', 'Won (sold)'], ['lost', 'Lost']];

export default function EnquiryInbox({ initial }: { initial: EnquiryRow[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<string>('new');
  const [err, setErr] = useState<string | null>(null);
  const shown = filter === 'all' ? rows : rows.filter((r) => r.status === filter);

  async function setStatus(id: string, status: EnquiryRow['status']) {
    const { error } = await supabase.from('auction_enquiries').update({ status }).eq('id', id);
    if (error) { setErr(error.message); return; }
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  const wa = (phone: string) => `https://wa.me/${phone.replace(/[^0-9]/g, '').replace(/^0/, '254')}`;

  return (
    <>
      <div className="row" role="tablist" aria-label="Filter enquiries">
        {[['all', 'All'] as const, ...STATUS].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={filter === id} className={`btn btn-sm ${filter === id ? 'btn-dark' : 'btn-outline'}`} onClick={() => setFilter(id)}>
            {label} ({id === 'all' ? rows.length : rows.filter((r) => r.status === id).length})
          </button>
        ))}
      </div>
      {err && <div className="alert alert-err">{err}</div>}
      <section className="panel stack" style={{ gap: 0 }}>
        {shown.length === 0 && <p className="small muted">Nothing here. Enquiries arrive from the “Make an offer” and “Request a quote” buttons on direct-sale items.</p>}
        {shown.map((r) => (
          <div key={r.id} className="row" style={{ gap: '10px 24px', padding: '16px 0', borderBottom: '1px solid var(--line)', alignItems: 'flex-start' }}>
            <div className="stack" style={{ gap: 4, flex: '2 1 320px' }}>
              <div className="row" style={{ gap: 8 }}>
                <span className={`pill ${r.kind === 'offer' ? 'pill-warn' : 'pill-grey'}`}>{KIND[r.kind]}</span>
                <span className="small muted">{new Date(r.created_at).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {r.auction_listings && <Link href={`/direct-sale/${r.auction_listings.slug}`} style={{ fontWeight: 600 }}>DS-{r.auction_listings.ref_no} · {r.auction_listings.title}</Link>}
              {r.kind === 'offer' && r.offer_amount && (
                <span><b>Offer: KES {kes(r.offer_amount)}</b>{r.auction_listings?.price ? <span className="muted small"> (asking KES {kes(r.auction_listings.price)})</span> : null}</span>
              )}
              <span className="small">{[r.quantity ? `Qty ${r.quantity}` : null, r.delivery_location ? `Deliver to ${r.delivery_location}` : null].filter(Boolean).join(' · ')}</span>
              {r.message && <p className="small" style={{ whiteSpace: 'pre-line', color: 'var(--body)' }}>{r.message}</p>}
            </div>
            <div className="stack small" style={{ gap: 4, flex: '1 1 200px' }}>
              <b>{r.name}</b>
              <span className="row" style={{ gap: 10 }}>
                <a href={`tel:${r.phone}`}>{r.phone}</a>
                <a href={wa(r.phone)} target="_blank" rel="noreferrer">WhatsApp</a>
              </span>
              {r.email && <a href={`mailto:${r.email}`}>{r.email}</a>}
            </div>
            <label className="field" style={{ flex: '0 1 170px' }}>
              <span className="sr">Status</span>
              <select className="input" value={r.status} onChange={(e) => setStatus(r.id, e.target.value as EnquiryRow['status'])}>
                {STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
        ))}
      </section>
    </>
  );
}
