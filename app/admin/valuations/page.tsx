import { createClient } from '@/lib/supabase/server';

export default async function ValuationsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('auction_valuations').select('*').order('created_at', { ascending: false }).limit(200);
  return (
    <>
      <h1 style={{ fontSize: 28 }}>Valuation requests</h1>
      <section className="panel stack" style={{ gap: 0 }}>
        {(data ?? []).length === 0 && <p className="small muted">No requests yet. They arrive from the “Sell with us” page.</p>}
        {(data ?? []).map((v) => (
          <div key={v.id} className="stack" style={{ gap: 4, padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
            <div className="row between">
              <b>{v.name}{v.company ? ` · ${v.company}` : ''}</b>
              <span className="small muted">{new Date(v.created_at).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi' })}</span>
            </div>
            <span className="small"><a href={`tel:${v.phone}`}>{v.phone}</a>{v.email ? <> · <a href={`mailto:${v.email}`}>{v.email}</a></> : null}</span>
            <span className="small muted">{[v.kind, v.category, v.location, v.timeline].filter(Boolean).join(' · ')}</span>
            {v.description && <p className="small" style={{ whiteSpace: 'pre-line' }}>{v.description}</p>}
          </div>
        ))}
      </section>
    </>
  );
}
