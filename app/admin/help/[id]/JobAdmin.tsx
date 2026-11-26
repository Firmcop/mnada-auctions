'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { kes } from '@/lib/format';
import { eatInputToIso, isoToEatInput } from '@/lib/eat-input';
import { STATUS_LABEL, UNIT_LABEL, checklistFor, type ChecklistItem, type HelpPayment, type HelpRequest, type HelpService, type HelpUnit, type QuoteLine } from '@/lib/help';

type Note = { id: number; body: string; minutes: number | null; km: number | null; created_at: string; author_id: string | null };
type Staff = { id: string; full_name: string };
type Customer = { id: string; full_name: string; phone: string; email: string | null; business_name: string | null; seller_status: string | null } | null;
type LotRow = { id: string; title: string; lot_no: number; help_request_id: string | null };
type ListingRow = { id: string; title: string; slug: string; help_request_id: string | null };

export default function JobAdmin({ request: r, lines, payments, services, notes, staff, customer, vatPct, lots, listings }: {
  request: HelpRequest; lines: QuoteLine[]; payments: HelpPayment[]; services: HelpService[]; notes: Note[]; staff: Staff[];
  customer: Customer; vatPct: number; lots: LotRow[]; listings: ListingRow[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(r.checklist?.length ? r.checklist : checklistFor(r.services, services));
  const [payRefs, setPayRefs] = useState<Record<string, string>>({});
  const editable = ['requested', 'quoted'].includes(r.status);
  const names = Object.fromEntries(services.map((s) => [s.code, s.name]));
  const sub = lines.reduce((s, l) => s + Number(l.line_total_kes), 0);
  const vat = lines.reduce((s, l) => s + (l.vat ? Number(l.line_total_kes) : 0), 0) * vatPct / 100;
  const who = (id: string | null) => staff.find((s) => s.id === id)?.full_name ?? '—';
  const minutes = notes.reduce((s, n) => s + (n.minutes ?? 0), 0);
  const km = notes.reduce((s, n) => s + Number(n.km ?? 0), 0);

  async function run(p: PromiseLike<{ error: { message: string } | null }>, ok = 'Saved.') {
    setBusy(true);
    const { error } = await p;
    setBusy(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: ok });
    if (!error) router.refresh();
    return !error;
  }
  const update = (patch: Record<string, unknown>, ok?: string) => run(supabase.from('auction_help_requests').update(patch).eq('id', r.id), ok);

  async function saveLine(e: React.FormEvent<HTMLFormElement>, id: string | null) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const n = (k: string) => Number(String(f.get(k) ?? '0').replace(/[^0-9.]/g, '') || 0);
    const code = String(f.get('service_code') || '') || null;
    const svc = services.find((s) => s.code === code);
    const row = {
      description: String(f.get('description')).trim() || svc?.name || 'Service', service_code: code, unit: String(f.get('unit') || svc?.unit || 'flat'),
      qty: n('qty'), unit_price_kes: n('unit_price_kes'), vat: f.get('vat') === 'on', from_proceeds_ok: f.get('from_proceeds_ok') === 'on',
    };
    const ok = await run(id ? supabase.from('auction_help_quote_lines').update(row).eq('id', id) : supabase.from('auction_help_quote_lines').insert({ ...row, request_id: r.id, sort: 900 }));
    if (ok && !id) e.currentTarget.reset();
  }

  async function schedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const when = eatInputToIso(String(f.get('when') ?? ''));
    await update({
      scheduled_for: when, assigned_to: String(f.get('assigned_to') || '') || null, checklist,
      ...(when && r.status === 'accepted' ? { status: 'scheduled' } : {}),
    }, 'Schedule saved — the customer gets an alert.');
  }
  async function addNote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();
    const ok = await run(supabase.from('auction_help_notes').insert({
      request_id: r.id, author_id: user?.id, body: String(f.get('body')).trim(),
      minutes: String(f.get('minutes') || '') ? Number(f.get('minutes')) : null, km: String(f.get('km') || '') ? Number(f.get('km')) : null,
    }), 'Note added.');
    if (ok) e.currentTarget.reset();
  }
  async function link(kind: 'lot' | 'listing', id: string, on: boolean) {
    await run(supabase.from(kind === 'lot' ? 'auction_lots' : 'auction_listings').update({ help_request_id: on ? r.id : null }).eq('id', id), on ? 'Linked.' : 'Unlinked.');
  }

  const [label, cls] = STATUS_LABEL[r.status];
  return (
    <>
      <div className="row between">
        <h1 style={{ fontSize: 28 }}>{r.reference} · {r.contact_name}</h1>
        <span className={`pill ${cls}`} style={{ fontSize: 14, padding: '8px 12px' }}>{label}</span>
      </div>
      {msg && <div role="status" className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`}>{msg.text}</div>}

      <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
        <section className="panel stack" style={{ gap: 6, flex: '2 1 420px' }}>
          <h3>Request</h3>
          <span className="small"><b>Services:</b> {r.services.map((c) => names[c] ?? c).join(', ')}</span>
          <span className="small"><b>Where:</b> {r.location}{r.distance_km != null ? ` · ~${r.distance_km} km` : ''} · <b>Lots:</b> ~{r.est_lots}{r.preferred_date ? ` · prefers ${new Date(r.preferred_date).toLocaleDateString('en-GB')}` : ''}</span>
          <span className="small"><b>Pays:</b> {r.pay_method === 'proceeds' ? 'from sale proceeds (survey & travel upfront)' : 'deposit upfront, balance on completion'}</span>
          <p className="small" style={{ whiteSpace: 'pre-line', margin: 0, color: 'var(--body)' }}>{r.items_description}</p>
          <span className="small muted">Customer&apos;s estimate: KES {kes(r.estimate_kes)}{r.estimate_complete ? '' : ' (incomplete)'} · received {new Date(r.created_at).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi' })}</span>
        </section>
        <section className="panel stack" style={{ gap: 4, flex: '1 1 240px' }}>
          <h3>Customer</h3>
          <b className="small">{customer?.business_name || customer?.full_name || r.contact_name}</b>
          <a className="small" href={`tel:${r.contact_phone}`}>{r.contact_phone}</a>
          {customer?.email && <a className="small" href={`mailto:${customer.email}`}>{customer.email}</a>}
          <span className="small muted">Seller account: {customer?.seller_status ?? 'none'}</span>
        </section>
      </div>

      <section className="panel stack" style={{ gap: 10 }}>
        <div className="row between">
          <h3>Quote</h3>
          {editable && lines.length === 0 && <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => run(supabase.rpc('auction_help_fill_quote', { p_request: r.id }), 'Lines filled from the price list.')}>Fill from price list</button>}
        </div>
        {lines.map((l) => editable ? (
          <form key={l.id} onSubmit={(e) => saveLine(e, l.id)} className="row" style={{ gap: 8, alignItems: 'flex-end', paddingBottom: 8, borderBottom: '1px solid #F0F2F4' }}>
            <input type="hidden" name="service_code" value={l.service_code ?? ''} /><input type="hidden" name="unit" value={l.unit} />
            <label className="field" style={{ flex: '3 1 220px' }}>Description<input className="input" name="description" defaultValue={l.description} /></label>
            <label className="field" style={{ width: 90 }}>Qty<input className="input" name="qty" defaultValue={Number(l.qty)} /></label>
            <label className="field" style={{ width: 120 }}>Unit KES<input className="input" name="unit_price_kes" defaultValue={Number(l.unit_price_kes)} /></label>
            <label className="check small"><input type="checkbox" name="vat" defaultChecked={l.vat} />VAT</label>
            <label className="check small"><input type="checkbox" name="from_proceeds_ok" defaultChecked={l.from_proceeds_ok} />From proceeds OK</label>
            <b className="small" style={{ width: 100, textAlign: 'right' }}>KES {kes(l.line_total_kes)}</b>
            <button className="btn btn-outline btn-sm" type="submit" disabled={busy}>Save</button>
            <button className="btn btn-outline btn-sm" type="button" disabled={busy} onClick={() => run(supabase.from('auction_help_quote_lines').delete().eq('id', l.id), 'Removed.')}>✕</button>
          </form>
        ) : (
          <div key={l.id} className="row between small" style={{ padding: '4px 0', borderBottom: '1px solid #F0F2F4' }}>
            <span>{l.description} × {Number(l.qty)} @ {kes(l.unit_price_kes)}</span><span>KES {kes(l.line_total_kes)}</span>
          </div>
        ))}
        {editable && (
          <form onSubmit={(e) => saveLine(e, null)} className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
            <label className="field" style={{ flex: '1 1 160px' }}>Service
              <select className="input" name="service_code" defaultValue=""><option value="">Custom line</option>{services.map((s) => <option key={s.code} value={s.code}>{s.name} ({UNIT_LABEL[s.unit as HelpUnit]})</option>)}</select>
            </label>
            <label className="field" style={{ flex: '2 1 200px' }}>Description<input className="input" name="description" placeholder="defaults to service name" /></label>
            <label className="field" style={{ width: 90 }}>Qty<input className="input" name="qty" defaultValue={1} /></label>
            <label className="field" style={{ width: 120 }}>Unit KES<input className="input" name="unit_price_kes" required /></label>
            <label className="check small"><input type="checkbox" name="vat" defaultChecked />VAT</label>
            <label className="check small"><input type="checkbox" name="from_proceeds_ok" defaultChecked />From proceeds OK</label>
            <button className="btn btn-outline btn-sm" type="submit" disabled={busy}>Add line</button>
          </form>
        )}
        <div className="row between small"><span>Subtotal</span><span>KES {kes(sub)}</span></div>
        <div className="row between small"><span>VAT {vatPct}%</span><span>KES {kes(vat)}</span></div>
        <div className="row between"><b>Total</b><b>KES {kes(sub + vat)}</b></div>
        {r.status === 'quoted' && r.quote_total_kes != null && Math.round(r.quote_total_kes) !== Math.round(sub + vat) && <div className="alert alert-err">Lines changed since the quote was sent (KES {kes(r.quote_total_kes)}). Re-send so the customer sees the new total.</div>}
        {editable && (
          <form onSubmit={(e) => { e.preventDefault(); const note = String(new FormData(e.currentTarget).get('note') ?? ''); run(supabase.rpc('auction_help_send_quote', { p_request: r.id, p_note: note }), 'Quote sent — the customer gets an alert.'); }} className="stack" style={{ gap: 8 }}>
            <label className="field">Note to customer (visit plan, assumptions)<textarea className="input" name="note" rows={2} defaultValue={r.quote_note ?? ''} /></label>
            <div className="row">
              <button className="btn btn-primary" type="submit" disabled={busy || lines.length === 0}>{r.status === 'quoted' ? 'Re-send quote' : 'Send quote'}</button>
              <button className="btn btn-outline" type="button" disabled={busy} onClick={() => { const why = window.prompt('Reason shown to the customer:'); if (why !== null) update({ status: 'declined', quote_note: why || null }, 'Declined.'); }}>Decline request</button>
            </div>
          </form>
        )}
        {r.from_proceeds_kes > 0 && <span className="small" style={{ color: 'var(--green)', fontWeight: 600 }}>KES {kes(r.from_proceeds_kes)} to deduct from this customer&apos;s sale proceeds.</span>}
      </section>

      {['accepted', 'scheduled', 'in_progress', 'done'].includes(r.status) && (
        <form onSubmit={schedule} className="panel stack" style={{ gap: 10 }}>
          <h3>Schedule &amp; checklist</h3>
          <div className="grid2">
            <label className="field">Visit date &amp; time<input className="input" type="datetime-local" name="when" defaultValue={isoToEatInput(r.scheduled_for)} /></label>
            <label className="field">Assigned to
              <select className="input" name="assigned_to" defaultValue={r.assigned_to ?? ''}><option value="">Unassigned</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select>
            </label>
          </div>
          <div className="stack" style={{ gap: 6 }}>
            {checklist.map((c, i) => (
              <label key={i} className="check"><input type="checkbox" checked={c.done} onChange={(e) => setChecklist((l) => l.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)))} />{c.label}</label>
            ))}
            <button type="button" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => { const t = window.prompt('Checklist item:'); if (t) setChecklist((l) => [...l, { label: t, done: false }]); }}>+ Add item</button>
          </div>
          <div className="row">
            <button className="btn btn-primary" type="submit" disabled={busy}>Save schedule &amp; checklist</button>
            {['accepted', 'scheduled'].includes(r.status) && <button className="btn btn-outline" type="button" disabled={busy} onClick={() => update({ status: 'in_progress', checklist }, 'Marked in progress.')}>Start work</button>}
            {r.status !== 'done' && <button className="btn btn-green" type="button" disabled={busy} onClick={async () => { if (!window.confirm('Mark this job complete? Any balance due is invoiced to the customer.')) return; await supabase.from('auction_help_requests').update({ checklist }).eq('id', r.id); run(supabase.rpc('auction_help_complete', { p_request: r.id }), 'Job completed.'); }}>Complete job</button>}
          </div>
          <span className="small muted">Assigned: {who(r.assigned_to)}. The customer sees the checklist progress once work starts.</span>
        </form>
      )}

      <section className="panel stack" style={{ gap: 8 }}>
        <h3>Payments</h3>
        {payments.length === 0 && <span className="small muted">None yet — a deposit is created when the customer accepts the quote.</span>}
        {payments.map((p) => (
          <div key={p.id} className="row" style={{ gap: '8px 14px', padding: '6px 0', borderBottom: '1px solid #F0F2F4' }}>
            <b className="small" style={{ flex: '1 1 220px' }}>{p.kind === 'deposit' ? 'Deposit' : 'Balance'} · KES {kes(p.amount_kes)} · ref {p.reference}</b>
            <span className={`pill ${p.status === 'paid' ? 'pill-green' : p.status === 'pending' ? 'pill-warn' : 'pill-grey'}`}>{p.status}{p.payment_ref ? ` · ${p.payment_ref}` : ''}</span>
            {p.status === 'pending' && <>
              <input className="input" style={{ width: 170, height: 36 }} placeholder="M-Pesa code" aria-label="M-Pesa code" value={payRefs[p.id] ?? ''} onChange={(e) => setPayRefs((x) => ({ ...x, [p.id]: e.target.value }))} />
              <button type="button" className="btn btn-green btn-sm" disabled={busy} onClick={() => run(supabase.rpc('auction_help_confirm_payment', { p_payment: p.id, p_ref: payRefs[p.id] || null }), 'Payment confirmed.')}>Confirm paid</button>
              <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => run(supabase.from('auction_help_payments').update({ status: 'cancelled' }).eq('id', p.id), 'Cancelled.')}>Cancel</button>
            </>}
          </div>
        ))}
      </section>

      <section className="panel stack" style={{ gap: 8 }}>
        <h3>Items listed for this job</h3>
        <span className="small muted">Tick the customer&apos;s lots and listings created under this job — they show on the customer&apos;s request page. Create them from <Link href="/admin/auctions">Auctions &amp; lots</Link> or <Link href="/admin/listings">Direct sale</Link> with this customer as seller.</span>
        {lots.length === 0 && listings.length === 0 && <span className="small muted">This customer has no lots or listings yet.</span>}
        {lots.map((l) => <label key={l.id} className="check small"><input type="checkbox" checked={l.help_request_id === r.id} disabled={busy} onChange={(e) => link('lot', l.id, e.target.checked)} />Lot {l.lot_no} · {l.title}</label>)}
        {listings.map((l) => <label key={l.id} className="check small"><input type="checkbox" checked={l.help_request_id === r.id} disabled={busy} onChange={(e) => link('listing', l.id, e.target.checked)} />Direct sale · {l.title}</label>)}
      </section>

      <section className="panel stack" style={{ gap: 8 }}>
        <h3>Staff notes &amp; time log <span className="small muted">· {Math.round(minutes / 6) / 10} h · {km} km logged</span></h3>
        <form onSubmit={addNote} className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
          <label className="field" style={{ flex: '3 1 260px' }}>Note (internal)<input className="input" name="body" required /></label>
          <label className="field" style={{ width: 110 }}>Minutes<input className="input" name="minutes" type="number" min={0} /></label>
          <label className="field" style={{ width: 100 }}>Km<input className="input" name="km" type="number" min={0} step="0.1" /></label>
          <button className="btn btn-outline" type="submit" disabled={busy}>Add</button>
        </form>
        {notes.map((n) => (
          <div key={n.id} className="small" style={{ padding: '6px 0', borderBottom: '1px solid #F0F2F4' }}>
            <b>{who(n.author_id)}</b> <span className="muted">{new Date(n.created_at).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}{n.minutes ? ` · ${n.minutes} min` : ''}{n.km ? ` · ${n.km} km` : ''}</span><br />{n.body}
          </div>
        ))}
      </section>
    </>
  );
}
