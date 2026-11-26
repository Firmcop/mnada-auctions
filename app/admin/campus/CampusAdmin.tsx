'use client';
import { Fragment, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { kes } from '@/lib/format';
import {
  EARN_LABEL, EARN_STATUS, GIG_KIND, GIG_STATUS, LEAD_STATUS, LEVEL_LABEL, ROLE_INFO,
  type CampusSettings, type Challenge, type Earning, type Gig, type Lead, type Level, type Member, type Video,
} from '@/lib/campus';

export type Person = { id: string; full_name: string; phone: string; email: string | null; id_number: string | null; kra_pin: string | null; status: string };
type Referral = { referred_id: string; member_id: string; code: string; flag: string | null; blocked: boolean; first_bid_paid: boolean; created_at: string };
type PayoutRow = { id: string; reference: string; campus_member_id: string | null; amount_kes: number; gross_kes: number | null; wht_kes: number | null; status: string; payment_ref: string | null; created_at: string; paid_at: string | null };
type Tab = 'students' | 'leads' | 'gigs' | 'videos' | 'bidders' | 'money' | 'challenges' | 'rates';

const d = (s: string | null) => (s ? new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—');

export default function CampusAdmin(props: {
  settings: CampusSettings; members: Member[]; leads: Lead[]; gigs: Gig[]; videos: Video[]; earnings: Earning[]; challenges: Challenge[];
  referrals: Referral[]; payouts: PayoutRow[]; people: Record<string, Person>; files: Record<string, string>;
  sellers: { id: string; full_name: string; business_name: string | null; phone: string }[]; firms: { id: string; name: string }[];
  jobs: { id: string; reference: string; location: string | null; status: string }[]; canFinance: boolean; canOps: boolean;
}) {
  const { settings: s, members, leads, gigs, videos, earnings, challenges, referrals, payouts, people, files, sellers, firms, jobs, canFinance, canOps } = props;
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<Tab>(members.some((m) => m.status === 'pending') ? 'students' : leads.some((l) => l.status === 'new') ? 'leads' : 'students');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const name = (id: string | null) => (id ? people[id]?.full_name ?? '—' : '—');
  const mName = (id: string | null) => { const m = members.find((x) => x.id === id); return m ? `${name(m.id)} · ${m.campus}` : '—'; };
  async function run(p: PromiseLike<{ error: { message: string } | null }>, ok: string) {
    const { error } = await p;
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: ok });
    if (!error) router.refresh();
    return !error;
  }
  const balance = (id: string) => earnings.filter((e) => e.member_id === id && e.status === 'approved' && !e.payout_id).reduce((a, e) => a + Number(e.amount_kes), 0);
  const count = (t: Tab) => ({
    students: members.filter((m) => m.status === 'pending').length, leads: leads.filter((l) => l.status === 'new').length,
    gigs: gigs.filter((g) => g.status === 'submitted').length, videos: videos.filter((v) => v.status === 'submitted').length,
    bidders: referrals.filter((r) => r.flag && r.blocked).length, money: 0, challenges: 0, rates: 0,
  }[t]);
  const TABS: [Tab, string][] = [['students', 'Students'], ['leads', 'Scout leads'], ['gigs', 'Gigs'], ['videos', 'Videos'], ['bidders', 'Referred bidders'], ['money', 'Earnings & payouts'], ['challenges', 'Challenges'], ['rates', 'Rates & rules']];

  return (
    <>
      <nav className="row" style={{ gap: 6 }} aria-label="Campus sections">
        {TABS.map(([t, l]) => (
          <button key={t} type="button" className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setTab(t); setMsg(null); setOpen(null); }}>
            {l}{count(t) ? ` (${count(t)})` : ''}
          </button>
        ))}
      </nav>
      {msg && <div role="status" className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`}>{msg.text}</div>}

      {tab === 'students' && (
        <div className="panel" style={{ overflowX: 'auto' }}>
          {members.length === 0 ? <p className="muted">No applications yet. Share /campus with your pilot campuses.</p> : (
            <table className="data" style={{ minWidth: 900 }}>
              <thead><tr><th>Student</th><th>Campus</th><th>Code</th><th>Level</th><th>Status</th><th style={{ textAlign: 'right' }}>Ready to pay</th><th /></tr></thead>
              <tbody>{members.map((m) => {
                const p = people[m.id];
                return (<Fragment key={m.id}>
                  <tr>
                    <td><b>{p?.full_name}</b><div className="small muted">{p?.phone} · {p?.email}</div></td>
                    <td className="small">{m.campus}{m.course ? <div className="muted">{m.course}{m.year_of_study ? `, year ${m.year_of_study}` : ''}</div> : null}</td>
                    <td className="small"><b>{m.code}</b><div className="muted">{m.clicks} clicks</div></td>
                    <td>{LEVEL_LABEL[m.level]}</td>
                    <td><span className={`pill ${m.status === 'active' ? 'pill-green' : m.status === 'pending' ? 'pill-warn' : 'pill-grey'}`}>{m.status}</span></td>
                    <td style={{ textAlign: 'right' }}>KES {kes(balance(m.id))}</td>
                    <td><button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(open === m.id ? null : m.id)}>{open === m.id ? 'Close' : 'Open'}</button></td>
                  </tr>,
                  {open === m.id && (
                    <tr><td colSpan={7} style={{ background: 'var(--surface)' }}>
                      <div className="row" style={{ gap: 24, alignItems: 'flex-start' }}>
                        <div className="stack small" style={{ gap: 4, flex: '1 1 260px' }}>
                          <span>Student ID no.: <b>{m.student_id_no ?? '—'}</b></span>
                          <span>National ID: <b>{p?.id_number ?? '—'}</b> · Account: {p?.status}</span>
                          <span>KRA PIN: <b>{p?.kra_pin ?? 'missing — can’t be paid'}</b></span>
                          <span>M-Pesa: <b>{m.mpesa_phone}</b></span>
                          <span>Wants to: {m.roles.map((r) => ROLE_INFO[r]?.[0] ?? r).join(', ')}</span>
                          <span>Applied {d(m.created_at)}{m.approved_at ? ` · approved ${d(m.approved_at)}` : ''}</span>
                          {m.student_id_path && files[m.student_id_path] && <a href={files[m.student_id_path]} target="_blank" rel="noreferrer">View student ID</a>}
                        </div>
                        <form className="stack" style={{ gap: 8, flex: '1 1 320px' }} onSubmit={(e) => {
                          e.preventDefault(); const f = new FormData(e.currentTarget);
                          run(supabase.from('auction_campus_members').update({ status: String(f.get('status')), level: String(f.get('level')), admin_note: String(f.get('note') ?? '').trim() || null }).eq('id', m.id), 'Student saved.');
                        }}>
                          <div className="row" style={{ gap: 8 }}>
                            <label className="field" style={{ width: 150 }}>Status<select className="input" name="status" defaultValue={m.status}>{['pending', 'active', 'suspended', 'rejected'].map((x) => <option key={x}>{x}</option>)}</select></label>
                            <label className="field" style={{ width: 170 }}>Level<select className="input" name="level" defaultValue={m.level}>{(Object.keys(LEVEL_LABEL) as Level[]).map((x) => <option key={x} value={x}>{LEVEL_LABEL[x]}</option>)}</select></label>
                          </div>
                          <label className="field">Note (shown to the student if suspended or rejected)<input className="input" name="note" defaultValue={m.admin_note ?? ''} /></label>
                          <div className="row" style={{ gap: 8 }}>
                            <button className="btn btn-primary btn-sm" type="submit">Save</button>
                            {m.status === 'pending' && <button className="btn btn-outline btn-sm" type="button" onClick={() => run(supabase.from('auction_campus_members').update({ status: 'active' }).eq('id', m.id), 'Approved — the student has been notified.')}>Approve now</button>}
                          </div>
                        </form>
                      </div>
                    </td></tr>
                  )}
                </Fragment>);
              })}</tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'leads' && (
        <div className="panel" style={{ overflowX: 'auto' }}>
          {leads.length === 0 ? <p className="muted">No leads yet.</p> : (
            <table className="data" style={{ minWidth: 900 }}>
              <thead><tr><th>Sent</th><th>Business</th><th>Contact</th><th>Scout</th><th>Status</th><th /></tr></thead>
              <tbody>{leads.map((l) => (<Fragment key={l.id}>
                <tr>
                  <td className="small">{d(l.created_at)}</td>
                  <td><b>{l.business_name}</b><div className="small muted">{l.location}{l.est_value_kes ? ` · ~KES ${kes(l.est_value_kes)}` : ''}</div>{l.flag && <div className="small" style={{ color: 'var(--warn)' }}>⚑ {l.flag}</div>}</td>
                  <td className="small">{l.contact_name}<div>{l.contact_phone}</div></td>
                  <td className="small">{mName(l.member_id)}</td>
                  <td><span className={`pill ${LEAD_STATUS[l.status][1]}`}>{LEAD_STATUS[l.status][0]}</span></td>
                  <td><button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(open === l.id ? null : l.id)}>{open === l.id ? 'Close' : 'Open'}</button></td>
                </tr>,
                {open === l.id && (
                  <tr><td colSpan={6} style={{ background: 'var(--surface)' }}>
                    <div className="stack" style={{ gap: 10 }}>
                      <p className="small" style={{ whiteSpace: 'pre-line' }}><b>Items:</b> {l.items}{l.category ? ` (${l.category})` : ''}{l.contact_email ? <><br />Email: {l.contact_email}</> : null}</p>
                      {l.photos.length > 0 && <div className="row" style={{ gap: 8 }}>{l.photos.map((p) => files[p] && <a key={p} href={files[p]} target="_blank" rel="noreferrer"><img src={files[p]} alt="Lead photo" style={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 6 }} /></a>)}</div>}
                      <form className="row" style={{ gap: 8, alignItems: 'flex-end' }} onSubmit={(e) => {
                        e.preventDefault(); const f = new FormData(e.currentTarget);
                        run(supabase.from('auction_campus_leads').update({
                          status: String(f.get('status')), seller_id: String(f.get('seller')) || null, auctioneer_id: String(f.get('firm')) || null,
                          help_request_id: String(f.get('job')) || null, admin_note: String(f.get('note') ?? '').trim() || null,
                        }).eq('id', l.id), 'Lead saved.');
                      }}>
                        <label className="field" style={{ width: 160 }}>Status<select className="input" name="status" defaultValue={l.status}>{(Object.keys(LEAD_STATUS) as Lead['status'][]).map((x) => <option key={x} value={x}>{LEAD_STATUS[x][0]}</option>)}</select></label>
                        <label className="field" style={{ width: 230 }}>Seller account<select className="input" name="seller" defaultValue={l.seller_id ?? ''}><option value="">—</option>{sellers.map((x) => <option key={x.id} value={x.id}>{x.business_name || x.full_name} · {x.phone}</option>)}</select></label>
                        <label className="field" style={{ width: 200 }}>or auctioneer firm<select className="input" name="firm" defaultValue={l.auctioneer_id ?? ''}><option value="">—</option>{firms.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
                        <label className="field" style={{ width: 170 }}>Listing Help job<select className="input" name="job" defaultValue={l.help_request_id ?? ''}><option value="">—</option>{jobs.map((x) => <option key={x.id} value={x.id}>{x.reference}</option>)}</select></label>
                        <label className="field" style={{ flex: '1 1 200px' }}>Internal note<input className="input" name="note" defaultValue={l.admin_note ?? ''} /></label>
                        <button className="btn btn-primary btn-sm" type="submit">Save</button>
                      </form>
                      <span className="small muted">Mark “Signed up — earning” once the business is an approved seller (or auctioneer firm) and link the account. From then the scout earns on their sales for {s.scout_months} months.</span>
                    </div>
                  </td></tr>
                )}
              </Fragment>))}</tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'gigs' && (
        <>
          {canOps && (
            <form className="panel stack" style={{ gap: 10 }} onSubmit={async (e) => {
              e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
              const ok = await run(supabase.from('auction_campus_gigs').insert({
                title: String(f.get('title')), kind: String(f.get('kind')), details: String(f.get('details') ?? '').trim() || null, location: String(f.get('location') ?? '').trim() || null,
                campus: String(f.get('campus')) || null, scheduled_for: f.get('when') ? new Date(String(f.get('when'))).toISOString() : null,
                pay_kes: Number(String(f.get('pay')).replace(/[^0-9.]/g, '')) || 0, help_request_id: String(f.get('job')) || null,
              }), 'Gig posted.');
              if (ok) form.reset();
            }}>
              <h3>Post a gig</h3>
              <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
                <label className="field" style={{ flex: '2 1 260px' }}>Title<input className="input" name="title" required placeholder="Photograph 12 lots at the Ruiru yard" /></label>
                <label className="field" style={{ width: 160 }}>Type<select className="input" name="kind">{(Object.keys(GIG_KIND) as Gig['kind'][]).map((k) => <option key={k} value={k}>{GIG_KIND[k]}</option>)}</select></label>
                <label className="field" style={{ width: 130 }}>Pay (KES)<input className="input" name="pay" required inputMode="numeric" /></label>
                <label className="field" style={{ width: 200 }}>When<input className="input" name="when" type="datetime-local" /></label>
              </div>
              <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
                <label className="field" style={{ flex: '1 1 200px' }}>Location<input className="input" name="location" /></label>
                <label className="field" style={{ width: 220 }}>Best for campus<select className="input" name="campus"><option value="">Any</option>{s.campuses.map((c) => <option key={c}>{c}</option>)}</select></label>
                <label className="field" style={{ width: 170 }}>Listing Help job<select className="input" name="job"><option value="">—</option>{jobs.map((x) => <option key={x.id} value={x.id}>{x.reference}{x.location ? ` · ${x.location}` : ''}</option>)}</select></label>
              </div>
              <label className="field">Instructions<textarea className="input" name="details" rows={2} placeholder="What to shoot, how many photos per lot, who to ask for on site" /></label>
              <button className="btn btn-primary btn-sm" type="submit" style={{ alignSelf: 'flex-start' }}>Post gig</button>
              {s.crew_rates.length > 0 && <span className="small muted">Standard rates: {s.crew_rates.map((r) => `${r.task} KES ${kes(r.kes)}`).join(' · ')}</span>}
            </form>
          )}
          <div className="panel" style={{ overflowX: 'auto' }}>
            {gigs.length === 0 ? <p className="muted">No gigs posted.</p> : (
              <table className="data" style={{ minWidth: 860 }}>
                <thead><tr><th>Gig</th><th>Pay</th><th>Student</th><th>Status</th><th>Work</th><th /></tr></thead>
                <tbody>{gigs.map((g) => (
                  <tr key={g.id}>
                    <td><b>{g.title}</b><div className="small muted">{GIG_KIND[g.kind]}{g.location ? ` · ${g.location}` : ''}{g.scheduled_for ? ` · ${d(g.scheduled_for)}` : ''}</div></td>
                    <td>KES {kes(g.pay_kes)}</td>
                    <td className="small">{mName(g.member_id)}</td>
                    <td><span className={`pill ${GIG_STATUS[g.status][1]}`}>{GIG_STATUS[g.status][0]}</span></td>
                    <td className="small">{g.submission_links.map((u, i) => <div key={u}><a href={u} target="_blank" rel="noreferrer">Link {i + 1}</a></div>)}{g.submission_note}</td>
                    <td>
                      {canOps && g.status === 'submitted' && (
                        <div className="stack" style={{ gap: 4 }}>
                          <button className="btn btn-primary btn-sm" type="button" onClick={() => run(supabase.rpc('auction_campus_gig_review', { p_gig: g.id, p_approve: true, p_note: '' }), 'Approved — pay added to the student’s wallet.')}>Approve &amp; pay</button>
                          <button className="btn btn-outline btn-sm" type="button" onClick={() => { const n = prompt('Reason (shown to the student)') ?? ''; run(supabase.rpc('auction_campus_gig_review', { p_gig: g.id, p_approve: false, p_note: n }), 'Marked not approved.'); }}>Reject</button>
                        </div>
                      )}
                      {canOps && g.status === 'claimed' && <button className="btn btn-outline btn-sm" type="button" onClick={() => run(supabase.rpc('auction_campus_gig_release', { p_gig: g.id }), 'Gig reopened.')}>Reopen</button>}
                      {canOps && g.status === 'open' && <button className="btn btn-outline btn-sm" type="button" onClick={() => run(supabase.from('auction_campus_gigs').update({ status: 'cancelled' }).eq('id', g.id), 'Gig cancelled.')}>Cancel</button>}
                    </td>
                  </tr>))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'videos' && (
        <div className="panel" style={{ overflowX: 'auto' }}>
          {videos.length === 0 ? <p className="muted">No videos submitted.</p> : (
            <table className="data" style={{ minWidth: 820 }}>
              <thead><tr><th>Sent</th><th>Student</th><th>Video</th><th>Views</th><th>Status</th><th /></tr></thead>
              <tbody>{videos.map((v) => (
                <tr key={v.id}>
                  <td className="small">{d(v.created_at)}</td><td className="small">{mName(v.member_id)}</td>
                  <td className="small"><a href={v.url} target="_blank" rel="noreferrer">{v.platform} ↗</a>{v.about ? <div className="muted">{v.about}</div> : null}</td>
                  <td>{v.status === 'submitted'
                    ? <input className="input" style={{ width: 110 }} id={`views-${v.id}`} defaultValue={v.views} inputMode="numeric" aria-label="Views counted" />
                    : kes(v.views)}</td>
                  <td><span className={`pill ${v.status === 'approved' ? 'pill-green' : v.status === 'submitted' ? 'pill-warn' : 'pill-grey'}`}>{v.status}{v.status === 'approved' ? ` · KES ${kes(Number(v.fee_kes) + Number(v.bonus_kes))}` : ''}</span></td>
                  <td>{v.status === 'submitted' && (
                    <div className="stack" style={{ gap: 4 }}>
                      <button className="btn btn-primary btn-sm" type="button" onClick={() => {
                        const el = document.getElementById(`views-${v.id}`) as HTMLInputElement | null;
                        run(supabase.rpc('auction_campus_video_review', { p_video: v.id, p_approve: true, p_views: Number(el?.value.replace(/[^0-9]/g, '') || v.views), p_note: '' }), 'Approved — fee and any views bonus added.');
                      }}>Approve</button>
                      <button className="btn btn-outline btn-sm" type="button" onClick={() => { const n = prompt('Reason (shown to the student)') ?? ''; run(supabase.rpc('auction_campus_video_review', { p_video: v.id, p_approve: false, p_views: v.views, p_note: n }), 'Rejected.'); }}>Reject</button>
                    </div>
                  )}</td>
                </tr>))}
              </tbody>
            </table>
          )}
          <p className="small muted">Check the views yourself before approving. Fee KES {kes(s.creator_fee_kes)}; bonus {s.creator_bonus.map((b) => `KES ${kes(b.kes)} at ${kes(b.views)}+ views`).join(', ') || 'none'}.</p>
        </div>
      )}

      {tab === 'bidders' && (
        <div className="panel" style={{ overflowX: 'auto' }}>
          {referrals.length === 0 ? <p className="muted">No one has registered with a student code yet.</p> : (
            <table className="data" style={{ minWidth: 760 }}>
              <thead><tr><th>Joined</th><th>Bidder</th><th>Referred by</th><th>First-bid bonus</th><th>Check</th><th /></tr></thead>
              <tbody>{referrals.map((r) => (
                <tr key={r.referred_id}>
                  <td className="small">{d(r.created_at)}</td>
                  <td><b>{name(r.referred_id)}</b><div className="small muted">{people[r.referred_id]?.phone} · {people[r.referred_id]?.status}</div></td>
                  <td className="small">{mName(r.member_id)} <span className="muted">({r.code})</span></td>
                  <td>{r.first_bid_paid ? 'Paid' : '—'}</td>
                  <td className="small">{r.flag ? <span style={{ color: 'var(--warn)' }}>⚑ {r.flag}</span> : 'OK'}{r.blocked ? <div><b>Blocked — no earnings</b></div> : null}</td>
                  <td><button className="btn btn-outline btn-sm" type="button" onClick={() => run(supabase.from('auction_campus_referrals').update({ blocked: !r.blocked }).eq('referred_id', r.referred_id), r.blocked ? 'Unblocked — future purchases earn.' : 'Blocked.')}>{r.blocked ? 'Unblock' : 'Block'}</button></td>
                </tr>))}
              </tbody>
            </table>
          )}
          <p className="small muted">A referral is blocked automatically when the bidder has the same phone or ID number as the student. Block any you suspect are the student’s household.</p>
        </div>
      )}

      {tab === 'money' && (
        <>
          <div className="panel stack" style={{ gap: 10 }}>
            <h3>Ready to pay</h3>
            {(() => {
              const due = members.map((m) => ({ m, amt: balance(m.id) })).filter((x) => x.amt > 0).sort((a, b) => b.amt - a.amt);
              if (!due.length) return <p className="muted small">No approved earnings waiting.</p>;
              return (
                <table className="data">
                  <thead><tr><th>Student</th><th>M-Pesa</th><th>KRA PIN</th><th style={{ textAlign: 'right' }}>Earned</th><th style={{ textAlign: 'right' }}>Withholding {s.wht_pct}%</th><th style={{ textAlign: 'right' }}>To send</th><th /></tr></thead>
                  <tbody>{due.map(({ m, amt }) => {
                    const wht = Math.round(amt * s.wht_pct / 100);
                    const okMin = amt >= s.min_payout_kes; const pin = people[m.id]?.kra_pin;
                    return (
                      <tr key={m.id}><td>{mName(m.id)}</td><td className="small">{m.mpesa_phone}</td><td className="small">{pin ?? <span style={{ color: 'var(--warn)' }}>missing</span>}</td>
                        <td style={{ textAlign: 'right' }}>KES {kes(amt)}</td><td style={{ textAlign: 'right' }}>KES {kes(wht)}</td><td style={{ textAlign: 'right' }}><b>KES {kes(amt - wht)}</b></td>
                        <td>{canFinance && <button className="btn btn-primary btn-sm" type="button" disabled={!okMin || !pin} title={!okMin ? `Below KES ${kes(s.min_payout_kes)}` : !pin ? 'Needs KRA PIN' : ''}
                          onClick={() => run(supabase.rpc('auction_campus_payout_create', { p_member: m.id }), 'Payout created — send by M-Pesa, then mark it paid below.')}>Create payout</button>}</td></tr>
                    );
                  })}</tbody>
                </table>
              );
            })()}
          </div>
          <div className="panel stack" style={{ gap: 10 }}>
            <h3>Student payouts</h3>
            {payouts.length === 0 ? <p className="muted small">None yet.</p> : (
              <table className="data">
                <thead><tr><th>Ref</th><th>Student</th><th>Created</th><th style={{ textAlign: 'right' }}>Gross</th><th style={{ textAlign: 'right' }}>WHT</th><th style={{ textAlign: 'right' }}>Net</th><th>Status</th><th /></tr></thead>
                <tbody>{payouts.map((p) => (
                  <tr key={p.id}><td>{p.reference}</td><td className="small">{mName(p.campus_member_id)}</td><td className="small">{d(p.created_at)}</td>
                    <td style={{ textAlign: 'right' }}>KES {kes(p.gross_kes)}</td><td style={{ textAlign: 'right' }}>KES {kes(p.wht_kes)}</td><td style={{ textAlign: 'right' }}><b>KES {kes(p.amount_kes)}</b></td>
                    <td><span className={`pill ${p.status === 'paid' ? 'pill-green' : p.status === 'pending' ? 'pill-warn' : 'pill-grey'}`}>{p.status}{p.payment_ref ? ` · ${p.payment_ref}` : ''}</span></td>
                    <td>{canFinance && p.status === 'pending' && (
                      <div className="row" style={{ gap: 4 }}>
                        <button className="btn btn-primary btn-sm" type="button" onClick={() => { const ref = prompt('M-Pesa transaction code'); if (ref) run(supabase.rpc('auction_payout_mark_paid', { p_payout: p.id, p_ref: ref }), 'Marked paid.'); }}>Mark paid</button>
                        <button className="btn btn-outline btn-sm" type="button" onClick={() => run(supabase.rpc('auction_payout_cancel', { p_payout: p.id }), 'Payout cancelled; earnings back to ready.')}>Cancel</button>
                      </div>
                    )}</td></tr>))}
                </tbody>
              </table>
            )}
            <span className="small muted">Withholding tax is deducted at payout; file it with KRA and issue the certificate. Student payouts also appear under Finance → Seller payouts.</span>
          </div>
          {canFinance && (
            <form className="panel row" style={{ gap: 8, alignItems: 'flex-end' }} onSubmit={async (e) => {
              e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
              const ok = await run(supabase.rpc('auction_campus_award', { p_member: String(f.get('member')), p_kind: String(f.get('kind')), p_amount: Number(String(f.get('amt')).replace(/[^0-9.-]/g, '')), p_note: String(f.get('note') ?? '') }), 'Added to the student’s wallet.');
              if (ok) form.reset();
            }}>
              <h3 style={{ width: '100%' }}>Prize, stipend or adjustment</h3>
              <label className="field" style={{ width: 240 }}>Student<select className="input" name="member" required>{members.filter((m) => m.status === 'active').map((m) => <option key={m.id} value={m.id}>{mName(m.id)}</option>)}</select></label>
              <label className="field" style={{ width: 170 }}>Type<select className="input" name="kind"><option value="prize">Prize</option><option value="stipend">Campus Lead stipend</option><option value="adjustment">Adjustment (+/−)</option></select></label>
              <label className="field" style={{ width: 130 }}>KES<input className="input" name="amt" required defaultValue={s.lead_stipend_kes} /></label>
              <label className="field" style={{ flex: '1 1 200px' }}>Note<input className="input" name="note" placeholder="Top scout — November" /></label>
              <button className="btn btn-primary btn-sm" type="submit">Add</button>
            </form>
          )}
          <div className="panel" style={{ overflowX: 'auto' }}>
            <h3>All earnings</h3>
            <table className="data" style={{ minWidth: 820 }}>
              <thead><tr><th>Date</th><th>Student</th><th>Type</th><th>Details</th><th style={{ textAlign: 'right' }}>KES</th><th>Status</th><th /></tr></thead>
              <tbody>{earnings.slice(0, 400).map((e) => (
                <tr key={e.id}><td className="small">{d(e.created_at)}</td><td className="small">{mName(e.member_id)}</td><td className="small">{EARN_LABEL[e.kind]}</td>
                  <td className="small">{e.note}{e.pct != null && e.base_kes != null ? ` · ${e.pct}% of ${kes(e.base_kes)}` : ''}</td>
                  <td style={{ textAlign: 'right' }}>{kes(e.amount_kes)}</td>
                  <td><span className={`pill ${EARN_STATUS[e.status][1]}`}>{e.payout_id && e.status === 'approved' ? 'In payout' : e.status}</span></td>
                  <td>{canFinance && !e.payout_id && e.status !== 'paid' && (
                    e.status === 'cancelled'
                      ? <button className="btn btn-outline btn-sm" type="button" onClick={() => run(supabase.rpc('auction_campus_earning_set', { p_id: e.id, p_status: 'approved' }), 'Restored.')}>Restore</button>
                      : <div className="row" style={{ gap: 4 }}>
                          {e.status === 'pending' && <button className="btn btn-outline btn-sm" type="button" onClick={() => run(supabase.rpc('auction_campus_earning_set', { p_id: e.id, p_status: 'approved' }), 'Approved.')}>Approve</button>}
                          <button className="btn btn-outline btn-sm" type="button" onClick={() => run(supabase.rpc('auction_campus_earning_set', { p_id: e.id, p_status: 'cancelled' }), 'Cancelled.')}>Cancel</button>
                        </div>
                  )}</td></tr>))}
              </tbody>
            </table>
            <span className="small muted">Sale earnings are pending while the buyer has paid but not collected, then become ready automatically. Cancelled invoices cancel their earnings.</span>
          </div>
        </>
      )}

      {tab === 'challenges' && (
        <>
          <form className="panel stack" style={{ gap: 8 }} onSubmit={async (e) => {
            e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
            const ok = await run(supabase.from('auction_campus_challenges').insert({ title: String(f.get('title')), description: String(f.get('desc') ?? '').trim() || null, prize: String(f.get('prize') ?? '').trim() || null, starts_at: String(f.get('from')) || undefined, ends_at: String(f.get('to')) || null }), 'Challenge published.');
            if (ok) form.reset();
          }}>
            <h3>New challenge</h3>
            <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
              <label className="field" style={{ flex: '2 1 260px' }}>Title<input className="input" name="title" required placeholder="Find a container in your county this week" /></label>
              <label className="field" style={{ width: 200 }}>Prize<input className="input" name="prize" placeholder="KES 2,000" /></label>
              <label className="field" style={{ width: 160 }}>From<input className="input" type="date" name="from" /></label>
              <label className="field" style={{ width: 160 }}>Until<input className="input" type="date" name="to" /></label>
            </div>
            <label className="field">Description<input className="input" name="desc" /></label>
            <button className="btn btn-primary btn-sm" type="submit" style={{ alignSelf: 'flex-start' }}>Publish</button>
          </form>
          <div className="panel">
            {challenges.length === 0 ? <p className="muted">No challenges yet.</p> : (
              <table className="data">
                <thead><tr><th>Challenge</th><th>Prize</th><th>Dates</th><th>Shown</th><th /></tr></thead>
                <tbody>{challenges.map((c) => (
                  <tr key={c.id}><td><b>{c.title}</b><div className="small muted">{c.description}</div></td><td>{c.prize}</td><td className="small">{d(c.starts_at)} – {d(c.ends_at)}</td><td>{c.active ? 'Yes' : 'No'}</td>
                    <td className="row" style={{ gap: 4 }}>
                      <button className="btn btn-outline btn-sm" type="button" onClick={() => run(supabase.from('auction_campus_challenges').update({ active: !c.active }).eq('id', c.id), 'Saved.')}>{c.active ? 'Hide' : 'Show'}</button>
                      <button className="btn btn-outline btn-sm" type="button" onClick={() => run(supabase.from('auction_campus_challenges').delete().eq('id', c.id), 'Deleted.')}>Delete</button>
                    </td></tr>))}
                </tbody>
              </table>
            )}
            <p className="small muted">Pay winners with “Prize” under Earnings &amp; payouts.</p>
          </div>
        </>
      )}

      {tab === 'rates' && <RatesForm settings={s} canFinance={canFinance} run={run} />}
    </>
  );
}

function RatesForm({ settings: s, canFinance, run }: { settings: CampusSettings; canFinance: boolean; run: (p: PromiseLike<{ error: { message: string } | null }>, ok: string) => Promise<boolean> }) {
  const supabase = useMemo(() => createClient(), []);
  const [crew, setCrew] = useState(s.crew_rates);
  const [bonus, setBonus] = useState(s.creator_bonus);
  const n = (v: FormDataEntryValue | null, dflt: number) => { const x = Number(String(v ?? '').replace(/[^0-9.]/g, '')); return Number.isFinite(x) && String(v ?? '').trim() !== '' ? x : dflt; };
  return (
    <form className="panel stack" style={{ gap: 14 }} onSubmit={(e) => {
      e.preventDefault(); const f = new FormData(e.currentTarget);
      run(supabase.from('auction_campus_settings').update({
        programme_name: String(f.get('name')).trim() || 'Mnada Campus',
        campuses: String(f.get('campuses')).split('\n').map((x) => x.trim()).filter(Boolean),
        scout_pct: n(f.get('scout'), s.scout_pct), scout_repeat_pct: n(f.get('scout_rep'), s.scout_repeat_pct), scout_months: n(f.get('scout_m'), s.scout_months),
        referral_pct: n(f.get('ref'), s.referral_pct), referral_months: n(f.get('ref_m'), s.referral_months), first_bid_bonus_kes: n(f.get('fb'), s.first_bid_bonus_kes),
        level_bonus_pct: { recruit: n(f.get('lb_recruit'), 0), scout: n(f.get('lb_scout'), 0), ambassador: n(f.get('lb_ambassador'), 0), lead: n(f.get('lb_lead'), 0) },
        creator_fee_kes: n(f.get('cfee'), s.creator_fee_kes), min_payout_kes: n(f.get('min'), s.min_payout_kes), wht_pct: n(f.get('wht'), s.wht_pct),
        lead_stipend_kes: n(f.get('stipend'), s.lead_stipend_kes), monthly_prizes: String(f.get('prizes')).trim(),
        crew_rates: crew.filter((c) => c.task.trim()), creator_bonus: bonus.filter((b) => b.views > 0 && b.kes > 0).sort((a, b) => a.views - b.views),
        updated_at: new Date().toISOString(),
      }).eq('id', 1), 'Rates saved. They apply to new earnings; earlier ones keep the rate they were made at.');
    }}>
      <fieldset disabled={!canFinance} className="stack" style={{ gap: 14, border: 0, padding: 0, margin: 0 }}>
        <div className="row" style={{ gap: 10, alignItems: 'flex-end' }}>
          <label className="field" style={{ width: 220 }}>Programme name<input className="input" name="name" defaultValue={s.programme_name} /></label>
          <label className="field" style={{ flex: '1 1 260px' }}>Campuses (one per line)<textarea className="input" name="campuses" rows={3} defaultValue={s.campuses.join('\n')} /></label>
        </div>
        <h4>Scouts</h4>
        <div className="row" style={{ gap: 10 }}>
          <label className="field" style={{ width: 180 }}>First sale (% of Mnada’s income)<input className="input" name="scout" defaultValue={s.scout_pct} /></label>
          <label className="field" style={{ width: 160 }}>Repeat sales (%)<input className="input" name="scout_rep" defaultValue={s.scout_repeat_pct} /></label>
          <label className="field" style={{ width: 150 }}>For how many months<input className="input" name="scout_m" defaultValue={s.scout_months} /></label>
        </div>
        <h4>Bidder referrals</h4>
        <div className="row" style={{ gap: 10 }}>
          <label className="field" style={{ width: 180 }}>% of buyer’s premium<input className="input" name="ref" defaultValue={s.referral_pct} /></label>
          <label className="field" style={{ width: 150 }}>For how many months<input className="input" name="ref_m" defaultValue={s.referral_months} /></label>
          <label className="field" style={{ width: 180 }}>First-bid bonus (KES)<input className="input" name="fb" defaultValue={s.first_bid_bonus_kes} /></label>
        </div>
        <h4>Level bonus on first-sale scout share (+%)</h4>
        <div className="row" style={{ gap: 10 }}>
          {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => <label key={l} className="field" style={{ width: 140 }}>{LEVEL_LABEL[l]}<input className="input" name={`lb_${l}`} defaultValue={s.level_bonus_pct[l] ?? 0} /></label>)}
        </div>
        <h4>Crew rates (shown to students and when posting gigs)</h4>
        {crew.map((c, i) => (
          <div key={i} className="row" style={{ gap: 8 }}>
            <input className="input" style={{ width: 260 }} value={c.task} aria-label="Task" onChange={(e) => setCrew((x) => x.map((y, j) => (j === i ? { ...y, task: e.target.value } : y)))} />
            <input className="input" style={{ width: 110 }} value={c.kes || ''} aria-label="KES" inputMode="numeric" onChange={(e) => setCrew((x) => x.map((y, j) => (j === i ? { ...y, kes: Number(e.target.value.replace(/[^0-9]/g, '')) || 0 } : y)))} />
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setCrew((x) => x.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <button type="button" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setCrew((x) => [...x, { task: '', kes: 0 }])}>+ Add rate</button>
        <h4>Creators</h4>
        <label className="field" style={{ width: 200 }}>Fee per approved video (KES)<input className="input" name="cfee" defaultValue={s.creator_fee_kes} /></label>
        {bonus.map((b, i) => (
          <div key={i} className="row" style={{ gap: 8, alignItems: 'center' }}>
            <span className="small">From</span>
            <input className="input" style={{ width: 120 }} value={b.views || ''} aria-label="Views" inputMode="numeric" onChange={(e) => setBonus((x) => x.map((y, j) => (j === i ? { ...y, views: Number(e.target.value.replace(/[^0-9]/g, '')) || 0 } : y)))} />
            <span className="small">views → bonus KES</span>
            <input className="input" style={{ width: 110 }} value={b.kes || ''} aria-label="Bonus KES" inputMode="numeric" onChange={(e) => setBonus((x) => x.map((y, j) => (j === i ? { ...y, kes: Number(e.target.value.replace(/[^0-9]/g, '')) || 0 } : y)))} />
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setBonus((x) => x.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <button type="button" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setBonus((x) => [...x, { views: 0, kes: 0 }])}>+ Add views bonus</button>
        <h4>Payouts &amp; prizes</h4>
        <div className="row" style={{ gap: 10 }}>
          <label className="field" style={{ width: 170 }}>Minimum payout (KES)<input className="input" name="min" defaultValue={s.min_payout_kes} /></label>
          <label className="field" style={{ width: 170 }}>Withholding tax (%)<input className="input" name="wht" defaultValue={s.wht_pct} /></label>
          <label className="field" style={{ width: 200 }}>Campus Lead stipend (KES/month)<input className="input" name="stipend" defaultValue={s.lead_stipend_kes} /></label>
        </div>
        <label className="field">Monthly prizes (shown on the campus page)<input className="input" name="prizes" defaultValue={s.monthly_prizes} /></label>
        <button className="btn btn-primary" type="submit" style={{ alignSelf: 'flex-start' }}>Save rates</button>
      </fieldset>
      {!canFinance && <p className="small muted">Rates are set by Finance or an owner.</p>}
      <p className="small muted">Withholding on commission is listed by KRA at 5% for residents — confirm the right rate with your accountant.</p>
    </form>
  );
}
