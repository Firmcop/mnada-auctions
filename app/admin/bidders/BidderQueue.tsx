'use client';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/supabase/server';
import { kes } from '@/lib/format';

type Row = Profile & { email: string | null };
const FILTERS = [['pending', 'Waiting'], ['info_requested', 'Info requested'], ['approved', 'Approved'], ['rejected', 'Rejected']] as const;
const PILL: Record<string, string> = { pending: 'pill-warn', info_requested: 'pill-grey', approved: 'pill-green', rejected: 'pill-warn' };

export default function BidderQueue({ initial }: { initial: Row[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<string>('pending');
  const shown = rows.filter((r) => r.status === filter);
  const [selId, setSelId] = useState<string | null>(shown[0]?.id ?? null);
  const sel = rows.find((r) => r.id === selId) ?? null;
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [limit, setLimit] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setDocUrl(null);
    setMsg(null);
    setLimit(sel?.bid_limit ? String(sel.bid_limit) : '');
    if (sel?.doc_path) {
      supabase.storage.from('auction-kyc').createSignedUrl(sel.doc_path, 600).then(({ data }) => setDocUrl(data?.signedUrl ?? null));
    }
  }, [sel?.id, sel?.doc_path, sel?.bid_limit, supabase]);

  async function setStatus(status: Row['status']) {
    if (!sel) return;
    const bid_limit = limit.replace(/[^0-9]/g, '') ? Number(limit.replace(/[^0-9]/g, '')) : null;
    const { error } = await supabase.from('auction_profiles').update({ status, bid_limit }).eq('id', sel.id);
    if (error) { setMsg(error.message); return; }
    const next = rows.map((r) => (r.id === sel.id ? { ...r, status, bid_limit } : r));
    setRows(next);
    const remaining = next.filter((r) => r.status === filter && r.id !== sel.id);
    setSelId(remaining[0]?.id ?? sel.id);
  }

  return (
    <>
      <div className="row" role="tablist" aria-label="Filter bidders">
        {FILTERS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={filter === id}
            className={`btn btn-sm ${filter === id ? 'btn-dark' : 'btn-outline'}`}
            onClick={() => { setFilter(id); setSelId(rows.find((r) => r.status === id)?.id ?? null); }}>
            {label} ({rows.filter((r) => r.status === id).length})
          </button>
        ))}
      </div>
      <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
        <section className="panel stack" style={{ flex: '1 1 300px', minWidth: 0, gap: 2, padding: 8 }}>
          {shown.length === 0 && <p className="small muted" style={{ padding: 12 }}>Nobody here.</p>}
          {shown.map((r) => (
            <button key={r.id} type="button" onClick={() => setSelId(r.id)} aria-pressed={r.id === selId}
              className="row between" style={{ width: '100%', padding: 12, borderRadius: 8, border: 0, font: 'inherit', cursor: 'pointer', textAlign: 'left', flexWrap: 'nowrap', background: r.id === selId ? 'var(--surface)' : '#fff', boxShadow: r.id === selId ? 'inset 3px 0 0 var(--accent)' : 'none' }}>
              <span className="stack" style={{ gap: 2 }}>
                <b style={{ fontSize: 14 }}>{r.company_name || r.full_name}</b>
                <span className="small muted">{r.account_type === 'company' ? 'Company' : 'Individual'} · {new Date(r.created_at).toLocaleDateString('en-GB')}{r.doc_path ? '' : ' · no document'}</span>
              </span>
              <span className={`pill ${PILL[r.status]}`}>{r.status.replace('_', ' ')}</span>
            </button>
          ))}
        </section>
        {sel && (
          <section className="panel stack" style={{ flex: '2 1 460px', minWidth: 0, gap: 16 }}>
            <div className="row between">
              <div className="stack" style={{ gap: 2 }}>
                <h2 style={{ fontSize: 22 }}>{sel.company_name || sel.full_name}</h2>
                <span className="small muted">Bidder {sel.bidder_no}{sel.company_name ? ` · contact ${sel.full_name}` : ''}</span>
              </div>
              <span className={`pill ${PILL[sel.status]}`}>{sel.status.replace('_', ' ')}</span>
            </div>
            <div className="grid2 small">
              <div><span className="eyebrow">Mobile</span><div>{sel.phone}</div></div>
              <div><span className="eyebrow">Email</span><div>{sel.email ?? '—'}</div></div>
              <div><span className="eyebrow">{sel.account_type === 'company' ? 'Registration no.' : 'ID / passport no.'}</span><div>{sel.id_number ?? '—'}</div></div>
              <div><span className="eyebrow">KRA PIN</span><div>{sel.kra_pin ?? '—'}</div></div>
            </div>
            {sel.doc_path ? (
              docUrl ? (
                /\.pdf$/i.test(sel.doc_path)
                  ? <a href={docUrl} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ alignSelf: 'flex-start' }}>Open document (PDF)</a>
                  // eslint-disable-next-line @next/next/no-img-element
                  : <a href={docUrl} target="_blank" rel="noreferrer"><img src={docUrl} alt="Uploaded identity document" style={{ maxWidth: '100%', maxHeight: 360, borderRadius: 10, border: '1px solid var(--line)' }} /></a>
              ) : <span className="small muted">Loading document…</span>
            ) : <div className="alert alert-info">No document uploaded yet.</div>}
            <div className="row" style={{ alignItems: 'flex-end' }}>
              <label className="field" style={{ flex: '1 1 220px' }}>Bidding limit (KES, empty = no limit)
                <input className="input" inputMode="numeric" value={limit ? kes(Number(limit.replace(/[^0-9]/g, ''))) : ''} onChange={(e) => setLimit(e.target.value.replace(/[^0-9]/g, ''))} placeholder="No limit" />
              </label>
              <div className="row" style={{ marginLeft: 'auto' }}>
                <button type="button" className="btn btn-outline" style={{ color: 'var(--warn)' }} onClick={() => setStatus('rejected')}>Reject</button>
                <button type="button" className="btn btn-outline" onClick={() => setStatus('info_requested')}>Ask for more info</button>
                <button type="button" className="btn btn-green" onClick={() => setStatus('approved')}>{sel.status === 'approved' ? 'Save limit' : 'Approve'}</button>
              </div>
            </div>
            {msg && <div className="alert alert-err">{msg}</div>}
            <p className="small muted">“Ask for more info” shows the bidder a message on their account page asking them to upload a new document. Contact them on {sel.phone} to explain what&apos;s needed.</p>
          </section>
        )}
      </div>
    </>
  );
}
