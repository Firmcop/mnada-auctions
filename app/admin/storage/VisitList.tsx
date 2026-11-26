'use client';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Visit = { id: string; name: string; phone: string; email: string | null; visit_date: string; time_slot: string; purpose: string; notes: string | null; status: string };
const SLOT: Record<string, string> = { morning: '9–11am', midday: '11am–1pm', afternoon: '2–4pm' };

export default function VisitList({ visits }: { visits: Visit[] }) {
  const router = useRouter();
  async function set(id: string, status: string) {
    await createClient().from('auction_storage_visits').update({ status }).eq('id', id);
    router.refresh();
  }
  return (
    <section className="panel stack" style={{ gap: 0 }}>
      <h3 style={{ marginBottom: 8 }}>Site visits</h3>
      {visits.length === 0 && <span className="small muted">No visits booked.</span>}
      {visits.map((v) => (
        <div key={v.id} className="row" style={{ gap: '8px 14px', padding: '8px 0', borderBottom: '1px solid #F0F2F4' }}>
          <span className="stack" style={{ gap: 2, flex: '1 1 280px' }}>
            <b className="small">{new Date(v.visit_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {SLOT[v.time_slot]} · {v.name}</b>
            <span className="small muted"><a href={`tel:${v.phone}`}>{v.phone}</a>{v.email ? ` · ${v.email}` : ''} · {v.purpose === 'viewing' ? 'viewing items on sale' : 'considering storage'}{v.notes ? ` · ${v.notes}` : ''}</span>
          </span>
          <span className={`pill ${v.status === 'confirmed' ? 'pill-green' : 'pill-warn'}`}>{v.status}</span>
          {v.status === 'requested' && <button type="button" className="btn btn-green btn-sm" onClick={() => set(v.id, 'confirmed')}>Confirmed by phone</button>}
          <button type="button" className="btn btn-outline btn-sm" onClick={() => set(v.id, 'done')}>Done</button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => set(v.id, 'cancelled')}>Cancel</button>
        </div>
      ))}
    </section>
  );
}
