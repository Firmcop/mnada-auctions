'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ROLE_LABEL, type StaffRole } from '@/lib/staff';

type Staff = { id: string; full_name: string; email: string | null; phone: string; admin_role: string | null };

export default function StaffAdmin({ staff, me }: { staff: Staff[]; me: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [role, setRole] = useState<StaffRole>('operations');
  async function run(p: PromiseLike<{ error: { message: string } | null }>, ok: string) {
    const { error } = await p;
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: ok });
    if (!error) router.refresh();
    return !error;
  }
  const supabase = createClient();
  return (
    <>
      {msg && <div role="status" className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`}>{msg.text}</div>}
      <section className="panel stack" style={{ gap: 8 }}>
        <h3>What each role can do</h3>
        {(Object.keys(ROLE_LABEL) as StaffRole[]).map((r) => <span key={r} className="small"><b>{ROLE_LABEL[r][0]}:</b> {ROLE_LABEL[r][1]}</span>)}
      </section>
      <section className="panel stack" style={{ gap: 0 }}>
        <h3 style={{ marginBottom: 8 }}>Staff ({staff.length})</h3>
        {staff.map((s) => (
          <div key={s.id} className="row" style={{ gap: '8px 14px', padding: '8px 0', borderBottom: '1px solid #F0F2F4' }}>
            <span className="stack" style={{ gap: 2, flex: '1 1 260px' }}><b>{s.full_name}{s.id === me ? ' (you)' : ''}</b><span className="small muted">{[s.email, s.phone].filter(Boolean).join(' · ')}</span></span>
            <select className="input" style={{ width: 220 }} aria-label={`Role for ${s.full_name}`} value={s.admin_role ?? 'owner'}
              onChange={(e) => run(supabase.from('auction_profiles').update({ admin_role: e.target.value }).eq('id', s.id), 'Role updated.')}>
              {(Object.keys(ROLE_LABEL) as StaffRole[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r][0]}</option>)}
            </select>
            {s.id !== me && <button type="button" className="btn btn-outline btn-sm" onClick={() => { if (window.confirm(`Remove staff access for ${s.full_name}? Their customer account stays.`)) run(supabase.from('auction_profiles').update({ is_admin: false }).eq('id', s.id), 'Access removed.'); }}>Remove access</button>}
          </div>
        ))}
      </section>
      <form className="panel row" style={{ gap: 10, alignItems: 'flex-end' }} onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const email = String(new FormData(form).get('email') ?? '');
        if (await run(supabase.rpc('auction_staff_set', { p_email: email, p_role: role }), 'Staff member added.')) form.reset();
      }}>
        <label className="field" style={{ flex: '1 1 260px' }}>Add staff by their Mnada account email<input className="input" name="email" type="email" required /></label>
        <label className="field" style={{ width: 220 }}>Role<select className="input" value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>{(Object.keys(ROLE_LABEL) as StaffRole[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r][0]}</option>)}</select></label>
        <button className="btn btn-primary" type="submit">Add</button>
        <span className="small muted" style={{ flexBasis: '100%' }}>They need to register on the site first. Removing access keeps their customer account.</span>
      </form>
    </>
  );
}
